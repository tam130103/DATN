import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Media } from './media.entity';
import { PostHashtag } from './post-hashtag.entity';
import { PostMention } from './post-mention.entity';

export enum PostStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

@Entity('posts')
@Index(['userId', 'createdAt'])
@Index(['userId', 'source', 'sourceId'], { unique: true })
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId: string;

  @Column('text')
  caption: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sourceId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  sourceCreatedAt: Date | null;

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.VISIBLE,
  })
  status: PostStatus;

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

  @OneToMany(() => Media, (media) => media.post, { cascade: true })
  media: Media[];

  @OneToMany(() => PostHashtag, (postHashtag) => postHashtag.post, { cascade: true })
  postHashtags: PostHashtag[];

  @OneToMany(() => PostMention, (mention) => mention.post, { cascade: true })
  mentions: PostMention[];
}
