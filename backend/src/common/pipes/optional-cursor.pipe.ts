import { BadRequestException, PipeTransform } from '@nestjs/common';

export class OptionalCursorPipe implements PipeTransform<string | undefined, string | undefined> {
  transform(value: string | undefined): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Query parameter "cursor" must be a valid date');
    }

    return value;
  }
}
