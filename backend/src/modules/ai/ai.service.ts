import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  extractDifyErrorSnapshot,
  isTransientDifyError,
  summarizeDifyError,
} from './dify-error.util';

type ViolationCategory = 'harassment' | 'hate_speech' | 'violence' | 'sexual' | 'self_harm' | 'spam';

type ModerationResult = {
  isSafe: boolean;
  reason?: string;
  category?: ViolationCategory | null;
};

export type AssistantChatResult = {
  answer: string;
  conversationId: string | null;
};

type SentimentLabel = 'positive' | 'neutral' | 'negative' | 'mixed';

export type SentimentResult = {
  label: SentimentLabel;
  score: number | null;
  summary?: string;
};

export type AIResultMeta = {
  source: 'dify' | 'gemini' | 'fallback';
  degraded: boolean;
};

export type CaptionGenerationResult = {
  text: string;
  meta: AIResultMeta;
};

export type HashtagSuggestionResult = {
  hashtags: string[];
  meta: AIResultMeta;
};

@Injectable()
export class AIService implements OnModuleInit {
  private readonly logger = new Logger(AIService.name);
  private static readonly CAPTION_RETRY_DELAYS_MS = [800, 1600];
  private static readonly HASHTAG_RETRY_DELAYS_MS = [600, 1200];
  private static readonly CAPTION_TOPIC_LIMIT = 220;
  private static readonly HASHTAG_INPUT_LIMIT = 520;
  private static readonly CAPTION_WORKFLOW_TIMEOUT_MS = 18_000;
  private static readonly HASHTAG_CHAT_TIMEOUT_MS = 18_000;
  private static readonly HIGH_SEVERITY_CONTENT_PATTERN =
    /\b(dit( me| may| nhau)?|du( me| ma| nhau)?|dmm|vai lon|vcl|con cho|thang cho|cho de|do ngu|may ngu|do khon|khon nan|khon kiet|do dien|thang dien|con dien|suc vat|cam thu|do deu|luu manh|that kinh|ngu dot|chet tiep|chet di|cut di|bien di|deo( me)?( may)?|di me|con di|dam duc|dam dang|khieu dam|bien thai|khoa than|sex|porn|porno|quay roi|giet|kill you|fuck(ing)?|bitch|shit|asshole|motherfucker|rape|terrorist|nazi)\b/i;

  private static readonly ACCENTED_PROFANITY_PATTERN =
    /\b(địt( mẹ| mày| nhau)?|đụ( mẹ| má| nhau)?|đĩ mẹ|con đĩ|đĩ thoã|vô học|mạt hạng|lộ hàng|mặt dày|đồ ngu|mày ngu|đồ chó|thằng chó|con chó|chó đẻ|đồ khốn|khốn nạn|khốn kiếp|đồ điên|thằng điên|con điên|vô học|súc vật|cầm thú|đồ đểu|chết tiệt|cút đi|biến đi|biến thái|khỏa thân|dâm dục|dâm đãng|khiêu dâm|đâm nhau|đéo( mẹ)?( mày)?)\b/i;
  private static readonly NON_HARMFUL_REASON_PATTERN =
    /\b(mat khau|password|api key|secret|token|jwt|bearer|thong tin nhay cam|so dien thoai|phone|lien he)\b/i;
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const captionKey = this.getCaptionApiKey();
    const generalKey = this.configService.get<string>('DIFY_GENERAL_API_KEY');
    const chatbotKey = this.getAssistantApiKey();

    if (captionKey || generalKey) {
      this.logger.log('Dify Caption AI configured');
    } else {
      this.logger.warn('No Caption AI key configured. Caption will use local fallback.');
    }

    if (generalKey) {
      this.logger.log('Dify General AI ready');
    }

