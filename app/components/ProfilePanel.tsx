"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase, User, Post, Comment } from "@/lib/supabase";
import { X, Heart, MessageCircle, Trash2, LogOut } from "lucide-react";
import { TypingAnimation } from "@/components/ui/typing-animation";

interface ProfilePanelProps {
  currentUser: User;
  onClose: () => void;
  onLogout: () => void;
  language: string;
  isClosing?: boolean;
}

interface PostWithStats extends Post {
  comments: CommentWithUser[];
}

interface CommentWithUser extends Comment {
  user: User;
}

const translations: Record<string, Record<string, string>> = {
  zh: {
    profile: "我的主页",
    myPosts: "我的心情",
    totalLikes: "获得的赞",
    totalComments: "收到的评论",
    noPosts: "还没有发布心情",
    deleteConfirm: "确定删除这条心情吗？",
    logout: "退出登录",
    logoutConfirm: "确定要退出登录吗？",
    region: "地区",
    joinedAt: "加入于",
    vip: "VIP",
    comments: "条评论",
    noComments: "暂无评论",
  },
  en: {
    profile: "My Profile",
    myPosts: "My Moods",
    totalLikes: "Likes Received",
    totalComments: "Comments Received",
    noPosts: "No moods posted yet",
    deleteConfirm: "Delete this mood?",
    logout: "Log Out",
    logoutConfirm: "Are you sure you want to log out?",
    region: "Region",
    joinedAt: "Joined",
    vip: "VIP",
    comments: "comments",
    noComments: "No comments yet",
  },
  ja: {
    profile: "マイページ",
    myPosts: "私の気持ち",
    totalLikes: "いいね数",
    totalComments: "コメント数",
    noPosts: "まだ投稿がありません",
    deleteConfirm: "この投稿を削除しますか？",
    logout: "ログアウト",
    logoutConfirm: "ログアウトしますか？",
    region: "地域",
    joinedAt: "参加日",
    vip: "VIP",
    comments: "件のコメント",
    noComments: "コメントはありません",
  },
  ko: {
    profile: "내 프로필",
    myPosts: "내 감정",
    totalLikes: "받은 좋아요",
    totalComments: "받은 댓글",
    noPosts: "아직 게시물이 없습니다",
    deleteConfirm: "이 게시물을 삭제하시겠습니까?",
    logout: "로그아웃",
    logoutConfirm: "로그아웃하시겠습니까?",
    region: "지역",
    joinedAt: "가입일",
    vip: "VIP",
    comments: "개의 댓글",
    noComments: "댓글이 없습니다",
  },
  fr: {
    profile: "Mon Profil",
    myPosts: "Mes Humeurs",
    totalLikes: "J'aimes Reçus",
    totalComments: "Commentaires Reçus",
    noPosts: "Aucune publication",
    deleteConfirm: "Supprimer cette publication ?",
    logout: "Déconnexion",
    logoutConfirm: "Voulez-vous vous déconnecter ?",
    region: "Région",
    joinedAt: "Inscrit le",
    vip: "VIP",
    comments: "commentaires",
    noComments: "Aucun commentaire",
  },
  es: {
    profile: "Mi Perfil",
    myPosts: "Mis Estados",
    totalLikes: "Me Gusta Recibidos",
    totalComments: "Comentarios Recibidos",
    noPosts: "Sin publicaciones",
    deleteConfirm: "¿Eliminar esta publicación?",
    logout: "Cerrar Sesión",
    logoutConfirm: "¿Desea cerrar sesión?",
    region: "Región",
    joinedAt: "Registrado",
    vip: "VIP",
    comments: "comentarios",
    noComments: "Sin comentarios",
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

export default function ProfilePanel({
  currentUser,
  onClose,
  onLogout,
  language,
  isClosing = false,
}: ProfilePanelProps) {
  const t = translations[language] || translations.en;

  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // 入场动画
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const fetchUserPosts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user's posts
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate totals and fetch comments for each post
      let likes = 0;
      let comments = 0;
      const postsWithComments: PostWithStats[] = [];

      for (const post of postsData || []) {
        likes += post.likes_count || 0;
        comments += post.comments_count || 0;

        // Fetch comments for this post
        const { data: commentsData } = await supabase
          .from("comments")
          .select("*")
          .eq("post_id", post.id)
          .order("created_at", { ascending: false })
          .limit(10);

        // Get user info for comments
        const commentsWithUser: CommentWithUser[] = [];
        for (const comment of commentsData || []) {
          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("id", comment.user_id)
            .single();

          commentsWithUser.push({
            ...comment,
            user: userData,
          });
        }

        postsWithComments.push({
          ...post,
          comments: commentsWithUser,
        });
      }

      setPosts(postsWithComments);
      setTotalLikes(likes);
      setTotalComments(comments);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchUserPosts();
  }, [fetchUserPosts]);

  const handleDeletePost = async (postId: string) => {
    if (!confirm(t.deleteConfirm)) return;

    try {
      await supabase.from("posts").delete().eq("id", postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const handleLogout = () => {
    if (confirm(t.logoutConfirm)) {
      localStorage.removeItem("earthechoes_user_id");
      localStorage.removeItem("earthechoes_user");
      onLogout();
    }
  };

  const bgColor = generateRandomAvatar(currentUser.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-md ${
          isClosing ? "animate-backdrop-exit" : "animate-backdrop-enter"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative w-full max-w-md bg-gradient-to-b from-gray-900/95 to-black/95 rounded-2xl max-h-[85vh] flex flex-col overflow-hidden ${
          isClosing ? "animate-panel-exit" : "animate-panel-enter"
        }`}
        style={{ backdropFilter: "blur(20px)" }}
      >
        {/* Header with Avatar */}
        <div className="relative pt-8 pb-6 px-6 border-b border-white/10">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Avatar and User Info */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-medium"
              style={{ backgroundColor: bgColor }}
            >
              {currentUser.nickname.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white text-xl font-medium">
                  <TypingAnimation
                    duration={80}
                    delay={200}
                    showCursor={false}
                    className="text-white text-xl font-medium"
                  >
                    {currentUser.nickname}
                  </TypingAnimation>
                </h2>
                {currentUser.is_vip && (
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs rounded font-medium">
                    {t.vip}
                  </span>
                )}
              </div>
              {currentUser.region && (
                <p className="text-white/50 text-sm mt-1">
                  <TypingAnimation
                    duration={60}
                    delay={400}
                    showCursor={false}
                    className="text-white/50 text-sm"
                  >
                    {`${t.region}: ${currentUser.region}`}
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
                    currentUser.created_at
                  ).toLocaleDateString()}`}
                </TypingAnimation>
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6">
            <div className="text-center">
              <div className="text-white text-2xl font-light">
                {posts.length}
              </div>
              <div className="text-white/50 text-xs">{t.myPosts}</div>
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
                  className="bg-white/5 rounded-xl p-4 border border-white/10"
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
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-white/90 text-sm mb-3">{post.content}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-red-400/80">
                      <Heart className="w-3.5 h-3.5" fill="currentColor" />
                      {post.likes_count}
                    </span>
                    <button
                      onClick={() =>
                        setExpandedPost(
                          expandedPost === post.id ? null : post.id
                        )
                      }
                      className="flex items-center gap-1 text-blue-400/80 hover:text-blue-400 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {post.comments_count} {t.comments}
                    </button>
                  </div>

                  {/* Comments Expansion */}
                  {expandedPost === post.id && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      {post.comments.length === 0 ? (
                        <p className="text-white/30 text-xs">{t.noComments}</p>
                      ) : (
                        <div className="space-y-2">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                                style={{
                                  backgroundColor: generateRandomAvatar(
                                    comment.user?.id || ""
                                  ),
                                }}
                              >
                                {comment.user?.nickname
                                  ?.charAt(0)
                                  .toUpperCase() || "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-white/70 text-xs font-medium">
                                    {comment.user?.nickname || "Unknown"}
                                  </span>
                                  <span className="text-white/30 text-xs">
                                    {new Date(
                                      comment.created_at
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-white/60 text-xs mt-0.5">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Logout */}
        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t.logout}
          </button>
        </div>
      </div>
    </div>
  );
}
