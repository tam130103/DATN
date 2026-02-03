import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Post } from './post.entity';
import { Hashtag } from './hashtag.entity';

@Entity('post_hashtags')
@Unique(['postId', 'hashtagId'])
@Index(['postId'])
@Index(['hashtagId'])
export class PostHashtag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  postId: string;

  @Column()
  hashtagId: string;

  // Relations
  @ManyToOne(() => Post, (post) => post.postHashtags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @ManyToOne(() => Hashtag, (hashtag) => hashtag.postHashtags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hashtag_id' })
  hashtag: Hashtag;
}
