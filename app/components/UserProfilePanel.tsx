"use client";

import React, { useState, useEffect } from "react";
import { supabase, User, Post, Comment } from "@/lib/supabase";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { X, Heart, MessageCircle, Mars, Venus, CircleHelp } from "lucide-react";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { triggerHapticFeedback } from "../utils/haptics";

interface UserProfilePanelProps {
  user: User;
  onClose: () => void;
  onPostClick: (post: Post) => void;
  language: string;
  isClosing?: boolean;
}

interface PostWithStats extends Post {
  comments_count: number;
  likes_count: number;
}

const translations: Record<string, Record<string, string>> = {
  zh: {
    profile: "用户主页",
    posts: "心情",
    totalLikes: "获得的赞",
    totalComments: "收到的评论",
    noPosts: "还没有发布心情",
    region: "地区",
    joinedAt: "加入于",
    vip: "VIP",
  },
  en: {
    profile: "User Profile",
    posts: "Moods",
    totalLikes: "Likes",
    totalComments: "Comments",
    noPosts: "No moods posted yet",
    region: "Region",
    joinedAt: "Joined",
    vip: "VIP",
  },
  ja: {
    profile: "ユーザープロフィール",
    posts: "気持ち",
    totalLikes: "いいね",
    totalComments: "コメント",
    noPosts: "まだ投稿がありません",
    region: "地域",
    joinedAt: "参加日",
    vip: "VIP",
  },
  ko: {
    profile: "사용자 프로필",
    posts: "감정",
    totalLikes: "좋아요",
    totalComments: "댓글",
    noPosts: "아직 게시물이 없습니다",
    region: "지역",
    joinedAt: "가입일",
    vip: "VIP",
  },
  fr: {
    profile: "Profil Utilisateur",
    posts: "Publications",
    totalLikes: "J'aime",
    totalComments: "Commentaires",
    noPosts: "Aucune publication",
    region: "Région",
    joinedAt: "Inscrit le",
    vip: "VIP",
  },
  es: {
    profile: "Perfil de Usuario",
    posts: "Publicaciones",
    totalLikes: "Me gusta",
    totalComments: "Comentarios",
    noPosts: "Sin publicaciones",
    region: "Región",
    joinedAt: "Se unió",
    vip: "VIP",
  },
};

function generateRandomAvatar(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export default function UserProfilePanel({
  user,
  onClose,
  onPostClick,
  language,
  isClosing = false,
}: UserProfilePanelProps) {
  const t = translations[language] || translations.en;
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalComments, setTotalComments] = useState(0);

  const bgColor = generateRandomAvatar(user.id);

  // Fetch user's posts
  useEffect(() => {
    async function fetchUserPosts() {
      setLoading(true);
      try {
        const { data: postsData, error } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        setPosts(postsData || []);

        // Calculate totals
        let likes = 0;
        let comments = 0;
        (postsData || []).forEach((post) => {
          likes += post.likes_count || 0;
          comments += post.comments_count || 0;
        });
        setTotalLikes(likes);
        setTotalComments(comments);
      } catch (err) {
        console.error("Error fetching user posts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserPosts();
  }, [user.id]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ pointerEvents: "auto" }}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer ${
          isClosing ? "animate-backdrop-exit" : "animate-backdrop-enter"
        }`}
        onClick={() => {
          triggerHapticFeedback();
          onClose();
        }}
      />

      {/* Panel */}
      <div
        className={`relative z-10 w-full max-w-md bg-gradient-to-b from-gray-900/95 to-black/95 rounded-2xl max-h-[85vh] flex flex-col overflow-hidden ${
          isClosing ? "animate-panel-exit" : "animate-panel-enter"
        }`}
        style={{ backdropFilter: "blur(20px)", pointerEvents: "auto" }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header with Avatar */}
        <div className="relative pt-4 pb-3 px-6 border-b border-white/10">
          {/* Close button */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              onClose();
            }}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors btn-icon"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Avatar and User Info */}
          <div className="flex items-center gap-4">
            <GeneratedAvatar seed={user.nickname} className="w-16 h-16" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white text-xl font-medium">
                  <TypingAnimation
                    duration={80}
                    delay={200}
                    showCursor={false}
                    className="text-white text-xl font-medium"
                  >
                    {user.nickname}
                  </TypingAnimation>
                </h2>
                {user.gender === "male" && (
                  <Mars className="w-4 h-4 text-indigo-400" />
                )}
                {user.gender === "female" && (
                  <Venus className="w-4 h-4 text-pink-400" />
                )}
                {(!user.gender || user.gender === "unknown") && (
                  <CircleHelp className="w-4 h-4 text-gray-400" />
                )}
                {user.is_vip && (
                  <span className="px-1.5 py-0.5 bg-linear-to-r from-yellow-500 to-orange-500 text-white text-xs rounded font-medium">
                    {t.vip}
                  </span>
                )}
              </div>
              {user.region && (
                <p className="text-white/50 text-sm mt-1">
                  <TypingAnimation
                    duration={60}
                    delay={400}
                    showCursor={false}
                    className="text-white/50 text-sm"
                  >
                    {`${t.region}: ${user.region}`}
                  </TypingAnimation>
                </p>
              )}
              <p className="text-white/40 text-xs mt-1">
                <TypingAnimation
                  duration={50}
                  delay={600}
                  showCursor={true}
                  blinkCursor={true}
                  className="text-white/40 text-xs"
                >
                  {`${t.joinedAt} ${new Date(
                    user.created_at
                  ).toLocaleDateString()}`}
                </TypingAnimation>
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-2">
            <div className="text-center">
              <div className="text-white text-2xl font-light">
                {posts.length}
              </div>
              <div className="text-white/50 text-xs">{t.posts}</div>
            </div>
            <div className="text-center">
              <div className="text-red-400 text-2xl font-light">
                {totalLikes}
              </div>
              <div className="text-white/50 text-xs">{t.totalLikes}</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 text-2xl font-light">
                {totalComments}
              </div>
              <div className="text-white/50 text-xs">{t.totalComments}</div>
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-white/40">{t.noPosts}</div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors relative z-20"
                  style={{ pointerEvents: "auto" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHapticFeedback();
                    onPostClick(post);
                  }}
                >
                  {/* Post Content */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: post.color || "#6366f1",
                          boxShadow: `0 0 8px ${post.color || "#6366f1"}`,
                        }}
                      />
                      <span className="text-white/40 text-xs">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-white/90 text-sm mb-3">{post.content}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-red-400/80">
                      <Heart className="w-3.5 h-3.5" fill="currentColor" />
                      {post.likes_count || 0}
                    </span>
                    <span className="flex items-center gap-1 text-blue-400/80">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {post.comments_count || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
