import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  uploadFile(file: Express.Multer.File, folder = 'datn-social'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      if (!file || !file.buffer) {
        return reject(new BadRequestException('No file provided'));
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Upload a remote image/video URL to Cloudinary for permanent hosting.
   * Returns the permanent Cloudinary URL, or the original URL on failure.
   * If publicId is provided, Cloudinary will deduplicate (same ID = same asset).
   */
  async uploadFromUrl(
    remoteUrl: string,
    folder = 'datn-social/facebook',
    resourceType: 'image' | 'video' | 'auto' = 'auto',
    publicId?: string,
  ): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(remoteUrl, {
        folder,
        resource_type: resourceType,
        timeout: 30000,
        ...(publicId ? { public_id: publicId, overwrite: false, unique_filename: false } : {}),
      });
      return result.secure_url;
    } catch (error) {
      this.logger.warn(
        `Cloudinary upload from URL failed (${remoteUrl.substring(0, 80)}...): ${
          (error as any)?.message || error
        }`,
      );
      // Fallback: return original URL so the post is still created
      return remoteUrl;
    }
  }
}
