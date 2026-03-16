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

@Entity('posts')
@Index(['userId', 'createdAt'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column('text')
  caption: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Media, (media) => media.post, { cascade: true })
  media: Media[];

  @OneToMany(() => PostHashtag, (postHashtag) => postHashtag.post, { cascade: true })
  postHashtags: PostHashtag[];

  @OneToMany(() => PostMention, (mention) => mention.post, { cascade: true })
  mentions: PostMention[];
}
