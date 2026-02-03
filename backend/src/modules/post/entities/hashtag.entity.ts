import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { PostHashtag } from './post-hashtag.entity';

@Entity('hashtags')
export class Hashtag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: 0 })
  count: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @OneToMany(() => PostHashtag, (postHashtag) => postHashtag.hashtag)
  postHashtags: PostHashtag[];
}
