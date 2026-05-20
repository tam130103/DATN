import { BadRequestException, PipeTransform } from '@nestjs/common';

export class OptionalBase64CursorPipe implements PipeTransform<string | undefined, string | undefined> {
  transform(value: string | undefined): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    try {
      const decoded = JSON.parse(Buffer.from(value, 'base64').toString());
      if (
        typeof decoded.p === 'number' &&
        typeof decoded.d === 'string' &&
        typeof decoded.i === 'string' &&
        decoded.i.length > 0
      ) {
        return value;
      }
    } catch {}

    throw new BadRequestException('Query parameter "cursor" must be a valid base64-encoded cursor');
  }
}