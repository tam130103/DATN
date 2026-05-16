import { BadRequestException } from '@nestjs/common';

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const CLOUDINARY_HOST = 'res.cloudinary.com';
const CLOUDINARY_PROJECT_SEGMENT = '/datn-social/';

export const assertAllowedUploadFile = async (
  file: { buffer?: Buffer; mimetype?: string } | undefined,
): Promise<string> => {
  if (!file?.buffer) {
    throw new BadRequestException('No file provided');
  }

  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(file.buffer);
  const detectedMime = detected?.mime;

  if (!detectedMime || !ALLOWED_UPLOAD_MIME_TYPES.has(detectedMime)) {
    throw new BadRequestException('Only supported image or video files are allowed');
  }

  if (file.mimetype && detectedMime && file.mimetype !== detectedMime) {
    throw new BadRequestException(
      `File MIME type mismatch: client sent "${file.mimetype}" but actual type is "${detectedMime}"`,
    );
  }

  return detectedMime;
};

export const isAllowedCloudinaryUrl = (value?: string | null): boolean => {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === CLOUDINARY_HOST &&
      url.pathname.includes(CLOUDINARY_PROJECT_SEGMENT)
    );
  } catch {
    return false;
  }
};

export const assertAllowedCloudinaryUrl = (value?: string | null, label = 'media URL') => {
  if (!isAllowedCloudinaryUrl(value)) {
    throw new BadRequestException(`${label} must be a DATN Social Cloudinary URL`);
  }
};
