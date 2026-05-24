import { Provider } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryProvider: Provider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    if (process.env.NODE_ENV === 'production' && !process.env.CLOUDINARY_URL) {
      throw new Error('CLOUDINARY_URL is required in production');
    }
    return cloudinary;
  },
};
