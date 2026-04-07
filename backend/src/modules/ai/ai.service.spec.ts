import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import axios from 'axios';

// Mock axios
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

  it('generates a cleaned caption from Dify Workflow output', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          outputs: {
            result: 'Caption thử nghiệm ✨'
          }
        }
      }
    });

    await expect(service.generateCaption('du lịch Đà Lạt', 'vui vẻ')).resolves.toBe('Caption thử nghiệm ✨');
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

  it('ignores unsupported AI reasons for otherwise benign content', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        answer: '{"isSafe":false,"reason":"Noi dung co the la API key hoac so dien thoai"}',
      },
    });

    await expect(
      service.moderateContent(
        'Day la bai viet trung tinh mo ta chuyen di cuoi tuan cung ban be va ke hoach tham quan o Da Lat vao ngay mai.',
      ),
    ).resolves.toEqual({
      isSafe: true,
    });
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
    await expect(service.detectSentiment('Nội dung khó đoán')).resolves.toEqual({
      label: 'neutral',
      score: null,
      summary: 'AI sentiment unavailable',
    });
  });
});
