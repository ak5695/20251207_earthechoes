import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      Accept: "application/json",
    },
  },
});

// Types for database tables
export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  region: string | null;
  language: string;
  is_vip: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  mood: string | null;
  color: string | null;
  language: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user?: User;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  user?: User;
  replies?: Comment[];
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "like" | "comment" | "reply";
  from_user_id: string;
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: User;
}
