-- Function to update likes_count on posts
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL) THEN
    UPDATE posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL) THEN
    UPDATE posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for posts likes
DROP TRIGGER IF EXISTS update_post_likes_count_trigger ON likes;
CREATE TRIGGER update_post_likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION update_post_likes_count();

-- Function to update comments_count on posts
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE posts
    SET comments_count = comments_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for posts comments
DROP TRIGGER IF EXISTS update_post_comments_count_trigger ON comments;
CREATE TRIGGER update_post_comments_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comments_count();

-- Function to update likes_count on comments
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.comment_id IS NOT NULL) THEN
    UPDATE comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
  ELSIF (TG_OP = 'DELETE' AND OLD.comment_id IS NOT NULL) THEN
    UPDATE comments
    SET likes_count = likes_count - 1
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comments likes
DROP TRIGGER IF EXISTS update_comment_likes_count_trigger ON likes;
CREATE TRIGGER update_comment_likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_likes_count();
