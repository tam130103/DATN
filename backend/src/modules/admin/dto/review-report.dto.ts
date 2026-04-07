import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportStatus } from '../entities/report.entity';

export class ReviewReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AdminContentQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
