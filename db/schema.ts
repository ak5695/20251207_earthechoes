import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 120 }).notNull().unique(),
  nickname: varchar("nickname", { length: 50 }).notNull(),
  avatarUrl: text("avatar_url"),
  gender: varchar("gender", { length: 20 }).default("unknown"),
  region: varchar("region", { length: 100 }),
  language: varchar("language", { length: 10 }).default("zh"),
  isVip: boolean("is_vip").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mood: varchar("mood", { length: 50 }),
  color: varchar("color", { length: 20 }),
  language: varchar("language", { length: 10 }).default("zh"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"), // Self-reference handled separately
  replyToUserId: uuid("reply_to_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const likes = pgTable(
  "likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      uniquePostLike: unique("unique_post_like").on(table.userId, table.postId),
      uniqueCommentLike: unique("unique_comment_like").on(
        table.userId,
        table.commentId
      ),
    };
  }
);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  type: varchar("type", { length: 20 }).notNull(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  commentId: uuid("comment_id").references(() => comments.id, {
    onDelete: "cascade",
  }),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  postsCount: integer("posts_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const postTopics = pgTable(
  "post_topics",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, {
        onDelete: "cascade",
      }),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.postId, table.topicId] }),
    };
  }
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.followerId, table.followingId] }),
  })
);
