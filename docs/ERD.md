# Entity Relationship Diagram (ERD)

## Database Schema

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                     USERS                                            │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Column          │ Type         │ Constraints                                        │
├─────────────────┼──────────────┼────────────────────────────────────────────────────┤
│ id              │ uuid         │ PRIMARY KEY                                        │
│ email           │ varchar      │ UNIQUE, NOT NULL                                   │
│ name            │ varchar      │                                                    │
│ username        │ varchar      │ UNIQUE, INDEXED                                    │
│ password        │ varchar      │ NULLABLE (OAuth users)                             │
│ googleId        │ varchar      │ UNIQUE, NULLABLE                                   │
│ avatarUrl       │ varchar      │                                                    │
│ bio             │ text         │                                                    │
│ followersCount  │ int          │ DEFAULT 0                                          │
│ followingCount  │ int          │ DEFAULT 0                                          │
│ notificationEnabled │ boolean │ DEFAULT true                                       │
│ createdAt       │ timestamp    │                                                    │
│ updatedAt       │ timestamp    │                                                    │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Relationships
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
        │    POSTS      │   │    FOLLOWS    │   │  NOTIFICATIONS│
        ├───────────────┤   ├───────────────┤   ├───────────────┤
        │ id (PK)       │   │ id (PK)       │   │ id (PK)       │
        │ userId (FK)   │◄──┤ followerId    │   │ recipientId   │◄────┐
        │ caption       │   │ followeeId    │   │ senderId      │    │
        │ createdAt     │   │ createdAt     │   │ type          │    │
        │ updatedAt     │   └───────────────┘   │ isRead        │    │
        └───────────────┘                       │ data (JSONB)  │    │
                │                               │ createdAt     │    │
                │                               └───────────────┘    │
                │                                                     │
        ┌───────┴───────┐                                             │
        │               │                                             │
        ▼               ▼                                             │
┌───────────────┐ ┌───────────────┐                                   │
│     MEDIA     │ │ POST_HASHTAGS │                                   │
├───────────────┤ ├───────────────┤                                   │
│ id (PK)       │ │ postId (FK)   │                                   │
│ postId (FK)   │ │ hashtagId (FK)│                                   │
│ url           │ └───────────────┘                                   │
│ type          │         │                                          │
│ orderIndex    │         │                                          │
└───────────────┘         │                                          │
                           ▼                                          │
                  ┌───────────────┐                                   │
                  │   HASHTAGS    │                                   │
                  ├───────────────┤                                   │
                  │ id (PK)       │                                   │
                  │ name          │                                   │
                  │ count         │                                   │
                  └───────────────┘                                   │
                                                                        │
        ┌───────────────┐                                               │
        │     LIKES     │                                               │
        ├───────────────┤                                               │
        │ id (PK)       │                                               │
        │ postId (FK)   │                                               │
        │ userId (FK)   │                                               │
        │ createdAt     │                                               │
        └───────────────┘                                               │
                │                                                         │
        ┌───────┴───────┐                                                 │
        │               │                                                 │
        ▼               ▼                                                 ▼
┌───────────────┐ ┌───────────────┐                           ┌───────────────┐
│   COMMENTS    │ │ CONVERSATIONS │                           │   MESSAGES    │
├───────────────┤ ├───────────────┤                           ├───────────────┤
│ id (PK)       │ │ id (PK)       │                           │ id (PK)       │
│ postId (FK)   │ │ isGroup       │                           │ conversationId│
│ userId (FK)   │ │ createdAt     │                           │   (FK)        │
│ parentId (FK) │ │ updatedAt     │                           │ senderId (FK) │
│ content       │ └───────────────┘                           │ content       │
│ createdAt     │         │                                 │ mediaUrl      │
│ updatedAt     │         │                                 │ createdAt     │
└───────────────┘         │                                 └───────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
    ┌───────────────┐   ┌───────────────┐
    │CONV_MEMBERS   │   │ CONV_MEMBERS  │
    ├───────────────┤   ├───────────────┤
    │ id (PK)       │   │ id (PK)       │
    │ convId (FK)   │   │ convId (FK)   │
    │ userId (FK)   │   │ userId (FK)   │
    │ hasLeft       │   │ hasLeft       │
    │ joinedAt      │   │ joinedAt      │
    └───────────────┘   └───────────────┘
