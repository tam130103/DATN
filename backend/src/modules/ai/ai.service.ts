import {
  Injectable,
  Logger,
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
    const apiUrl = this.configService.get<string>('DIFY_API_URL') || 'https://api.dify.ai/v1';

    if (!apiKey) {
      throw new ServiceUnavailableException('AI Assistant chưa được cấu hình.');
    }

    const trimmed = query.trim();
    if (!trimmed) {
      throw new ServiceUnavailableException('Không thể gửi tin nhắn trống cho AI.');
    }

    try {
      const payload: Record<string, unknown> = {
        inputs: {},
        query: trimmed,
        response_mode: 'blocking',
        user: userId,
      };

      if (difyConversationId) {
        payload.conversation_id = difyConversationId;
        this.logger.log(`[AI] Continuing Dify conversation: ${difyConversationId}`);
      } else {
        this.logger.log('[AI] Starting new Dify conversation');
      }

      // Standardize Dify API URL: 
      // 1. Remove trailing slashes
      // 2. Ensure /v1 exists (Dify standard)
      let baseApiUrl = (this.configService.get<string>('DIFY_API_URL') || 'https://api.dify.ai/v1').replace(/\/+$/, '');
      if (!baseApiUrl.endsWith('/v1') && baseApiUrl.includes('dify.ai')) {
        baseApiUrl += '/v1';
      }

      const res = await axios.post(`${baseApiUrl}/chat-messages`, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120_000,
      });

      const data = res.data;
      const conversationIdOut: string | null =
        data?.conversation_id || difyConversationId || null;
      const rawAnswer: string = data?.answer || '';

      this.logger.log(
        `[AI] Got reply. dify_conv_id=${conversationIdOut ?? 'null'}, answer_length=${rawAnswer.length}`,
      );

      const answer = this.cleanPlainTextResponse(rawAnswer);
      if (!answer) {
        throw new Error('Dify trả về phản hồi trống.');
      }

      return {
        answer,
        conversationId: conversationIdOut,
      };
    } catch (error: any) {
      const errorData = error?.response?.data;
      const errorStatus = error?.response?.status;
      this.logger.error(
        `AI Assistant error [${errorStatus || 'unknown'}]: ${errorData ? JSON.stringify(errorData) : error?.message || error}`,
      );
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

  async generateCaption(prompt: string, tone = 'tu nhien'): Promise<string> {
    const apiKey = this.configService.get<string>('DIFY_CAPTION_WORKFLOW_KEY');
    const apiUrl =
      this.configService.get<string>('DIFY_API_URL') || 'https://api.dify.ai/v1';

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
      const response = await axios.post(
        `${apiUrl}/workflows/run`,
        {
          inputs: {
            topic: normalizedPrompt,
            tone: tone || 'tu nhien',
          },
          response_mode: 'blocking',
          user: 'datn-user-123',
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const outputs = response.data?.data?.outputs;
      if (!outputs) {
        throw new Error(
          'Dify tra ve cau truc khong hop le (thieu data.outputs).',
        );
      }

      let resultText = '';
      for (const key in outputs) {
        if (typeof outputs[key] === 'string' && outputs[key].trim()) {
          resultText = outputs[key].trim();
          break;
        }
      }

      const cleaned = this.cleanPlainTextResponse(
        resultText || JSON.stringify(outputs),
      );
      if (!cleaned || cleaned === '{}') {
        throw new ServiceUnavailableException(
          'AI chua tao duoc caption phu hop. Vui long thu lai.',
        );
      }

      return cleaned;
    } catch (error: any) {
      const errorMsg = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error?.message;
      this.logger.error(`Caption generation failed: ${errorMsg}`);
      throw new ServiceUnavailableException(
        'Loi may chu AI Dify, vui long thu lai sau.',
      );
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
    if (!this.configService.get<string>('DIFY_GENERAL_API_KEY')) {
      return [];
    }

    try {
      const raw = await this.generateGenericChat(
        `Dua tren caption sau, hay goi y 5 den 8 hashtag ngan, phu hop de dang bai. Noi dung: "${text}".
Tra ve JSON duy nhat theo schema: {"hashtags":["#tag1","#tag2"]}. Khong them chu thua.`,
      );

      const parsed = this.parseJsonPayload<{ hashtags?: string[] }>(raw);
      const tags = parsed?.hashtags || [];
      return tags
        .map((tag) =>
          typeof tag === 'string'
            ? tag.startsWith('#')
              ? tag
              : `#${tag}`
            : '',
        )
        .filter((tag) => tag.length > 1)
        .slice(0, 8);
    } catch {
      return [];
    }
  }

  private async generateGenericChat(query: string): Promise<string> {
    const apiKey = this.configService.get<string>('DIFY_GENERAL_API_KEY');
    const apiUrl =
      this.configService.get<string>('DIFY_API_URL') || 'https://api.dify.ai/v1';

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
      },
    );

    return response.data?.answer || '';
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
