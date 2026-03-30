import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AIService', () => {
  let service: AIService;

  beforeEach(() => {
    service = new AIService({ get: jest.fn().mockReturnValue('fake-key') } as unknown as ConfigService);
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

  it('returns safe fallback for moderateContent', async () => {
    await expect(service.moderateContent('ambiguous text')).resolves.toEqual({
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
