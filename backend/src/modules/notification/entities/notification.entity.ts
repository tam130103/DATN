import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'POST_TAG' | 'COMMENT_LIKE';

@Entity('notifications')
@Index(['recipientId', 'isRead'])
@Index(['recipientId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'recipient_id' })
  @Index()
  recipientId: string;

  @Column({ type: 'uuid', name: 'sender_id' })
  senderId: string;

  @Column({
    type: 'enum',
    enum: ['LIKE', 'COMMENT', 'FOLLOW', 'POST_TAG', 'COMMENT_LIKE'],
  })
  type: NotificationType;

  @Column('jsonb', { nullable: true })
  data: Record<string, any>;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;
}
