import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

type ModerationResult = {
  isSafe: boolean;
  reason?: string;
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

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const captionKey = this.configService.get<string>('DIFY_CAPTION_WORKFLOW_KEY');
    if (!captionKey) {
      this.logger.warn('DIFY_CAPTION_WORKFLOW_KEY is not configured. Caption AI feature will stay disabled.');
    } else {
      this.logger.log(`Dify Caption Workflow initialized (${captionKey.slice(0, 8)}...)`);
    }
  }

  async generateCaption(prompt: string, tone = 'tự nhiên'): Promise<string> {
    const apiKey = this.configService.get<string>('DIFY_CAPTION_WORKFLOW_KEY');
    const apiUrl = this.configService.get<string>('DIFY_API_URL') || 'https://api.dify.ai/v1';

    if (!apiKey) {
      throw new ServiceUnavailableException('Tính năng AI Caption chưa cấu hình Dify API Key.');
    }

    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      throw new ServiceUnavailableException('Không thể tạo caption AI khi nội dung gợi ý đang trống.');
    }

    try {
      // Gọi lên Dify Workflow endpoint
      const response = await axios.post(
        `${apiUrl}/workflows/run`,
        {
          inputs: {
            topic: normalizedPrompt,
            tone: tone || 'tự nhiên',
          },
          response_mode: 'blocking',
          user: 'datn-user-123',
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Theo cấu trúc trả về của Dify Workflow
      const outputs = response.data?.data?.outputs;
      if (!outputs) {
        throw new Error('Dify trả về cấu trúc không hợp lệ (Không tìm thấy data.outputs)');
      }

      // Trích xuất giá trị text đầu tiên từ outputs (trong trường hợp user đặt tên output trong Dify khác 'result')
      let resultText = '';
      for (const key in outputs) {
        if (typeof outputs[key] === 'string' && outputs[key].trim()) {
           resultText = outputs[key].trim();
           break;
        }
      }

      const cleaned = this.cleanPlainTextResponse(resultText || JSON.stringify(outputs));
      if (!cleaned || cleaned === '{}') {
        throw new ServiceUnavailableException('AI chưa tạo được caption phù hợp. Vui lòng thử lại.');
      }

      return cleaned;
    } catch (error: any) {
      const errorMsg = error?.response?.data ? JSON.stringify(error.response.data) : error?.message;
      this.logger.error(`Caption generation failed: ${errorMsg}`);
      throw new ServiceUnavailableException('Lỗi máy chủ AI Dify, vui lòng thử lại sau.');
    }
  }

  async moderateContent(text: string): Promise<ModerationResult> {
    if (!this.configService.get<string>('DIFY_GENERAL_API_KEY')) return { isSafe: true };
    try {
      const raw = await this.generateGenericChat(`Bạn là hệ thống kiểm duyệt nội dung mạng xã hội bằng tiếng Việt. Hãy đánh giá nội dung sau có an toàn để đăng công khai hay không:
"${text}"
Hãy chặn các trường hợp: quấy rối, xúc phạm nặng, thù ghét, bạo lực cực đoan.
Trả về JSON duy nhất theo đúng schema: {"isSafe": true, "reason": ""}, nếu không an toàn thì isSafe=false kèm lý do. Không thêm markdown.`);
      const parsed = this.parseJsonPayload<ModerationResult>(raw);
      if (!parsed || typeof parsed.isSafe !== 'boolean') return { isSafe: true };
      return { isSafe: parsed.isSafe, reason: parsed.reason?.trim() || undefined };
    } catch (e) {
      this.logger.warn(`Moderation fallback triggered: ${e}`);
      return { isSafe: true };
    }
  }

  async detectSentiment(text: string): Promise<SentimentResult> {
    if (!this.configService.get<string>('DIFY_GENERAL_API_KEY')) return { label: 'neutral', score: null, summary: 'AI sentiment unavailable' };
    try {
      const raw = await this.generateGenericChat(`Bạn là hệ thống phân tích cảm xúc bài viết mạng xã hội tiếng Việt. Đánh giá cảm xúc chính của nội dung sau:
"${text}"
Trả về JSON duy nhất: {"label":"positive|neutral|negative|mixed","score":0.8,"summary":"mô tả ngắn"}. score từ 0-1.`);
      const parsed = this.parseJsonPayload<SentimentResult>(raw);
      const validLabels: SentimentLabel[] = ['positive', 'neutral', 'negative', 'mixed'];
      if (!parsed || !validLabels.includes(parsed.label as SentimentLabel)) return { label: 'neutral', score: null, summary: 'AI sentiment unavailable' };
      return { label: parsed.label as SentimentLabel, score: typeof parsed.score === 'number' ? parsed.score : null, summary: parsed.summary?.trim() || undefined };
    } catch (e) {
      return { label: 'neutral', score: null, summary: 'AI sentiment unavailable' };
    }
  }

  async suggestHashtags(text: string): Promise<string[]> {
    if (!this.configService.get<string>('DIFY_GENERAL_API_KEY')) return [];
    try {
      const raw = await this.generateGenericChat(`Dựa trên caption sau, hãy gợi ý 5 đến 8 hashtag ngắn, phù hợp để đăng bài. Nội dung: "${text}".
Trả về JSON duy nhất theo schema: {"hashtags":["#tag1","#tag2"]}. Không thêm chữ thừa.`);
      const parsed = this.parseJsonPayload<{ hashtags?: string[] }>(raw);
      const tags = parsed?.hashtags || [];
      return tags.map(t => typeof t === 'string' ? (t.startsWith('#') ? t : `#${t}`) : '').filter(t => t.length > 1).slice(0, 8);
    } catch (e) {
      return [];
    }
  }

  private async generateGenericChat(query: string): Promise<string> {
    const apiKey = this.configService.get<string>('DIFY_GENERAL_API_KEY');
    const apiUrl = this.configService.get<string>('DIFY_API_URL') || 'https://api.dify.ai/v1';

    const response = await axios.post(
      `${apiUrl}/chat-messages`,
      {
        inputs: {},
        query: query.trim(),
        response_mode: 'blocking',
        user: 'datn-engine',
      },
      {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      }
    );
    return response.data?.answer || '';
  }

  private parseJsonPayload<T>(raw: string): T | null {
    const candidate = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      return null;
    }
  }

  private cleanPlainTextResponse(raw: string): string {
    return raw.replace(/```[\w-]*\n?/g, '').replace(/```/g, '').replace(/^["'\s]+|["'\s]+$/g, '').trim();
  }
}
