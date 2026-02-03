import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Post } from './post.entity';

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

@Entity('media')
@Index(['postId', 'orderIndex'])
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  postId: string;

  @Column()
  url: string;

  @Column({
    type: 'enum',
    enum: MediaType,
    default: MediaType.IMAGE,
  })
  type: MediaType;

  @Column({ default: 0 })
  orderIndex: number;

  // Relations
  @ManyToOne(() => Post, (post) => post.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