```

## Entity Relationships

### Users
- **One-to-Many** with Posts (user → posts)
- **One-to-Many** with Comments (user → comments)
- **One-to-Many** with Likes (user → likes)
- **One-to-Many** with Sent Notifications (user → notifications as sender)
- **One-to-Many** with Received Notifications (user → notifications as recipient)
- **One-to-Many** with Conversation Members (user → conversation_members)
- **One-to-Many** with Messages (user → messages)
- **Self-Many-to-Many** through Follows (followers/following)

### Posts
- **Many-to-One** with Users (post → user)
- **One-to-Many** with Media (post → media)
- **One-to-Many** with Likes (post → likes)
- **One-to-Many** with Comments (post → comments)
- **Many-to-Many** with Hashtags through PostHashtags

### Comments
- **Many-to-One** with Posts (comment → post)
- **Many-to-One** with Users (comment → user)
- **Self-Referential** (parent → child replies)

### Likes
- **Many-to-One** with Posts (like → post)
- **Many-to-One** with Users (like → user)
- **Unique Constraint**: (postId, userId) - one like per user per post

### Follows
- **Many-to-One** with Users as Follower (follow → follower)
- **Many-to-One** with Users as Followee (follow → followee)
- **Unique Constraint**: (followerId, followeeId) - can't follow same person twice

### Conversations
- **One-to-Many** with Conversation Members (conversation → members)
- **One-to-Many** with Messages (conversation → messages)

### Conversation Members
- **Many-to-One** with Conversations (member → conversation)
- **Many-to-One** with Users (member → user)
- **Unique Constraint**: (conversationId, userId) - one entry per user per conversation

### Messages
- **Many-to-One** with Conversations (message → conversation)
- **Many-to-One** with Users (message → sender)

### Notifications
- **Many-to-One** with Users as Recipient (notification → recipient)
- **Many-to-One** with Users as Sender (notification → sender)

### Hashtags
- **Many-to-Many** with Posts through PostHashtags

## Indexes

For performance optimization, the following indexes are configured:

```sql
-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_google_id ON users(googleId);

-- Posts
CREATE INDEX idx_posts_user_id ON posts(userId);
CREATE INDEX idx_posts_created_at ON posts(createdAt DESC);

-- Likes
CREATE UNIQUE INDEX idx_likes_post_user ON likes(postId, userId);

-- Comments
CREATE INDEX idx_comments_post_id ON comments(postId);
CREATE INDEX idx_comments_parent_id ON comments(parentId);

-- Follows
CREATE UNIQUE INDEX idx_follows_follower_followee ON follows(followerId, followeeId);

-- Hashtags
CREATE UNIQUE INDEX idx_hashtags_name ON hashtags(name);
CREATE INDEX idx_post_hashtags_post_id ON post_hashtags(postId);

-- Notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipientId);
CREATE INDEX idx_notifications_is_read ON notifications(isRead);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversationId);
CREATE INDEX idx_messages_created_at ON messages(createdAt DESC);

-- Conversation Members
CREATE UNIQUE INDEX idx_conv_members_conv_user ON conversation_members(conversationId, userId);
```

## Data Integrity Constraints

1. **Foreign Keys**: All relationships enforced via FK constraints
2. **Unique Constraints**: Prevent duplicate entries (likes, follows)
3. **NOT NULL**: Required fields (email, postId, userId, etc.)
4. **Cascade Deletes**: Not used - soft delete pattern recommended
5. **Default Values**: Counters default to 0, booleans to true/false
