import { BadRequestException } from '@nestjs/common';
import { AIService } from '../ai/ai.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PostService } from './post.service';
import { PostController } from './post.controller';

describe('PostController AI endpoints', () => {
  let controller: PostController;
  let aiService: jest.Mocked<AIService>;

  beforeEach(() => {
    aiService = {
      generateCaptionResult: jest.fn(),
      suggestHashtagsResult: jest.fn(),
    } as unknown as jest.Mocked<AIService>;

    controller = new PostController(
      {} as PostService,
      {} as CloudinaryService,
      aiService,
    );
  });

  it('returns 400 when generate-caption prompt is missing', async () => {
    await expect(controller.generateCaption({ prompt: '   ' })).rejects.toThrow(BadRequestException);
  });

  it('trims prompt before generating a caption', async () => {
    aiService.generateCaptionResult.mockResolvedValue({
      text: 'Caption tu AI',
      meta: {
        source: 'dify',
        degraded: false,
      },
    });

    await expect(
      controller.generateCaption({ prompt: '  du lich bien  ', tone: '  vui ve  ' }),
    ).resolves.toEqual({
      text: 'Caption tu AI',
      meta: {
        source: 'dify',
        degraded: false,
      },
    });

    expect(aiService.generateCaptionResult).toHaveBeenCalledWith('du lich bien', 'vui ve');
  });

  it('returns 400 when suggest-hashtags text is missing', async () => {
    await expect(controller.suggestHashtags({ text: '\n' })).rejects.toThrow(BadRequestException);
  });

  it('returns hashtags for valid text input', async () => {
    aiService.suggestHashtagsResult.mockResolvedValue({
      hashtags: ['#dulich', '#dalat'],
      meta: {
        source: 'fallback',
        degraded: true,
      },
    });

    await expect(controller.suggestHashtags({ text: '  Chuyen di Da Lat  ' })).resolves.toEqual({
      hashtags: ['#dulich', '#dalat'],
      meta: {
        source: 'fallback',
        degraded: true,
      },
    });

    expect(aiService.suggestHashtagsResult).toHaveBeenCalledWith('Chuyen di Da Lat');
  });
});