    if (!chatbotKey) {
      this.logger.warn('DIFY_CHATBOT_API_KEY not configured. AI Assistant disabled.');
    } else {
      this.logger.log('Dify AI Assistant ready');
    }
  }

  // ─── Phase 2: AI Chatbot Companion ────────────────────────────────

  /**
   * Send a user message to the Dify Chatbot and get a reply.
   * Supports conversation memory via difyConversationId.
   */
  private async withRetry<T>(fn: () => Promise<T>, delays = [1000, 2000, 4000]): Promise<T> {
    for (let i = 0; i < delays.length; i++) {
      try { return await fn(); }
      catch (e) {
        if (i === delays.length - 1) throw e;
        await new Promise(r => setTimeout(r, delays[i]));
      }
    }
    throw new Error('Unreachable');
  }

  async chatWithAssistant(
    query: string,
    difyConversationId?: string | null,
    userId = 'datn-user',
  ): Promise<AssistantChatResult> {
    const apiKey = this.getAssistantApiKey();

    if (!apiKey) {
      throw new ServiceUnavailableException('AI Assistant chưa được cấu hình.');
    }

    const trimmed = query.trim();
    if (!trimmed) {
      throw new ServiceUnavailableException('Không thể gửi tin nhắn trống cho AI.');
    }

    const baseApiUrl = this.normalizeDifyApiUrl(
      this.configService.get<string>('DIFY_API_URL'),
    );

    try {
      const payload: Record<string, unknown> = {
        inputs: {},
        query: trimmed,
        // Agent Chat App REQUIRES streaming mode — blocking is not supported
        response_mode: 'streaming',
        user: userId,
      };

      if (difyConversationId) {
        payload.conversation_id = difyConversationId;
        this.logger.log(`[AI] Continuing Dify conversation: ${difyConversationId}`);
      } else {
        this.logger.log('[AI] Starting new Dify conversation');
      }

      // Use responseType: 'stream' to read SSE chunks
      const res = await axios.post(`${baseApiUrl}/chat-messages`, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        timeout: 120_000,
        responseType: 'stream',
      });

      // Parse SSE stream: collect answer chunks and grab conversation_id from message_end event
      const result = await new Promise<AssistantChatResult>((resolve, reject) => {
        let answerBuffer = '';
        let conversationIdOut: string | null = difyConversationId || null;
        let rawChunk = '';

        res.data.on('data', (chunk: Buffer) => {
          rawChunk += chunk.toString('utf8');
          const lines = rawChunk.split('\n');
          // Keep the last potentially-incomplete line in the buffer
          rawChunk = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const event = JSON.parse(jsonStr) as Record<string, any>;
              // Log every event type for diagnostics
              this.logger.debug(`[AI] SSE event: ${event.event ?? 'unknown'} keys=${Object.keys(event).join(',')}`);
              // Capture conversation_id whenever it appears
              if (event.conversation_id) {
                conversationIdOut = event.conversation_id as string;
              }
              // Collect text delta from 'message' or 'agent_message' events
              // Dify Chatbot apps use 'message'; Dify Agent apps use 'agent_message'
              if (
                (event.event === 'message' || event.event === 'agent_message') &&
                typeof event.answer === 'string'
              ) {
                answerBuffer += event.answer;
              }
              // 'message_end' / 'agent_message_end' signals the stream is complete
              if (event.event === 'message_end' || event.event === 'agent_message_end') {
                if (event.conversation_id) {
                  conversationIdOut = event.conversation_id as string;
                }
              }
              // Handle error events from Dify
              if (event.event === 'error') {
                reject(new Error(`Dify stream error: ${event.message || JSON.stringify(event)}`));
              }
            } catch {
              // Non-JSON line — skip
            }
          }
        });

        res.data.on('end', () => {
          // Flush any remaining data in the buffer (no trailing newline case)
          if (rawChunk.trim()) {
            const leftover = rawChunk.trim();
            if (leftover.startsWith('data: ')) {
              const jsonStr = leftover.slice(6).trim();
              if (jsonStr && jsonStr !== '[DONE]') {
                try {
                  const event = JSON.parse(jsonStr) as Record<string, any>;
                  if (event.conversation_id) conversationIdOut = event.conversation_id as string;
                  if (
                    (event.event === 'message' || event.event === 'agent_message') &&
                    typeof event.answer === 'string'
                  ) {
                    answerBuffer += event.answer;
                  }
                } catch { /* ignore */ }
              }
            }
          }
          const answer = this.cleanPlainTextResponse(answerBuffer);
          if (!answer) {
            this.logger.warn(`[AI] Stream ended with empty buffer. dify_conv_id=${conversationIdOut ?? 'null'}`);
            reject(new Error('Dify trả về phản hồi trống.'));
          } else {
            this.logger.log(
              `[AI] Stream done. dify_conv_id=${conversationIdOut ?? 'null'}, answer_length=${answer.length}`,
            );
            resolve({ answer, conversationId: conversationIdOut });
          }
        });

        res.data.on('error', (err: Error) => {
          reject(err);
        });
      });

      return result;
    } catch (error: any) {
      const errorStatus = error?.response?.status as number | undefined;
      // When responseType:'stream', error.response.data is a raw stream — avoid JSON.stringify
      const errorMsg: string =
        typeof error?.response?.data === 'string'
          ? error.response.data
          : error?.message || String(error);

      // Dify 404 means the stored conversation_id is no longer valid.
      // Throw a specific exception so the caller can clear it and retry.
      if (errorStatus === 404) {
        this.logger.warn(
          `[AI] Dify conversation not found (id=${difyConversationId ?? 'none'}). Will start fresh.`,
        );
        throw new NotFoundException('DIFY_CONVERSATION_NOT_FOUND');
      }

      this.logger.error(`AI Assistant error [${errorStatus ?? 'unknown'}]: ${errorMsg}`);
      throw new ServiceUnavailableException('AI Assistant tạm thời không khả dụng.');
    }
  }

  /** Returns true if an API key for the chatbot is configured */
  isAssistantConfigured(): boolean {
    return !!this.getAssistantApiKey();
  }

  private getAssistantApiKey(): string | undefined {
    return (
      this.configService.get<string>('DIFY_CHATBOT_API_KEY') ||
      this.configService.get<string>('DIFY_GENERAL_API_KEY') ||
      undefined
    );
  }

  async generateCaption(prompt: string, tone = 'tự nhiên'): Promise<string> {
    const apiKey = this.getCaptionApiKey();
    const apiUrl = this.normalizeDifyApiUrl(
      this.configService.get<string>('DIFY_API_URL'),
    );

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Tinh nang AI Caption chua duoc cau hinh Dify API Key.',
      );
    }

    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      throw new ServiceUnavailableException(
        'Khong the tao caption AI khi noi dung goi y dang trong.',
      );
    }

    try {
      return await this.runCaptionWorkflowWithRetry(
        apiUrl,
        apiKey,
        normalizedPrompt,
        tone?.trim() || 'tự nhiên',
      );
    } catch (error: any) {
      const errorSummary = summarizeDifyError(error);
      this.logger.error(`Caption generation failed: ${errorSummary}`);
      throw new ServiceUnavailableException('Loi may chu AI Dify, vui long thu lai sau.');
    }
  }

  async generateCaptionResult(
    prompt: string,
    tone = 'tự nhiên',
  ): Promise<CaptionGenerationResult> {
    const normalizedPrompt = this.normalizeCaptionTopic(prompt);
    const normalizedTone = this.normalizeToneValue(tone);

    if (!normalizedPrompt) {
      throw new ServiceUnavailableException(
        'Khong the tao caption AI khi noi dung goi y dang trong.',
      );
    }

    // Prioritize direct Gemini API if configured
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      try {
        this.logger.log(`[AI] Generating caption directly via Gemini API using topic: "${normalizedPrompt}"`);
        const geminiPrompt = this.buildGeminiCaptionPrompt(normalizedPrompt, normalizedTone);
        const text = await this.generateWithGemini(geminiPrompt, 4096);
        return {
          text,
          meta: { source: 'gemini', degraded: false },
        };
      } catch (error) {
        this.logger.error(
          `Caption via direct Gemini API failed: ${(error as Error).message ?? error}`,
        );
      }
    }

    const captionKey = this.getCaptionApiKey();
    if (!captionKey) {
      return {
        text: this.buildLocalCaptionFallback(normalizedPrompt, normalizedTone),
        meta: { source: 'fallback', degraded: true },
      };
    }

    try {
      return await this.runCaptionChatDetailedWithRetry(
        captionKey,
        normalizedPrompt,
        normalizedTone,
      );
    } catch (error) {
      this.logger.error(
        `Caption via Dify Chat failed: ${(error as Error).message ?? error}`,
      );
      return {
        text: this.buildLocalCaptionFallback(normalizedPrompt, normalizedTone),
        meta: { source: 'fallback', degraded: true },
      };
    }
  }

  /**
   * Build a self-contained caption prompt with topic + tone baked in.
   * This is sent as a single raw string to the Chatbot API,
   * completely avoiding Dify Workflow variable injection bugs.
   */
  private buildCaptionChatPrompt(topic: string, tone: string): string {
    return [
      'Bạn là Content Creator chuyên nghiệp tại Việt Nam.',
      'Hãy viết một status mạng xã hội bằng tiếng Việt dựa trên chủ đề và giọng điệu được yêu cầu.',
      '',
      '## Quy tắc bắt buộc:',
      '1. Caption phải xoay quanh ĐÚNG chủ đề được cung cấp.',
      '2. Độ dài: 100-200 từ.',
      '3. Câu đầu tiên phải liên quan trực tiếp đến chủ đề.',
      '4. Triển khai 2-3 ý liên quan, kết bằng 1 câu hỏi tương tác.',
      '5. Dùng 2-4 emoji tự nhiên.',
      '6. Đính kèm 3-5 hashtag liên quan ở cuối bài đăng.',
      '',
      '## Quy tắc định dạng:',
      '- KHÔNG viết tiêu đề, nhãn "Caption:", "Bài đăng:", "Dưới đây là status".',
      '- KHÔNG dùng markdown (**, ##, ```).',
      '- KHÔNG giải thích hay nhắc đến hệ thống AI.',
      '- Chỉ trả về văn bản thuần túy của bài đăng để người dùng copy trực tiếp.',
      '',
      `Chủ đề cần viết: "${topic}"`,
      `Giọng điệu: ${tone}`,
      '',
      'Viết ngay status, không giải thích dài dòng.',
    ].join('\n');
  }

  async moderateContent(text: string): Promise<ModerationResult> {
    const heuristicResult = this.getHeuristicModerationResult(text);
    if (heuristicResult) {
      return heuristicResult;
    }

    if (!this.configService.get<string>('DIFY_GENERAL_API_KEY')) {
      return { isSafe: true };
    }

    try {
      const raw = await this.generateGenericChat(
        `Phân loại bài viết mạng xã hội tiếng Việt này.
Trả về DUY NHẤT một JSON, viết reason bằng tiếng Việt.

Bài viết: "${text}"

Danh mục vi phạm: harassment, hate_speech, violence, sexual, self_harm, spam.

Ví dụ: {"isSafe": false, "reason": "Nội dung khiêu dâm", "category": "sexual"}`,
      );

      const parsed = this.parseJsonPayload<Record<string, any>>(raw);
      const derived = this.deriveModerationResult(parsed);
      if (!derived) {
        this.logger.warn(`Moderation parse failed. Raw: "${raw.slice(0, 200)}"`);
        return { isSafe: true };
      }

      return this.applyModerationGuardrails(text, derived);
    } catch (error) {
      this.logger.warn(`Moderation fallback triggered: ${error}`);
      return { isSafe: true };
    }
  }

  async detectSentiment(text: string): Promise<SentimentResult> {
    if (!this.configService.get<string>('DIFY_GENERAL_API_KEY')) {
      return {
        label: 'neutral',
        score: null,
        summary: 'AI sentiment unavailable',
      };
    }

    try {
      const raw = await this.generateGenericChat(
        `Bạn là hệ thống phân tích cảm xúc bài viết mạng xã hội tiếng Việt.

## Nội dung cần phân tích
"${text}"

## Rubric chấm điểm
- positive (score 0.7-1.0): Vui vẻ, tích cực, truyền cảm hứng, khen ngợi
- neutral (score 0.4-0.6): Thông tin, mô tả, không có cảm xúc rõ ràng
- negative (score 0.0-0.3): Buồn, thất vọng, phàn nàn, tức giận
- mixed (score 0.4-0.6): Vừa tích cực vừa tiêu cực trong cùng nội dung

## Output Format (JSON only)
{"label": "positive|neutral|negative|mixed", "score": 0.8, "summary": "mô tả ngắn 1 câu"}
Trả về DUY NHẤT JSON, không thêm markdown hay giải thích.`,
      );

      const parsed = this.parseJsonPayload<SentimentResult>(raw);
      const validLabels: SentimentLabel[] = [
        'positive',
        'neutral',
        'negative',
        'mixed',
      ];

      if (
        !parsed ||
        !validLabels.includes(parsed.label as SentimentLabel)
      ) {
        return {
          label: 'neutral',
          score: null,
          summary: 'AI sentiment unavailable',
        };
      }

      return {
        label: parsed.label as SentimentLabel,
        score: typeof parsed.score === 'number' ? parsed.score : null,
        summary: parsed.summary?.trim() || undefined,
      };
    } catch {
      return {
        label: 'neutral',
        score: null,
        summary: 'AI sentiment unavailable',
      };
    }
  }

  async suggestHashtags(text: string): Promise<string[]> {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return [];
    }

    // Prioritize direct Gemini API if configured
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      try {
        const geminiPrompt = `Đọc nội dung sau và gợi ý 5 đến 8 hashtag ngắn, sát chủ đề bằng tiếng Việt.
Nội dung bài đăng: "${normalizedText}"

Trả về định dạng JSON duy nhất theo schema: {"hashtags":["#tag1","#tag2"]}. Không thêm chữ thừa hay giải thích.`;
        const raw = await this.generateWithGemini(geminiPrompt, 4096);
        const tags = this.extractHashtagsFromRawText(raw);
        if (tags.length > 0) {
          return tags;
        }
      } catch (error) {
        this.logger.error(`Hashtag suggestion via direct Gemini API failed: ${(error as Error).message ?? error}`);
      }
    }

    if (!this.configService.get<string>('DIFY_GENERAL_API_KEY')) {
      return this.buildLocalHashtagFallback(normalizedText);
    }

    try {
      return await this.runHashtagSuggestionWithRetry(normalizedText);
    } catch (error) {
      this.logger.warn(`Hashtag suggestion failed: ${summarizeDifyError(error)}`);
      return this.buildLocalHashtagFallback(normalizedText);
    }
  }

  async suggestHashtagsResult(text: string): Promise<HashtagSuggestionResult> {
    const normalizedText = this.normalizeHashtagSourceText(text);

    if (!normalizedText) {
      return {
        hashtags: [],
        meta: {
          source: 'fallback',
          degraded: true,
        },
      };
    }

    // Prioritize direct Gemini API if configured
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      try {
        const geminiPrompt = `Đọc nội dung sau và gợi ý 5 đến 8 hashtag ngắn, sát chủ đề bằng tiếng Việt.
Nội dung bài đăng: "${normalizedText}"

Trả về định dạng JSON duy nhất theo schema: {"hashtags":["#tag1","#tag2"]}. Không thêm chữ thừa hay giải thích.`;
        
        const raw = await this.generateWithGemini(geminiPrompt, 4096);
        const tags = this.extractHashtagsFromRawText(raw);
        if (tags.length > 0) {
          return {
            hashtags: tags,
            meta: {
              source: 'gemini',
              degraded: false,
            },
          };
        }
      } catch (error) {
        this.logger.error(
          `Hashtags via direct Gemini API failed: ${(error as Error).message ?? error}`,
        );
      }
    }

    if (!this.configService.get<string>('DIFY_GENERAL_API_KEY')) {
      return {
        hashtags: this.buildLocalHashtagFallback(normalizedText),
        meta: {
          source: 'fallback',
          degraded: true,
        },
      };
    }

    try {
      return await this.runHashtagSuggestionDetailedWithRetry(normalizedText);
    } catch (error) {
      const snapshot = extractDifyErrorSnapshot(error);
      this.logger.warn(
        `context=hashtags kind=fallback_used upstream_kind=${snapshot.kind} status=${snapshot.status ?? 'unknown'} req_id=${snapshot.reqId ?? 'n/a'} degraded=true source=fallback detail=${snapshot.detail}`,
      );
      return {
        hashtags: this.buildLocalHashtagFallback(normalizedText),
        meta: {
          source: 'fallback',
          degraded: true,
        },
      };
    }
  }

  /**
   * Resolve the API key for caption generation.
   * Prefers the dedicated DIFY_CAPTION_CHATBOT_KEY, falls back to DIFY_GENERAL_API_KEY.
   */
  private getCaptionApiKey(): string | undefined {
    return (
      this.configService.get<string>('DIFY_CAPTION_CHATBOT_KEY') ||
      this.configService.get<string>('DIFY_GENERAL_API_KEY')
    );
  }

  /**
   * Send a caption prompt to the dedicated Caption Chatbot App on Dify.
   * Uses its own API key so conversation history stays isolated from other AI features.
   */
  private async generateCaptionChat(
    apiKey: string,
    query: string,
    timeoutMs = 25_000,
  ): Promise<string> {
    const apiUrl = this.normalizeDifyApiUrl(
      this.configService.get<string>('DIFY_API_URL'),
    );

    const user = `datn-caption-${Date.now()}`;
    const payload = {
      inputs: {},
      query: query.trim(),
      response_mode: 'blocking' as const,
      user,
    };

    try {
      const response = await axios.post(
        `${apiUrl}/chat-messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: timeoutMs,
        },
      );
      return response.data?.answer || '';
    } catch (error) {
      const status = (error as any)?.response?.status as number | undefined;
      if (status !== 400) {
        throw error;
      }

      this.logger.warn(
        'Caption chatbot rejected blocking mode (400). Retrying in streaming mode.',
      );
      return this.generateCaptionChatStreaming(apiUrl, apiKey, query, user, timeoutMs);
    }
  }

  private async generateCaptionChatStreaming(
    apiUrl: string,
    apiKey: string,
    query: string,
    user: string,
    timeoutMs: number,
  ): Promise<string> {
    const res = await axios.post(
      `${apiUrl}/chat-messages`,
      {
        inputs: {},
        query: query.trim(),
        response_mode: 'streaming',
        user,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        timeout: timeoutMs,
        responseType: 'stream',
      },
    );

    return new Promise<string>((resolve, reject) => {
      let answerBuffer = '';
      let rawChunk = '';

      res.data.on('data', (chunk: Buffer) => {
        rawChunk += chunk.toString('utf8');
        const lines = rawChunk.split('\n');
        rawChunk = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr) as Record<string, any>;
            if (
              (event.event === 'message' || event.event === 'agent_message') &&
              typeof event.answer === 'string'
            ) {
              answerBuffer += event.answer;
            }
            if (event.event === 'error') {
              reject(new Error(`Dify stream error: ${event.message || JSON.stringify(event)}`));
              return;
            }
          } catch {
            // Ignore malformed stream chunks.
          }
        }
      });

      res.data.on('end', () => {
        const cleaned = this.cleanPlainTextResponse(answerBuffer);
        resolve(cleaned);
      });

      res.data.on('error', (err: Error) => reject(err));
    });
  }

  private async generateGenericChat(query: string, timeoutMs = 30_000): Promise<string> {
    const apiKey = this.configService.get<string>('DIFY_GENERAL_API_KEY');
    const apiUrl = this.normalizeDifyApiUrl(
      this.configService.get<string>('DIFY_API_URL'),
    );

    const response = await axios.post(
      `${apiUrl}/chat-messages`,
      {
        inputs: {},
        query: query.trim(),
        response_mode: 'streaming',
        user: 'datn-engine',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        timeout: timeoutMs,
        responseType: 'stream',
      },
    );

    return await new Promise<string>((resolve, reject) => {
      let buffer = '';
      let answer = '';

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr) as Record<string, any>;
            if ((event.event === 'message' || event.event === 'agent_message') && typeof event.answer === 'string') {
              answer += event.answer;
            }
          } catch { /* skip malformed JSON */ }
        }
      });

      response.data.on('end', () => {
        resolve(answer.trim());
      });

      response.data.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  private normalizeDifyApiUrl(rawUrl?: string): string {
    let baseApiUrl = (rawUrl || 'https://api.dify.ai/v1').replace(/\/+$/, '');
    if (!baseApiUrl.endsWith('/v1') && !baseApiUrl.includes('/v1/')) {
      baseApiUrl += '/v1';
    }
    return baseApiUrl;
  }

  private async runCaptionWorkflowWithRetry(
    apiUrl: string,
    apiKey: string,
    topic: string,
    tone: string,
  ): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= AIService.CAPTION_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await this.invokeCaptionWorkflow(apiUrl, apiKey, topic, tone);
      } catch (error) {
        lastError = error;
        const attemptNumber = attempt + 1;
        const isTransient = isTransientDifyError(error);

        if (
          isTransient &&
          attempt < AIService.CAPTION_RETRY_DELAYS_MS.length
        ) {
          const delayMs = AIService.CAPTION_RETRY_DELAYS_MS[attempt];
          this.logger.warn(
            `Caption workflow transient failure on attempt ${attemptNumber}. Retrying in ${delayMs}ms. ${summarizeDifyError(error)}`,
          );
          await this.sleep(delayMs);
          continue;
        }

        const reason = isTransient ? 'upstream-unavailable' : 'workflow-error';
        this.logger.warn(
          `Caption workflow fallback activated (${reason}) after ${attemptNumber} attempt(s). ${summarizeDifyError(error)}`,
        );
        return this.buildLocalCaptionFallback(topic, tone);
      }
    }

    this.logger.warn(
      `Caption workflow fallback activated after exhausting retries. ${summarizeDifyError(lastError)}`,
    );
    return this.buildLocalCaptionFallback(topic, tone);
  }

  private async runCaptionChatDetailedWithRetry(
    apiKey: string,
    topic: string,
    tone: string,
  ): Promise<CaptionGenerationResult> {
    let lastError: unknown;
    const query = this.buildCaptionChatPrompt(topic, tone);

    for (let attempt = 0; attempt <= AIService.CAPTION_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const text = await this.generateCaptionChat(apiKey, query);
        if (text && text.trim().length > 0) {
          return {
            text,
            meta: {
              source: 'dify',
              degraded: false,
            },
          };
        }
        throw new Error('Dify caption response was empty.');
      } catch (error) {
        lastError = error;
        const attemptNumber = attempt + 1;
        const isTransient = isTransientDifyError(error);
        const snapshot = extractDifyErrorSnapshot(error);

        if (
          isTransient &&
          attempt < AIService.CAPTION_RETRY_DELAYS_MS.length
        ) {
          const delayMs = AIService.CAPTION_RETRY_DELAYS_MS[attempt];
          this.logger.warn(
            `context=caption kind=${snapshot.kind} status=${snapshot.status ?? 'unknown'} req_id=${snapshot.reqId ?? 'n/a'} degraded=false source=dify attempt=${attemptNumber} action=retry delay_ms=${delayMs} detail=${snapshot.detail}`,
          );
          await this.sleep(delayMs);
          continue;
        }

        const reason = isTransient ? 'upstream-unavailable' : 'chat-error';
        this.logger.warn(
          `context=caption kind=fallback_used upstream_kind=${snapshot.kind} status=${snapshot.status ?? 'unknown'} req_id=${snapshot.reqId ?? 'n/a'} degraded=true source=fallback attempt=${attemptNumber} detail=${snapshot.detail}`,
        );
        return {
          text: this.buildLocalCaptionFallback(topic, tone),
          meta: {
            source: 'fallback',
            degraded: true,
          },
        };
      }
    }

    const snapshot = extractDifyErrorSnapshot(lastError);
    this.logger.warn(
      `context=caption kind=fallback_used upstream_kind=${snapshot.kind} status=${snapshot.status ?? 'unknown'} req_id=${snapshot.reqId ?? 'n/a'} degraded=true source=fallback detail=${snapshot.detail}`,
    );
    return {
      text: this.buildLocalCaptionFallback(topic, tone),
      meta: {
        source: 'fallback',
        degraded: true,
      },
    };
  }

  private async runHashtagSuggestionWithRetry(text: string): Promise<string[]> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= AIService.HASHTAG_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const raw = await this.generateGenericChat(
          `Dua tren caption sau, hay goi y 5 den 8 hashtag ngan, phu hop de dang bai. Noi dung: "${text}".
Tra ve JSON duy nhat theo schema: {"hashtags":["#tag1","#tag2"]}. Khong them chu thua.`,
        );

        const tags = this.extractHashtagsFromRawText(raw);
        if (tags.length > 0) {
          return tags;
        }

        throw new Error('Dify hashtag response did not contain parseable hashtags.');
      } catch (error) {
        lastError = error;
        const attemptNumber = attempt + 1;
        const isTransient = isTransientDifyError(error);

        if (
          isTransient &&
          attempt < AIService.HASHTAG_RETRY_DELAYS_MS.length
        ) {
          const delayMs = AIService.HASHTAG_RETRY_DELAYS_MS[attempt];
          this.logger.warn(
            `Hashtag suggestion transient failure on attempt ${attemptNumber}. Retrying in ${delayMs}ms. ${summarizeDifyError(error)}`,
          );
          await this.sleep(delayMs);
          continue;
        }

        if (!isTransient) {
          this.logger.warn(
            `Hashtag suggestion falling back due to non-standard model output after ${attemptNumber} attempt(s). ${summarizeDifyError(error)}`,
          );
        } else {
          this.logger.warn(
            `Hashtag suggestion fallback activated after ${attemptNumber} attempt(s). ${summarizeDifyError(error)}`,
          );
        }

        return this.buildLocalHashtagFallback(text);
      }
    }

    this.logger.warn(
      `Hashtag suggestion fallback activated after exhausting retries. ${summarizeDifyError(lastError)}`,
    );
    return this.buildLocalHashtagFallback(text);
  }

  private async runHashtagSuggestionDetailedWithRetry(
    text: string,
  ): Promise<HashtagSuggestionResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= AIService.HASHTAG_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const raw = await this.generateGenericChat(
          `Doc noi dung sau va goi y 5 den 8 hashtag ngan, sat chu de.
Noi dung: "${text}"
Tra ve duy nhat mot trong 3 dinh dang hop le:
1. {"hashtags":["#tag1","#tag2"]}
2. ["#tag1","#tag2"]
3. Chuoi text chi chua cac hashtag cach nhau boi dau cach.
Khong them giai thich, khong markdown, khong lap lai noi dung.`,
          AIService.HASHTAG_CHAT_TIMEOUT_MS,
        );

        const tags = this.extractHashtagsFromRawText(raw);
        if (tags.length > 0) {
          return {
            hashtags: tags,
            meta: {
              source: 'dify',
              degraded: false,
            },
          };
        }

        throw new Error('Dify hashtag response did not contain parseable hashtags.');
      } catch (error) {
        lastError = error;
        const attemptNumber = attempt + 1;
        const isTransient = isTransientDifyError(error);
        const snapshot = extractDifyErrorSnapshot(error);

        if (
          isTransient &&
          attempt < AIService.HASHTAG_RETRY_DELAYS_MS.length
        ) {
          const delayMs = AIService.HASHTAG_RETRY_DELAYS_MS[attempt];
          this.logger.warn(
            `context=hashtags kind=${snapshot.kind} status=${snapshot.status ?? 'unknown'} req_id=${snapshot.reqId ?? 'n/a'} degraded=false source=dify attempt=${attemptNumber} action=retry delay_ms=${delayMs} detail=${snapshot.detail}`,
          );
          await this.sleep(delayMs);
          continue;
        }

        this.logger.warn(
          `context=hashtags kind=fallback_used upstream_kind=${snapshot.kind} status=${snapshot.status ?? 'unknown'} req_id=${snapshot.reqId ?? 'n/a'} degraded=true source=fallback attempt=${attemptNumber} detail=${snapshot.detail}`,
        );
        return {
          hashtags: this.buildLocalHashtagFallback(text),
          meta: {
            source: 'fallback',
            degraded: true,
          },
        };
      }
    }

    const snapshot = extractDifyErrorSnapshot(lastError);
    this.logger.warn(
      `context=hashtags kind=fallback_used upstream_kind=${snapshot.kind} status=${snapshot.status ?? 'unknown'} req_id=${snapshot.reqId ?? 'n/a'} degraded=true source=fallback detail=${snapshot.detail}`,
    );
    return {
      hashtags: this.buildLocalHashtagFallback(text),
      meta: {
        source: 'fallback',
        degraded: true,
      },
    };
  }

  private async invokeCaptionWorkflow(
    apiUrl: string,
    apiKey: string,
    topic: string,
    tone: string,
  ): Promise<string> {
    const response = await axios.post(
      `${apiUrl}/workflows/run`,
      {
        inputs: {
          topic,
          tone,
        },
        response_mode: 'blocking',
        user: 'datn-user-123',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: AIService.CAPTION_WORKFLOW_TIMEOUT_MS,
      },
    );

    const data = response.data?.data;
    if (!data) {
      throw new Error('Dify tra ve cau truc khong hop le (thieu data).');
    }

    if (data.status === 'failed') {
      throw new Error(`Dify workflow failed: ${data.error || 'unknown error'}`);
    }

    const cleaned = this.extractCaptionFromWorkflowResponse(data.outputs);
    if (!cleaned) {
      throw new Error('Dify tra ve cau truc khong hop le (thieu caption output).');
    }

    return cleaned;
  }

  private extractCaptionFromWorkflowResponse(outputs: Record<string, unknown> | undefined): string {
    if (!outputs) {
      return '';
    }

    for (const value of Object.values(outputs)) {
      if (typeof value === 'string' && value.trim()) {
        const cleaned = this.cleanPlainTextResponse(value);
        if (cleaned && cleaned !== '{}') {
          return cleaned;
        }
      }
    }

    return '';
  }

  private extractHashtagsFromRawText(raw: string): string[] {
    const parsed = this.parseJsonPayload<unknown>(raw);
    const candidates: string[] = [];

    if (Array.isArray(parsed)) {
      for (const value of parsed) {
        if (typeof value === 'string') {
          candidates.push(value);
        }
      }
    } else if (parsed && typeof parsed === 'object') {
      const parsedRecord = parsed as { hashtags?: unknown; tags?: unknown };
      const parsedHashtags =
        (Array.isArray(parsedRecord.hashtags) ? parsedRecord.hashtags : null) ||
        (Array.isArray(parsedRecord.tags) ? parsedRecord.tags : null);

      if (parsedHashtags) {
        for (const value of parsedHashtags) {
          if (typeof value === 'string') {
            candidates.push(value);
          }
        }
      } else if (typeof parsedRecord.hashtags === 'string') {
        candidates.push(...parsedRecord.hashtags.split(/[,\n]/g));
      }
    }

    const inlineHashtags = this.cleanPlainTextResponse(raw).match(/#[\p{L}\p{N}_]+/gu) || [];
    candidates.push(...inlineHashtags);

    return Array.from(
      new Map(
        candidates
          .map((tag) => this.normalizeHashtag(tag))
          .filter((tag) => tag.length > 1)
          .map((tag) => [tag.toLowerCase(), tag] as const),
      ).values(),
    ).slice(0, 8);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildLocalCaptionFallback(topic: string, tone: string): string {
    const cleanedTopic = this.cleanPlainTextResponse(topic).replace(/\s+/g, ' ').trim();
    const toneKey = tone.trim().toLowerCase();

    const introByTone: Record<string, string> = {
      'hài hước': `Chỉ cần nhắc tới "${cleanedTopic}" là mình đã thấy có gì đó vừa buồn cười vừa đáng để kể rồi 😄`,
      'truyền cảm hứng': `Có những chủ đề như "${cleanedTopic}" nghe qua tưởng đơn giản, nhưng nghĩ kỹ lại lại nhắc mình về rất nhiều động lực để bước tiếp.`,
      'chuyên nghiệp': `Chủ đề "${cleanedTopic}" là một điểm chạm đáng chú ý vì nó phản ánh khá rõ cách chúng ta nhìn nhận trải nghiệm và giá trị thực tế xung quanh mình.`,
      'gen z': `"${cleanedTopic}" đúng kiểu topic chạm mood luôn, càng nghĩ càng thấy có quá trời thứ để nói 😌`,
      'lãng mạn': `"${cleanedTopic}" làm mình nghĩ đến những cảm xúc rất nhẹ nhưng ở lại khá lâu, kiểu càng im lặng lại càng thấy rõ.`,
      'học thuật': `Từ góc nhìn phân tích, "${cleanedTopic}" không chỉ là một chủ đề cảm tính mà còn gợi ra nhiều lớp ý nghĩa đáng để quan sát.`,
      'tự nhiên': `Dạo này mình cứ nghĩ mãi về "${cleanedTopic}", vì nó gợi ra khá nhiều cảm xúc và câu chuyện rất thật.`,
    };

    const bodyByTone: Record<string, string> = {
      'hài hước': `Nhiều khi cuộc sống không cần drama quá lớn, chỉ cần một khoảnh khắc đúng kiểu trúng tim đen là đủ để cả ngày tự nhiên vui hơn. Điều mình thích ở chủ đề này là nó vừa gần gũi, vừa tạo cảm giác ai cũng có thể thấy bản thân mình đâu đó trong câu chuyện.`,
      'truyền cảm hứng': `Mỗi lần chạm vào chủ đề này, mình lại thấy rõ hơn rằng giá trị không nằm ở việc mọi thứ hoàn hảo ngay từ đầu, mà nằm ở cách mình hiểu, đón nhận và biến trải nghiệm đó thành một điều tích cực hơn cho bản thân.`,
      'chuyên nghiệp': `Khi nhìn sâu hơn, đây không chỉ là một nội dung để chia sẻ cho vui mà còn là cơ hội để kết nối góc nhìn cá nhân với cách chúng ta giao tiếp, tạo ảnh hưởng và xây dựng sự đồng cảm trong cộng đồng.`,
      'gen z': `Có những thứ nghe qua tưởng bình thường thôi nhưng lại cực kỳ relatable, càng kể càng cuốn. Chủ đề này hay ở chỗ nó không bị xa vời, mà rất dễ chạm vào trải nghiệm thật, cảm xúc thật và cả những câu chuyện nhỏ nhưng đủ khiến người ta muốn tương tác thêm.`,
      'lãng mạn': `Có lẽ điều đẹp nhất ở chủ đề này là nó khiến người ta chậm lại một chút để lắng nghe bản thân, nhớ về một khoảnh khắc nào đó, rồi nhận ra cảm xúc của mình cũng xứng đáng được gọi tên và giữ gìn.`,
      'học thuật': `Nếu nhìn theo chiều sâu nội dung, chủ đề này mở ra ít nhất hai hướng đáng chú ý: một là khía cạnh trải nghiệm cá nhân, hai là cách nó phản ánh nhận thức, hành vi hoặc sự thay đổi trong bối cảnh xã hội hiện tại.`,
      'tự nhiên': `Có những chuyện nghe thì nhỏ thôi nhưng lại chạm đúng cảm giác của mình ở một thời điểm nào đó. Chủ đề này làm mình thấy vừa gần gũi, vừa có chút gì đó đáng để ngẫm, vì nó không chỉ là một ý tưởng thoáng qua mà còn gắn với trải nghiệm rất thật.`,
    };

    const outroByTone: Record<string, string> = {
      'hài hước': `Thế mới thấy đôi khi niềm vui đến từ những thứ rất không ngờ tới. Mọi người đã từng gặp tình huống nào liên quan đến chuyện này chưa? Kể mình nghe với được không?`,
      'truyền cảm hứng': `Có lẽ chính những điều như vậy mới làm hành trình của mỗi người trở nên đáng nhớ hơn. Còn bạn, bạn nhìn thấy điều tích cực nào từ chủ đề này?`,
      'chuyên nghiệp': `Những cuộc trao đổi như vậy thường tạo ra giá trị nhiều hơn mình tưởng. Theo bạn, đâu là góc nhìn đáng chú ý nhất khi nhắc đến chủ đề này?`,
      'gen z': `Nói chung là topic này đủ để vừa đăng bài vừa mở combat nhẹ phần bình luận luôn. Nếu là bạn thì bạn sẽ kể câu chuyện này theo vibe nào?`,
      'lãng mạn': `Có những cảm xúc không cần quá ồn ào, chỉ cần đúng người hiểu là đủ. Còn bạn, chủ đề này gợi cho bạn nhớ đến điều gì?`,
      'học thuật': `Chủ đề này vẫn còn nhiều lớp nghĩa có thể đào sâu thêm nếu tiếp tục quan sát và đối chiếu. Theo bạn, cách hiểu nào là thuyết phục nhất?`,
      'tự nhiên': `Mình nghĩ những điều như vậy luôn đáng để chia sẻ thêm một lần nữa. Còn bạn thì sao, chủ đề này làm bạn nhớ đến điều gì nhất?`,
    };

    const intro = introByTone[toneKey] || introByTone['tự nhiên'];
    const body = bodyByTone[toneKey] || bodyByTone['tự nhiên'];
    const outro = outroByTone[toneKey] || outroByTone['tự nhiên'];

    return this.cleanPlainTextResponse(`${intro} ${body} ${outro}`);
  }

  private buildLocalHashtagFallback(text: string): string[] {
    const normalized = this.normalizeModerationText(text)
      .replace(/#[a-z0-9_]+/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ');
    const words = normalized
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);

    const stopWords = new Set([
      'anh', 'chi', 'cho', 'chua', 'cung', 'cua', 'dang', 'day', 'de', 'den',
      'di', 'do', 'duoc', 'em', 'gan', 'hay', 'het', 'hom', 'khi', 'khong',
      'la', 'lam', 'lai', 'len', 'luc', 'ma', 'minh', 'mot', 'nay', 'neu',
      'ngay', 'nguoi', 'nhung', 'nha', 'noi', 'sau', 'se', 'that', 'the',
      'theo', 'thay', 'thi', 'thu', 'tren', 'troi', 'tu', 'va', 'van', 'vay',
      've', 'voi', 'vua', 'yeu',
    ]);

    const keywordCandidates = words.filter(
      (word) => word.length >= 3 && !stopWords.has(word),
    );
    const phraseCandidates = words.filter(
      (word) => word.length >= 2 && !stopWords.has(word),
    );

    const tags: string[] = [];
    for (let index = 0; index < phraseCandidates.length - 1; index += 1) {
      const current = phraseCandidates[index];
      const next = phraseCandidates[index + 1];
      if (!current || !next || current === next) continue;

      if (current.length + next.length <= 18) {
        tags.push(this.normalizeHashtag(`${current}${next}`));
      }

      if (tags.length >= 14) {
        break;
      }
    }

    for (let index = 0; index < keywordCandidates.length; index += 1) {
      const current = keywordCandidates[index];
      if (!current) continue;

      tags.push(this.normalizeHashtag(current));

      if (tags.length >= 14) {
        break;
      }
    }

    const deduped = Array.from(
      new Map(
        tags
          .filter((tag) => tag.length > 2)
          .map((tag) => [tag.toLowerCase(), tag] as const),
      ).values(),
    ).slice(0, 8);

    if (deduped.length > 0) {
      return deduped;
    }

    return ['#chiase', '#camxuc', '#cuocsong'];
  }

  private normalizeHashtag(tag: string): string {
    const normalized = this.normalizeModerationText(tag.replace(/^#+/, ''))
      .replace(/[^a-z0-9_]/g, '');

    return normalized ? `#${normalized}` : '';
  }

  private parseJsonPayload<T>(raw: string): T | null {
    const withoutThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const candidates = [
      withoutThink.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1],
      ...(withoutThink.match(/\{[^{}]*\}/g) || []),
    ];

    for (const c of candidates) {
      if (!c) continue;
      try {
        return JSON.parse(c) as T;
      } catch { /* not valid, try next */ }
    }

    try {
      return JSON.parse(withoutThink) as T;
    } catch {
      return null;
    }
  }

  private deriveModerationResult(parsed: Record<string, any> | null): ModerationResult | null {
    if (!parsed) return null;

    if (typeof parsed.isSafe === 'boolean') {
      return {
        isSafe: parsed.isSafe,
        reason: typeof parsed.reason === 'string' ? parsed.reason.trim() : undefined,
        category: parsed.category ?? null,
      };
    }

    if (parsed.status === 'unsafe' || parsed.status === 'violation') {
      const cat = typeof parsed.category === 'string' ? (parsed.category as ViolationCategory) :
                  parsed.categories && typeof parsed.categories === 'object' ?
                    (Object.keys(parsed.categories).find((k) => parsed.categories[k]) as ViolationCategory) : null;
      return { isSafe: false, reason: parsed.reason || cat || 'Violation detected', category: cat ?? null };
    }

    if (parsed.categories && typeof parsed.categories === 'object') {
      const flagged = Object.keys(parsed.categories).find((k) => parsed.categories[k]) as ViolationCategory | undefined;
      if (flagged) return { isSafe: false, reason: `Flagged as ${flagged}`, category: flagged };
    }

    if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
      const cat = parsed.categories[0] as ViolationCategory;
      return { isSafe: false, reason: `Flagged as ${cat}`, category: cat };
    }

    if (parsed.unsafe === true || parsed.flagged === true || parsed.safe === false) {
      return { isSafe: false, reason: parsed.reason || parsed.category || 'Flagged', category: (parsed.category as ViolationCategory) ?? null };
    }

    const lowered = JSON.stringify(parsed).toLowerCase();
    if (/\b(unsafe|violation|flagge|blocked|not.safe)\b/.test(lowered) &&
        !/\b(safe|clean|allow)\b/.test(lowered)) {
      return { isSafe: false, reason: 'AI flagged content', category: null };
    }

    if (parsed.safe === true || parsed.isSafe === true || parsed.status === 'safe') {
      return { isSafe: true };
    }

    return null;
  }

  private getHeuristicModerationResult(text: string): ModerationResult | null {
    const normalizedText = this.normalizeModerationText(text);

    if (!normalizedText) {
      return { isSafe: true };
    }

    if (AIService.ACCENTED_PROFANITY_PATTERN.test(text)) {
      return {
        isSafe: false,
        reason: 'Noi dung chua tu ngu cong kich hoac de doa ro rang.',
      };
    }

    if (AIService.HIGH_SEVERITY_CONTENT_PATTERN.test(normalizedText)) {
      return {
        isSafe: false,
        reason: 'Noi dung chua tu ngu cong kich hoac de doa ro rang.',
      };
    }

    return null;
  }

  private applyModerationGuardrails(
    text: string,
    result: ModerationResult,
  ): ModerationResult {
    if (result.isSafe) {
      return { isSafe: true };
    }

    const normalizedText = this.normalizeModerationText(text);
    const normalizedReason = this.normalizeModerationText(result.reason || '');

    if (AIService.ACCENTED_PROFANITY_PATTERN.test(text) ||
        AIService.HIGH_SEVERITY_CONTENT_PATTERN.test(normalizedText)) {
      return {
        isSafe: false,
        reason: result.reason?.trim() || 'Noi dung khong phu hop.',
      };
    }

    if (AIService.NON_HARMFUL_REASON_PATTERN.test(normalizedReason)) {
      this.logger.warn(
        `Moderation override: allowed benign content flagged by AI (reason="${result.reason || 'unknown'}")`,
      );
      return { isSafe: true };
    }

    return {
      isSafe: false,
      reason: result.reason?.trim() || 'Noi dung khong phu hop.',
    };
  }

  private normalizeModerationText(text: string): string {
    return text
      .replace(/[đĐ]/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }



  private normalizeCaptionTopic(text: string): string {
    return this.truncateText(
      this.collapseWhitespace(this.cleanPlainTextResponse(text)),
      AIService.CAPTION_TOPIC_LIMIT,
    );
  }

  private normalizeToneValue(tone?: string): string {
    const normalizedTone = this.collapseWhitespace(this.cleanPlainTextResponse(tone || ''));
    return normalizedTone || 't\u1EF1 nhi\u00EAn';
  }

  private normalizeHashtagSourceText(text: string): string {
    const sanitized = this.cleanPlainTextResponse(text)
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/www\.\S+/gi, ' ')
      .replace(/#[\p{L}\p{N}_]+/gu, ' ')
      .replace(/@[\p{L}\p{N}._]+/gu, ' ');

    return this.truncateText(
      this.collapseWhitespace(sanitized),
      AIService.HASHTAG_INPUT_LIMIT,
    );
  }

  private collapseWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    return text.slice(0, maxLength).trim();
  }

  private cleanPlainTextResponse(raw: string): string {
    return raw
      .replace(/<think>[\s\S]*?<\/think>/gi, '') // Loai bo block suy luan cua cac model DeepSeek/Reasoning
      .replace(/```[\w-]*\n?/g, '')
      .replace(/```/g, '')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .trim();
  }

  private async generateWithGemini(prompt: string, maxTokens = 4096): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const model = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        timeout: 30_000,
      },
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') {
      throw new Error('Gemini API response did not contain text.');
    }

    return text.trim();
  }

  private buildGeminiCaptionPrompt(topic: string, tone: string): string {
    return [
      'Bạn là Content Creator chuyên nghiệp tại Việt Nam.',
      'Hãy viết một status mạng xã hội bằng tiếng Việt dựa trên chủ đề và giọng điệu được yêu cầu.',
      '',
      '## Quy tắc bắt buộc:',
      '1. Caption phải xoay quanh ĐÚNG chủ đề được cung cấp.',
      '2. Độ dài: 100-200 từ.',
      '3. Câu đầu tiên phải liên quan trực tiếp đến chủ đề.',
      '4. Triển khai 2-3 ý liên quan, kết bằng 1 câu hỏi tương tác.',
      '5. Dùng 2-4 emoji tự nhiên.',
      '6. Đính kèm 3-5 hashtag liên quan ở cuối bài đăng.',
      '',
      '## Quy tắc định dạng:',
      '- KHÔNG viết tiêu đề, nhãn "Caption:", "Bài đăng:", "Dưới đây là status".',
      '- KHÔNG dùng markdown (**, ##, ```).',
      '- KHÔNG giải thích hay nhắc đến hệ thống AI.',
      '- Chỉ trả về văn bản thuần túy của bài đăng để người dùng copy trực tiếp.',
      '',
      `Chủ đề cần viết: "${topic}"`,
      `Giọng điệu: ${tone}`,
      '',
      'Viết ngay status, không giải thích dài dòng.',
    ].join('\n');
  }
}
