import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Follow } from './follow.entity';

export enum UserProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('users')
@Index(['username'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  password: string;

  @Column({
    type: 'enum',
    enum: UserProvider,
    default: UserProvider.LOCAL,
  })
  provider: UserProvider;

  @Column({ default: 0 })
  followersCount: number;

  @Column({ default: 0 })
  followingCount: number;

  @Column({ default: true })
  notificationEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Follow, (follow) => follow.followerId)
  followers: Follow[];

  @OneToMany(() => Follow, (follow) => follow.followingId)
  following: Follow[];

  // Exclude password from JSON responses
  toJSON() {
    const { password, ...rest } = this;
    return rest;
  }
}
