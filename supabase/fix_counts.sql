-- Recalculate likes_count for all posts
UPDATE posts
SET likes_count = (
  SELECT COUNT(*)
  FROM likes
  WHERE likes.post_id = posts.id
);

-- Recalculate comments_count for all posts
UPDATE posts
SET comments_count = (
  SELECT COUNT(*)
  FROM comments
  WHERE comments.post_id = posts.id
);

-- Recalculate likes_count for all comments
UPDATE comments
SET likes_count = (
  SELECT COUNT(*)
  FROM likes
  WHERE likes.comment_id = comments.id
);
