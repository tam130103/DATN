import { IsEnum, IsString, IsUUID } from 'class-validator';
import { ReportTargetType } from '../entities/report.entity';

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @IsUUID()
  targetId: string;

  @IsString()
  reason: string;
}
