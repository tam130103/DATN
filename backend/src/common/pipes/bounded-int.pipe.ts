import { BadRequestException, PipeTransform } from '@nestjs/common';

type BoundedIntPipeOptions = {
  defaultValue: number;
  min?: number;
  max?: number;
};

export class BoundedIntPipe implements PipeTransform<string | number | undefined, number> {
  constructor(private readonly options: BoundedIntPipeOptions) {}

  transform(value: string | number | undefined): number {
    if (value === undefined || value === null || value === '') {
      return this.options.defaultValue;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    const min = this.options.min ?? 1;
    const max = this.options.max ?? 50;

    if (!Number.isInteger(parsed)) {
      throw new BadRequestException('Query parameter must be an integer');
    }

    if (parsed < min || parsed > max) {
      throw new BadRequestException(`Query parameter must be between ${min} and ${max}`);
    }

    return parsed;
  }
}

export const pagePipe = () => new BoundedIntPipe({ defaultValue: 1, min: 1, max: 1000 });
export const limitPipe = (defaultValue = 20) =>
  new BoundedIntPipe({ defaultValue, min: 1, max: 50 });
