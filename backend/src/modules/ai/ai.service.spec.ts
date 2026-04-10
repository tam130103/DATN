import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AIService', () => {
  let service: AIService;
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'DIFY_API_URL') {
          return 'https://api.dify.ai/v1';
        }
        return 'fake-key';
      }),
    } as unknown as ConfigService;
    service = new AIService(configService);
  });

  it('returns caption text and meta from workflow output', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          outputs: {
            result: 'Caption thu nghiem',
          },
        },
      },
    } as any);

    await expect(
      service.generateCaptionResult('du lich Da Lat', 'vui ve'),
    ).resolves.toEqual({
      text: 'Caption thu nghiem',
      meta: {
        source: 'dify',
        degraded: false,
      },
    });
  });

  it('retries transient caption failures before succeeding', async () => {
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    mockedAxios.post
      .mockRejectedValueOnce(new Error('503 UNAVAILABLE'))
      .mockResolvedValueOnce({
        data: {
          data: {
            outputs: {
              caption: 'Caption sau retry',
            },
          },
        },
      } as any);

    await expect(
      service.generateCaptionResult('di hoc muon', 'tu nhien'),
    ).resolves.toEqual({
      text: 'Caption sau retry',
      meta: {
        source: 'dify',
        degraded: false,
      },
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('falls back to local caption when dify times out repeatedly', async () => {
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    mockedAxios.post.mockRejectedValue(new Error('504 Gateway time-out'));

    const result = await service.generateCaptionResult('buon cuoi qua di mat', 'Gen Z');

    expect(result.meta).toEqual({
      source: 'fallback',
      degraded: true,
    });
    expect(result.text.toLowerCase()).toContain('buon cuoi qua di mat');
  });

  it('extracts hashtags from a json object response', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        answer: '{"hashtags":["#dalat","#dulich","#cuoituan"]}',
      },
    } as any);

    await expect(
      service.suggestHashtagsResult('Chuyen di Da Lat cuoi tuan'),
    ).resolves.toEqual({
      hashtags: ['#dalat', '#dulich', '#cuoituan'],
      meta: {
        source: 'dify',
        degraded: false,
      },
    });
  });

  it('extracts hashtags from a json array response', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        answer: '["#dalat","#cuoituan","#checkin"]',
      },
    } as any);

    await expect(
      service.suggestHashtagsResult('Da Lat cuoi tuan cung hoi ban'),
    ).resolves.toEqual({
      hashtags: ['#dalat', '#cuoituan', '#checkin'],
      meta: {
        source: 'dify',
        degraded: false,
      },
    });
  });

  it('extracts hashtags from free-form text response', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        answer: 'Goi y nhanh: #dalat #dulich #cuoituan',
      },
    } as any);

    await expect(
      service.suggestHashtagsResult('Cuoi tuan muon di Da Lat doi gio'),
    ).resolves.toEqual({
      hashtags: ['#dalat', '#dulich', '#cuoituan'],
      meta: {
        source: 'dify',
        degraded: false,
      },
    });
  });

  it('falls back to local hashtags when provider rejects large input', async () => {
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    mockedAxios.post.mockRejectedValue({
      response: {
        status: 400,
        data: {
          code: 'invalid_param',
          message: 'Run failed: req_id: abcd1234 PluginInvokeError: API request failed with status code 413: Request too large for model',
        },
      },
    });

    const result = await service.suggestHashtagsResult(
      'Chuyen di Da Lat cuoi tuan cung hoi ban than va rat nhieu ky niem dang nho',
    );

    expect(result.meta).toEqual({
      source: 'fallback',
      degraded: true,
    });
    expect(result.hashtags.length).toBeGreaterThan(0);
  });

  it('skips AI moderation for short benign captions', async () => {
    await expect(service.moderateContent('Hom nay troi dep 12345')).resolves.toEqual({
      isSafe: true,
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('blocks obviously abusive captions before calling AI', async () => {
    await expect(service.moderateContent('dit may')).resolves.toEqual({
      isSafe: false,
      reason: 'Noi dung chua tu ngu cong kich hoac de doa ro rang.',
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('returns safe fallback when moderation service fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('boom'));

    await expect(
      service.moderateContent(
        'Noi dung nay dai hon nguong bo loc nhanh nen can di qua lop AI de danh gia nhung khong nen bi chan khi dich vu gap loi bat ngo.',
      ),
    ).resolves.toEqual({
      isSafe: true,
    });
  });

  it('returns neutral fallback for sentiment', async () => {
    await expect(service.detectSentiment('Noi dung kho doan')).resolves.toEqual({
      label: 'neutral',
      score: null,
      summary: 'AI sentiment unavailable',
    });
  });
});
