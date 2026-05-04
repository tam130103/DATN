import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Post } from '../../post/entities/post.entity';

export enum CommentStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'uuid', name: 'post_id' })
  postId: string;

  @Column({ type: 'uuid', name: 'parent_id', nullable: true })
  parentId: string;

  @Column({ type: 'uuid', name: 'reply_to_user_id', nullable: true })
  replyToUserId: string | null;

  @Column({
    type: 'enum',
    enum: CommentStatus,
    default: CommentStatus.VISIBLE,
  })
  status: CommentStatus;

  @Column({ nullable: true, type: 'text' })
  moderationReason: string | null;

  @Column({ nullable: true, type: 'uuid', name: 'moderated_by' })
  moderatedBy: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  moderatedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Post)
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @ManyToOne(() => Comment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Comment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reply_to_user_id' })
  replyToUser: User;
}
