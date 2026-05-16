import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1600000000000 implements MigrationInterface {
  name = 'CreateInitialSchema1600000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_provider_enum') THEN
          CREATE TYPE "users_provider_enum" AS ENUM ('local', 'google');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          CREATE TYPE "users_role_enum" AS ENUM ('user', 'admin', 'system');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
          CREATE TYPE "users_status_enum" AS ENUM ('active', 'blocked');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'posts_status_enum') THEN
          CREATE TYPE "posts_status_enum" AS ENUM ('visible', 'hidden', 'deleted');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type_enum') THEN
          CREATE TYPE "media_type_enum" AS ENUM ('IMAGE', 'VIDEO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comments_status_enum') THEN
          CREATE TYPE "comments_status_enum" AS ENUM ('visible', 'hidden', 'deleted');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') THEN
          CREATE TYPE "notifications_type_enum" AS ENUM ('LIKE', 'COMMENT', 'FOLLOW', 'POST_TAG', 'COMMENT_LIKE');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reports_targettype_enum') THEN
          CREATE TYPE "reports_targettype_enum" AS ENUM ('post', 'comment');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reports_status_enum') THEN
          CREATE TYPE "reports_status_enum" AS ENUM ('open', 'resolved', 'rejected');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "username" character varying,
        "name" character varying,
        "bio" character varying,
        "avatarUrl" character varying,
        "googleId" character varying,
        "password" character varying,
        "provider" "users_provider_enum" NOT NULL DEFAULT 'local',
        "followersCount" integer NOT NULL DEFAULT 0,
        "followingCount" integer NOT NULL DEFAULT 0,
        "notificationEnabled" boolean NOT NULL DEFAULT true,
        "role" "users_role_enum" NOT NULL DEFAULT 'user',
        "status" "users_status_enum" NOT NULL DEFAULT 'active',
        "blockedReason" text,
        "blockedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_username" ON "users" ("username")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "follows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "followerId" uuid NOT NULL,
        "followingId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_follows" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_follows_follower_following" UNIQUE ("followerId", "followingId"),
        CONSTRAINT "FK_follows_follower" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_follows_following" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_follows_followerId" ON "follows" ("followerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_follows_followingId" ON "follows" ("followingId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "caption" text NOT NULL,
        "source" character varying(50),
        "sourceId" character varying(100),
        "sourceCreatedAt" TIMESTAMP WITH TIME ZONE,
        "status" "posts_status_enum" NOT NULL DEFAULT 'visible',
        "moderationReason" text,
        "moderated_by" uuid,
        "moderatedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "isPinned" boolean NOT NULL DEFAULT false,
        "isEdited" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_posts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_posts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_posts_user_id" ON "posts" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_posts_user_createdAt" ON "posts" ("user_id", "createdAt")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_posts_user_source_sourceId" ON "posts" ("user_id", "source", "sourceId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "media" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "post_id" uuid NOT NULL,
        "url" character varying NOT NULL,
        "type" "media_type_enum" NOT NULL DEFAULT 'IMAGE',
        "orderIndex" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_media" PRIMARY KEY ("id"),
        CONSTRAINT "FK_media_post" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_media_post_id" ON "media" ("post_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_media_post_order" ON "media" ("post_id", "orderIndex")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hashtags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "count" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hashtags" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hashtags_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_hashtags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "post_id" uuid NOT NULL,
        "hashtag_id" uuid NOT NULL,
        CONSTRAINT "PK_post_hashtags" PRIMARY KEY ("id"),
        CONSTRAINT "FK_post_hashtags_post" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_post_hashtags_hashtag" FOREIGN KEY ("hashtag_id") REFERENCES "hashtags"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_post_hashtags_post_id" ON "post_hashtags" ("post_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_post_hashtags_hashtag_id" ON "post_hashtags" ("hashtag_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_mentions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "post_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_mentions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_post_mentions_post" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_post_mentions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_post_mentions_post_id" ON "post_mentions" ("post_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_post_mentions_user_id" ON "post_mentions" ("user_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "likes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "post_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_likes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_likes_user_post" UNIQUE ("user_id", "post_id"),
        CONSTRAINT "FK_likes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_likes_post" FOREIGN KEY ("post_id") REFERENCES "posts"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_likes_user_id" ON "likes" ("user_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "user_id" uuid NOT NULL,
        "post_id" uuid NOT NULL,
        "parent_id" uuid,
        "reply_to_user_id" uuid,
        "status" "comments_status_enum" NOT NULL DEFAULT 'visible',
        "moderationReason" text,
        "moderated_by" uuid,
        "moderatedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_comments_post" FOREIGN KEY ("post_id") REFERENCES "posts"("id"),
        CONSTRAINT "FK_comments_parent" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comments_reply_to_user" FOREIGN KEY ("reply_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comments_user_id" ON "comments" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comments_post_id" ON "comments" ("post_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "post_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_posts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_saved_posts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_saved_posts_post" FOREIGN KEY ("post_id") REFERENCES "posts"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_saved_posts_user_id" ON "saved_posts" ("user_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_saved_posts_user_post" ON "saved_posts" ("user_id", "post_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comment_likes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "comment_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comment_likes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_comment_likes_user_comment" UNIQUE ("user_id", "comment_id"),
        CONSTRAINT "FK_comment_likes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comment_likes_comment" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comment_likes_user_id" ON "comment_likes" ("user_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isGroup" boolean NOT NULL DEFAULT false,
        "name" character varying,
        "difyConversationId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversation_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "hasLeft" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversation_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_conversation_members_conversation_user" UNIQUE ("conversationId", "userId"),
        CONSTRAINT "FK_conversation_members_conversation" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_conversation_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_conversation_members_userId" ON "conversation_members" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_conversation_members_conversationId" ON "conversation_members" ("conversationId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "senderId" uuid NOT NULL,
        "content" text NOT NULL,
        "mediaUrl" character varying,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_messages_senderId" ON "messages" ("senderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_messages_conversation_createdAt" ON "messages" ("conversationId", "createdAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "recipient_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "type" "notifications_type_enum" NOT NULL,
        "data" jsonb,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_notifications_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_recipient_id" ON "notifications" ("recipient_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_recipient_isRead" ON "notifications" ("recipient_id", "isRead")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_recipient_createdAt" ON "notifications" ("recipient_id", "createdAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reporter_id" uuid NOT NULL,
        "targetType" "reports_targettype_enum" NOT NULL,
        "target_id" uuid NOT NULL,
        "reason" text NOT NULL,
        "status" "reports_status_enum" NOT NULL DEFAULT 'open',
        "reviewed_by" uuid,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reports_reporter" FOREIGN KEY ("reporter_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_reports_reviewer" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reports_target" ON "reports" ("targetType", "target_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reports_status" ON "reports" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'reports',
      'notifications',
      'messages',
      'conversation_members',
      'conversations',
      'comment_likes',
      'saved_posts',
      'comments',
      'likes',
      'post_mentions',
      'post_hashtags',
      'hashtags',
      'media',
      'posts',
      'follows',
      'users',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    const types = [
      'reports_status_enum',
      'reports_targettype_enum',
      'notifications_type_enum',
      'comments_status_enum',
      'media_type_enum',
      'posts_status_enum',
      'users_status_enum',
      'users_role_enum',
      'users_provider_enum',
    ];

    for (const type of types) {
      await queryRunner.query(`DROP TYPE IF EXISTS "${type}"`);
    }
  }
}
