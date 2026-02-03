import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../user/entities/user.entity';

@Entity('conversation_members')
@Unique(['conversationId', 'userId'])
@Index(['userId'])
export class ConversationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  conversationId: string;

  @Column()
  userId: string;

  @Column({ default: false })
  hasLeft: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Conversation, (conversation) => conversation.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
