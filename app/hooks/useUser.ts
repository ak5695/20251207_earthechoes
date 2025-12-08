"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, User } from "@/lib/supabase";

interface UseUserReturn {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  unreadNotifications: number;
  setUnreadNotifications: (count: number | ((prev: number) => number)) => void;
  likedPosts: Set<string>;
  setLikedPosts: (
    posts: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => void;
  isLoading: boolean;
}

export function useUser(): UseUserReturn {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // 加载用户状态
  useEffect(() => {
    const loadUser = async () => {
      const userId = localStorage.getItem("earthechoes_user_id");
      if (userId) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();
        if (data) {
          setCurrentUser(data);
        }
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  // 获取未读通知数量
  useEffect(() => {
    if (!currentUser) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUser.id)
        .eq("is_read", false);
      setUnreadNotifications(count || 0);
    };
    fetchUnreadCount();

    // 实时订阅
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          setUnreadNotifications((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // 获取用户点赞的帖子
  useEffect(() => {
    if (!currentUser) return;

    const fetchLikedPosts = async () => {
      const { data } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", currentUser.id)
        .not("post_id", "is", null);
      if (data) {
        setLikedPosts(new Set(data.map((l) => l.post_id!)));
      }
    };
    fetchLikedPosts();
  }, [currentUser]);

  return {
    currentUser,
    setCurrentUser,
    unreadNotifications,
    setUnreadNotifications,
    likedPosts,
    setLikedPosts,
    isLoading,
  };
}

// 点赞帖子的工具函数
export async function toggleLike(
  postId: string,
  userId: string,
  isCurrentlyLiked: boolean
): Promise<boolean> {
  try {
    if (isCurrentlyLiked) {
      await supabase
        .from("likes")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);
      return false; // 取消点赞
    } else {
      await supabase.from("likes").insert({
        user_id: userId,
        post_id: postId,
      });
      return true; // 点赞成功
    }
  } catch (err) {
    console.error("Error toggling like:", err);
    throw err;
  }
}
