-- Create the follows table
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- Enable Row Level Security
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Everyone can see who follows whom
CREATE POLICY "Public follows are viewable by everyone" 
ON follows FOR SELECT 
USING (true);

-- 2. Authenticated users can follow others (insert where follower_id is themselves)
CREATE POLICY "Users can follow others" 
ON follows FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

-- 3. Users can unfollow (delete where follower_id is themselves)
CREATE POLICY "Users can unfollow" 
ON follows FOR DELETE 
USING (auth.uid() = follower_id);
