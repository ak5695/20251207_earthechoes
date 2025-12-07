"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase, User, Notification } from "@/lib/supabase";

interface NotificationPanelProps {
  currentUser: User | null;
  onClose: () => void;
  language: string;
}

interface NotificationWithUser extends Notification {
  from_user: User;
}

const translations: Record<string, Record<string, string>> = {
  zh: {
    notifications: "通知",
    noNotifications: "暂无通知",
    likedYourPost: "赞了你的帖子",
    likedYourComment: "赞了你的评论",
    commentedOnYourPost: "评论了你的帖子",
    repliedToYourComment: "回复了你的评论",
    markAllRead: "全部已读",
    justNow: "刚刚",
    minutesAgo: "分钟前",
    hoursAgo: "小时前",
    daysAgo: "天前",
  },
  en: {
    notifications: "Notifications",
    noNotifications: "No notifications",
    likedYourPost: "liked your post",
    likedYourComment: "liked your comment",
    commentedOnYourPost: "commented on your post",
    repliedToYourComment: "replied to your comment",
    markAllRead: "Mark all read",
    justNow: "just now",
    minutesAgo: "m ago",
    hoursAgo: "h ago",
    daysAgo: "d ago",
  },
  ja: {
    notifications: "通知",
    noNotifications: "通知はありません",
    likedYourPost: "が投稿にいいねしました",
    likedYourComment: "がコメントにいいねしました",
    commentedOnYourPost: "が投稿にコメントしました",
    repliedToYourComment: "がコメントに返信しました",
    markAllRead: "すべて既読",
    justNow: "今",
    minutesAgo: "分前",
    hoursAgo: "時間前",
    daysAgo: "日前",
  },
  ko: {
    notifications: "알림",
    noNotifications: "알림이 없습니다",
    likedYourPost: "님이 게시물에 좋아요를 눌렀습니다",
    likedYourComment: "님이 댓글에 좋아요를 눌렀습니다",
    commentedOnYourPost: "님이 댓글을 남겼습니다",
    repliedToYourComment: "님이 답글을 남겼습니다",
    markAllRead: "모두 읽음",
    justNow: "방금",
    minutesAgo: "분 전",
    hoursAgo: "시간 전",
    daysAgo: "일 전",
  },
  fr: {
    notifications: "Notifications",
    noNotifications: "Aucune notification",
    likedYourPost: "a aimé votre publication",
    likedYourComment: "a aimé votre commentaire",
    commentedOnYourPost: "a commenté votre publication",
    repliedToYourComment: "a répondu à votre commentaire",
    markAllRead: "Tout lu",
    justNow: "maintenant",
    minutesAgo: "min",
    hoursAgo: "h",
    daysAgo: "j",
  },
  es: {
    notifications: "Notificaciones",
    noNotifications: "Sin notificaciones",
    likedYourPost: "le gustó tu publicación",
    likedYourComment: "le gustó tu comentario",
    commentedOnYourPost: "comentó tu publicación",
    repliedToYourComment: "respondió a tu comentario",
    markAllRead: "Marcar todo",
    justNow: "ahora",
    minutesAgo: "min",
    hoursAgo: "h",
    daysAgo: "d",
  },
};

function formatTimeAgo(dateStr: string, lang: string): string {
  const t = translations[lang] || translations.en;
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t.justNow;
  if (diffMins < 60) return `${diffMins}${t.minutesAgo}`;
  if (diffHours < 24) return `${diffHours}${t.hoursAgo}`;
  if (diffDays < 30) return `${diffDays}${t.daysAgo}`;
  return date.toLocaleDateString();
}

function generateRandomAvatar(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

function Avatar({ user, size = 40 }: { user: User; size?: number }) {
  const bgColor = generateRandomAvatar(user.id);

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-medium overflow-hidden"
      style={{
        width: size,
        height: size,
        minWidth: size,
        backgroundColor: user.avatar_url ? "transparent" : bgColor,
        fontSize: size * 0.4,
      }}
    >
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.nickname}
          className="w-full h-full object-cover"
        />
      ) : (
        user.nickname.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default function NotificationPanel({
  currentUser,
  onClose,
  language,
}: NotificationPanelProps) {
  const t = translations[language] || translations.en;

  const [notifications, setNotifications] = useState<NotificationWithUser[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch from_user for each notification
      const notificationsWithUser: NotificationWithUser[] = [];
      for (const notification of data || []) {
        const { data: fromUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", notification.from_user_id)
          .single();

        notificationsWithUser.push({
          ...notification,
          from_user: fromUser,
        });
      }

      setNotifications(notificationsWithUser);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUser.id)
        .eq("is_read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Error marking notifications as read:", err);
    }
  };

  const getNotificationText = (notification: NotificationWithUser): string => {
    switch (notification.type) {
      case "like":
        return notification.comment_id ? t.likedYourComment : t.likedYourPost;
      case "comment":
        return t.commentedOnYourPost;
      case "reply":
        return t.repliedToYourComment;
      default:
        return "";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return (
          <svg
            className="w-4 h-4 text-red-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case "comment":
      case "reply":
        return (
          <svg
            className="w-4 h-4 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-gradient-to-b from-gray-900/95 to-black/95 rounded-t-3xl max-h-[70vh] flex flex-col"
        style={{ backdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-medium">{t.notifications}</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handleMarkAllRead}
              className="text-blue-400 text-sm hover:text-blue-300 transition-colors"
            >
              {t.markAllRead}
            </button>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              {t.noNotifications}
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 px-5 py-4 border-b border-white/5 ${
                  !notification.is_read ? "bg-white/5" : ""
                }`}
              >
                <div className="relative">
                  <Avatar user={notification.from_user} size={44} />
                  <div className="absolute -bottom-1 -right-1 p-1 bg-gray-900 rounded-full">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm">
                    <span className="font-medium">
                      {notification.from_user.nickname}
                    </span>{" "}
                    <span className="text-white/60">
                      {getNotificationText(notification)}
                    </span>
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    {formatTimeAgo(notification.created_at, language)}
                  </p>
                </div>

                {!notification.is_read && (
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
