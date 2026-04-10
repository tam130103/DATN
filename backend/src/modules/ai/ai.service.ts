import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

type ModerationResult = {
  isSafe: boolean;
  reason?: string;
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

@Injectable()
export class AIService implements OnModuleInit {
  private readonly logger = new Logger(AIService.name);
  private static readonly CAPTION_RETRY_DELAYS_MS = [800, 1600];
  private static readonly HASHTAG_RETRY_DELAYS_MS = [600, 1200];
  private static readonly TRANSIENT_DIFY_STATUS_CODES = new Set([
    408, 429, 500, 502, 503, 504,
  ]);
  private static readonly HIGH_SEVERITY_CONTENT_PATTERN =
    /\b(dit me|dit may|dmm|vai lon|vcl|con cho|thang cho|mat day|do ngu|may ngu|chet di|giet|kill you|rape|terrorist|nazi)\b/i;
  private static readonly NON_HARMFUL_REASON_PATTERN =
    /\b(mat khau|password|api key|secret|token|jwt|bearer|thong tin nhay cam|so dien thoai|phone|lien he)\b/i;
  private static readonly STRUCTURED_BENIGN_TEXT_PATTERN = /^[a-z0-9\s@#.,!?;:()'"\/_-]+$/i;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const captionKey = this.configService.get<string>('DIFY_CAPTION_WORKFLOW_KEY');
    const chatbotKey = this.getAssistantApiKey();

    if (!captionKey) {
      this.logger.warn('DIFY_CAPTION_WORKFLOW_KEY is not configured.');
    } else {
      this.logger.log(`Dify Caption Workflow ready (${captionKey.slice(0, 8)}...)`);
    }

    if (!chatbotKey) {
      this.logger.warn('DIFY_CHATBOT_API_KEY / DIFY_GENERAL_API_KEY not configured. AI Assistant disabled.');
    } else {
      this.logger.log(`Dify AI Assistant ready (${chatbotKey.slice(0, 8)}...)`);
    }
  }

  // ─── Phase 2: AI Chatbot Companion ────────────────────────────────

  /**
   * Send a user message to the Dify Chatbot and get a reply.
   * Supports conversation memory via difyConversationId.
   */
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
    const apiKey = this.configService.get<string>('DIFY_CAPTION_WORKFLOW_KEY');
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
      const errorSummary = this.summarizeDifyError(error);
      this.logger.error(`Caption generation failed: ${errorSummary}`);
      throw new ServiceUnavailableException('Loi may chu AI Dify, vui long thu lai sau.');
    }
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
        `Ban la he thong kiem duyet noi dung mang xa hoi bang tieng Viet. Hay danh gia noi dung sau co an toan de dang cong khai hay khong:
"${text}"
Chi chan cac truong hop doc hai ro rang: quay roi truc tiep, xuc pham nang, thu ghet, de doa, bao luc cuc doan.
Khong danh dau khong an toan chi vi bai viet co so, ma don, timestamp, gia tien, ky tu viet tat, thong tin lien he thong thuong, ma san pham hoac chuoi ky tu ngau nhien.
Neu noi dung trung tinh, sinh hoat doi thuong, mo ta trang thai ca nhan hoac khong co dau hieu doc hai ro rang, mac dinh isSafe=true.
Tra ve JSON duy nhat theo schema: {"isSafe": true, "reason": ""}. Neu khong an toan thi dat isSafe=false kem ly do. Khong them markdown.`,
      );

      const parsed = this.parseJsonPayload<ModerationResult>(raw);
      if (!parsed || typeof parsed.isSafe !== 'boolean') {
        return { isSafe: true };
      }

      return this.applyModerationGuardrails(text, {
        isSafe: parsed.isSafe,
        reason: parsed.reason?.trim() || undefined,
      });
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
        `Ban la he thong phan tich cam xuc bai viet mang xa hoi tieng Viet. Danh gia cam xuc chinh cua noi dung sau:
"${text}"
Tra ve JSON duy nhat: {"label":"positive|neutral|negative|mixed","score":0.8,"summary":"mo ta ngan"}. score tu 0 den 1.`,
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

    if (!this.configService.get<string>('DIFY_GENERAL_API_KEY')) {
      return this.buildLocalHashtagFallback(normalizedText);
    }

    try {
      return await this.runHashtagSuggestionWithRetry(normalizedText);
    } catch (error) {
      this.logger.warn(`Hashtag suggestion failed: ${this.summarizeDifyError(error)}`);
      return this.buildLocalHashtagFallback(normalizedText);
    }
  }

  private async generateGenericChat(query: string): Promise<string> {
    const apiKey = this.configService.get<string>('DIFY_GENERAL_API_KEY');
    const apiUrl = this.normalizeDifyApiUrl(
      this.configService.get<string>('DIFY_API_URL'),
    );

    const response = await axios.post(
      `${apiUrl}/chat-messages`,
      {
        inputs: {},
        query: query.trim(),
        response_mode: 'blocking',
        user: 'datn-engine',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      },
    );

    return response.data?.answer || '';
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
        const isTransient = this.isTransientDifyError(error);

        if (
          isTransient &&
          attempt < AIService.CAPTION_RETRY_DELAYS_MS.length
        ) {
          const delayMs = AIService.CAPTION_RETRY_DELAYS_MS[attempt];
          this.logger.warn(
            `Caption workflow transient failure on attempt ${attemptNumber}. Retrying in ${delayMs}ms. ${this.summarizeDifyError(error)}`,
          );
          await this.sleep(delayMs);
          continue;
        }

        const reason = isTransient ? 'upstream-unavailable' : 'workflow-error';
        this.logger.warn(
          `Caption workflow fallback activated (${reason}) after ${attemptNumber} attempt(s). ${this.summarizeDifyError(error)}`,
        );
        return this.buildLocalCaptionFallback(topic, tone);
      }
    }

    this.logger.warn(
      `Caption workflow fallback activated after exhausting retries. ${this.summarizeDifyError(lastError)}`,
    );
    return this.buildLocalCaptionFallback(topic, tone);
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
        const isTransient = this.isTransientDifyError(error);

        if (
          isTransient &&
          attempt < AIService.HASHTAG_RETRY_DELAYS_MS.length
        ) {
          const delayMs = AIService.HASHTAG_RETRY_DELAYS_MS[attempt];
          this.logger.warn(
            `Hashtag suggestion transient failure on attempt ${attemptNumber}. Retrying in ${delayMs}ms. ${this.summarizeDifyError(error)}`,
          );
          await this.sleep(delayMs);
          continue;
        }

        if (!isTransient) {
          this.logger.warn(
            `Hashtag suggestion falling back due to non-standard model output after ${attemptNumber} attempt(s). ${this.summarizeDifyError(error)}`,
          );
        } else {
          this.logger.warn(
            `Hashtag suggestion fallback activated after ${attemptNumber} attempt(s). ${this.summarizeDifyError(error)}`,
          );
        }

        return this.buildLocalHashtagFallback(text);
      }
    }

    this.logger.warn(
      `Hashtag suggestion fallback activated after exhausting retries. ${this.summarizeDifyError(lastError)}`,
    );
    return this.buildLocalHashtagFallback(text);
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
        timeout: 35_000,
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
    const parsed = this.parseJsonPayload<{ hashtags?: unknown; tags?: unknown }>(raw);
    const candidates: string[] = [];

    const parsedHashtags =
      (Array.isArray(parsed?.hashtags) ? parsed?.hashtags : null) ||
      (Array.isArray(parsed?.tags) ? parsed?.tags : null);

    if (parsedHashtags) {
      for (const value of parsedHashtags) {
        if (typeof value === 'string') {
          candidates.push(value);
        }
      }
    } else if (typeof parsed?.hashtags === 'string') {
      candidates.push(...parsed.hashtags.split(/[,\n]/g));
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

  private isTransientDifyError(error: unknown): boolean {
    const axiosError = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    const status = axiosError?.response?.status;
    const dataText =
      typeof axiosError?.response?.data === 'string'
        ? axiosError.response.data
        : axiosError?.response?.data
          ? JSON.stringify(axiosError.response.data)
          : '';
    const haystack = `${axiosError?.message || ''} ${dataText}`.toLowerCase();

    if (
      typeof status === 'number' &&
      AIService.TRANSIENT_DIFY_STATUS_CODES.has(status)
    ) {
      return true;
    }

    return (
      haystack.includes('503 unavailable') ||
      haystack.includes('504') ||
      haystack.includes('gateway time-out') ||
      haystack.includes('gateway timeout') ||
      haystack.includes('temporar') ||
      haystack.includes('timed out') ||
      haystack.includes('timeout') ||
      haystack.includes('socket hang up') ||
      haystack.includes('econnreset') ||
      haystack.includes('etimedout')
    );
  }

  private summarizeDifyError(error: unknown): string {
    const axiosError = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    const status = axiosError?.response?.status;
    const payload = axiosError?.response?.data;
    const detail = this.summarizeErrorPayload(
      typeof payload === 'undefined' ? axiosError?.message : payload,
    );
    return `status=${status ?? 'unknown'} detail=${detail}`;
  }

  private summarizeErrorPayload(payload: unknown): string {
    if (typeof payload === 'string') {
      const compact = payload.replace(/\s+/g, ' ').trim();
      if (!compact) {
        return 'empty';
      }
      if (compact.includes('<title>dify.ai | 504: Gateway time-out</title>')) {
        return 'Cloudflare 504 Gateway time-out from api.dify.ai';
      }
      if (compact.includes('503 UNAVAILABLE')) {
        return compact.slice(0, 240);
      }
      return compact.slice(0, 240);
    }

    if (payload && typeof payload === 'object') {
      return JSON.stringify(payload).slice(0, 240);
    }

    return String(payload ?? 'unknown');
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
    const candidate =
      withoutThink.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ||
      withoutThink.match(/\{[\s\S]*\}/)?.[0] ||
      withoutThink;

    try {
      return JSON.parse(candidate) as T;
    } catch {
      return null;
    }
  }

  private getHeuristicModerationResult(text: string): ModerationResult | null {
    const normalizedText = this.normalizeModerationText(text);

    if (!normalizedText) {
      return { isSafe: true };
    }

    if (AIService.HIGH_SEVERITY_CONTENT_PATTERN.test(normalizedText)) {
      return {
        isSafe: false,
        reason: 'Noi dung chua tu ngu cong kich hoac de doa ro rang.',
      };
    }

    if (
      normalizedText.length <= 120 &&
      AIService.STRUCTURED_BENIGN_TEXT_PATTERN.test(normalizedText)
    ) {
      return { isSafe: true };
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

    if (AIService.HIGH_SEVERITY_CONTENT_PATTERN.test(normalizedText)) {
      return {
        isSafe: false,
        reason: result.reason?.trim() || 'Noi dung khong phu hop.',
      };
    }

    if (
      AIService.NON_HARMFUL_REASON_PATTERN.test(normalizedReason) ||
      (normalizedText.length <= 120 &&
        AIService.STRUCTURED_BENIGN_TEXT_PATTERN.test(normalizedText))
    ) {
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



  private cleanPlainTextResponse(raw: string): string {
    return raw
      .replace(/<think>[\s\S]*?<\/think>/gi, '') // Loai bo block suy luan cua cac model DeepSeek/Reasoning
      .replace(/```[\w-]*\n?/g, '')
      .replace(/```/g, '')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .trim();
  }
}
