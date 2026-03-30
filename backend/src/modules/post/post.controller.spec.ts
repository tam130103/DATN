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
      generateCaption: jest.fn(),
      suggestHashtags: jest.fn(),
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
    aiService.generateCaption.mockResolvedValue('Caption từ AI');

    await expect(
      controller.generateCaption({ prompt: '  du lịch biển  ', tone: '  vui vẻ  ' }),
    ).resolves.toEqual({
      text: 'Caption từ AI',
    });

    expect(aiService.generateCaption).toHaveBeenCalledWith('du lịch biển', 'vui vẻ');
  });

  it('returns 400 when suggest-hashtags text is missing', async () => {
    await expect(controller.suggestHashtags({ text: '\n' })).rejects.toThrow(BadRequestException);
  });

  it('returns hashtags for valid text input', async () => {
    aiService.suggestHashtags.mockResolvedValue(['#dulich', '#dalat']);

    await expect(controller.suggestHashtags({ text: '  Chuyến đi Đà Lạt  ' })).resolves.toEqual({
      hashtags: ['#dulich', '#dalat'],
    });

    expect(aiService.suggestHashtags).toHaveBeenCalledWith('Chuyến đi Đà Lạt');
  });
});
