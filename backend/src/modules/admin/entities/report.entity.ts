import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum ReportTargetType {
  POST = 'post',
  COMMENT = 'comment',
}

export enum ReportStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

@Entity('reports')
@Index(['targetType', 'targetId'])
@Index(['status'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'reporter_id' })
  reporterId: string;

  @Column({ type: 'enum', enum: ReportTargetType })
  targetType: ReportTargetType;

  @Column({ type: 'uuid', name: 'target_id' })
  targetId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.OPEN })
  status: ReportStatus;

  @Column({ nullable: true, type: 'uuid', name: 'reviewed_by' })
  reviewedBy: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;
}
