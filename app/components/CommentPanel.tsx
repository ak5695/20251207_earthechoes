"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase, Post, Comment, User, Like } from "@/lib/supabase";
import { TypingAnimation } from "@/components/ui/typing-animation";
import UserProfilePanel from "./UserProfilePanel";
import ShareModal from "./ShareModal";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { triggerHapticFeedback } from "../utils/haptics";
import {
  Mars,
  Venus,
  CircleHelp,
  Share2,
  Trash2,
  Bookmark,
} from "lucide-react";
import { trpc } from "../_trpc/client";

// =============================================
// Types
// =============================================
interface CommentWithUser extends Comment {
  user: User;
  replies?: CommentWithUser[];
  reply_to_user?: User;
}

interface PostWithUser extends Post {
  user: User;
}

interface CommentPanelProps {
  post: PostWithUser | null;
  currentUser: User | null;
  onClose: () => void;
  onUserRequired: () => void;
  onPostClick?: (post: PostWithUser) => void;
  onUserClick?: (user: User) => void;
  language: string;
  highlightCommentId?: string | null;
}

type SortType = "recommend" | "hot" | "new";

// =============================================
// Translations
// =============================================
const translations: Record<string, Record<string, string>> = {
  zh: {
    comments: "评论",
    recommend: "推荐",
    hot: "最热",
    new: "最新",
    reply: "回复",
    like: "点赞",
    liked: "已赞",
    noComments: "还没有评论，快来抢沙发~",
    writeComment: "说点什么...",
    send: "发送",
    replyTo: "回复 @",
    justNow: "刚刚",
    minutesAgo: "分钟前",
    hoursAgo: "小时前",
    daysAgo: "天前",
    viewReplies: "查看回复",
    hideReplies: "收起回复",
    vip: "VIP",
    loginToComment: "登录后评论",
    follow: "关注",
    following: "已关注",
    delete: "删除",
    deleteConfirm: "确定删除这条评论吗？",
    contentDeleted: "内容已删除",
  },
  en: {
    comments: "Comments",
    recommend: "Top",
    hot: "Hot",
    new: "New",
    reply: "Reply",
    like: "Like",
    liked: "Liked",
    noComments: "No comments yet. Be the first!",
    writeComment: "Write a comment...",
    send: "Send",
    replyTo: "Reply to @",
    justNow: "just now",
    minutesAgo: "m ago",
    hoursAgo: "h ago",
    daysAgo: "d ago",
    viewReplies: "View replies",
    hideReplies: "Hide replies",
    vip: "VIP",
    loginToComment: "Login to comment",
    follow: "Follow",
    following: "Following",
    delete: "Delete",
    deleteConfirm: "Delete this comment?",
    contentDeleted: "Content deleted",
  },
  ja: {
    comments: "コメント",
    recommend: "おすすめ",
    hot: "人気",
    new: "新着",
    reply: "返信",
    like: "いいね",
    liked: "済み",
    noComments: "コメントはまだありません",
    writeComment: "コメントを書く...",
    send: "送信",
    replyTo: "@ に返信",
    justNow: "今",
    minutesAgo: "分前",
    hoursAgo: "時間前",
    daysAgo: "日前",
    viewReplies: "返信を見る",
    hideReplies: "返信を隠す",
    vip: "VIP",
    loginToComment: "ログインしてコメント",
  },
  ko: {
    comments: "댓글",
    recommend: "추천",
    hot: "인기",
    new: "최신",
    reply: "답글",
    like: "좋아요",
    liked: "좋아요 취소",
    noComments: "아직 댓글이 없습니다",
    writeComment: "댓글 작성...",
    send: "보내기",
    replyTo: "@ 에게 답글",
    justNow: "방금",
    minutesAgo: "분 전",
    hoursAgo: "시간 전",
    daysAgo: "일 전",
    viewReplies: "답글 보기",
    hideReplies: "답글 숨기기",
    vip: "VIP",
    loginToComment: "로그인하여 댓글",
  },
  fr: {
    comments: "Commentaires",
    recommend: "Top",
    hot: "Populaire",
    new: "Récent",
    reply: "Répondre",
    like: "J'aime",
    liked: "Aimé",
    noComments: "Pas encore de commentaires",
    writeComment: "Écrire un commentaire...",
    send: "Envoyer",
    replyTo: "Répondre à @",
    justNow: "maintenant",
    minutesAgo: "min",
    hoursAgo: "h",
    daysAgo: "j",
    viewReplies: "Voir les réponses",
    hideReplies: "Masquer",
    vip: "VIP",
    loginToComment: "Connectez-vous pour commenter",
  },
  es: {
    comments: "Comentarios",
    recommend: "Top",
    hot: "Popular",
    new: "Nuevo",
    reply: "Responder",
    like: "Me gusta",
    liked: "Gustó",
    noComments: "Sin comentarios aún",
    writeComment: "Escribe un comentario...",
    send: "Enviar",
    replyTo: "Responder a @",
    justNow: "ahora",
    minutesAgo: "min",
    hoursAgo: "h",
    daysAgo: "d",
    viewReplies: "Ver respuestas",
    hideReplies: "Ocultar",
    vip: "VIP",
    loginToComment: "Inicia sesión para comentar",
  },
};

// =============================================
// Helper Functions
// =============================================
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
  // Generate a consistent color based on seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

// =============================================
// Avatar Component
// =============================================
function Avatar({
  user,
  size = 40,
  onClick,
}: {
  user: User;
  size?: number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={
        onClick ? "cursor-pointer btn-icon inline-block" : "inline-block"
      }
      style={{ width: size, height: size }}
    >
      <GeneratedAvatar seed={user.nickname} className="w-full h-full" />
    </div>
  );
}

// =============================================
// Single Comment Component
// =============================================
function CommentItem({
  comment,
  currentUser,
  onReply,
  onLike,
  likedComments,
  language,
  isReply = false,
  onViewProfile,
  onDelete,
  expandedIds,
}: {
  comment: CommentWithUser;
  currentUser: User | null;
  onReply: (comment: CommentWithUser) => void;
  onLike: (commentId: string) => void;
  likedComments: Set<string>;
  language: string;
  isReply?: boolean;
  onViewProfile: (user: User) => void;
  onDelete: (commentId: string) => void;
  expandedIds?: Set<string>;
}) {
  const t = translations[language] || translations.en;
  const [showReplies, setShowReplies] = useState(false);

  useEffect(() => {
    if (expandedIds?.has(comment.id)) {
      setShowReplies(true);
    }
  }, [expandedIds, comment.id]);

  const isLiked = likedComments.has(comment.id);
  const isOwner = currentUser?.id === comment.user_id;

  return (
    <div
      id={`comment-${comment.id}`}
      className={`flex gap-3 ${
        isReply ? "ml-0 mt-3" : "py-4 border-b border-white/10"
      }`}
    >
      <Avatar
        user={comment.user}
        size={isReply ? 32 : 40}
        onClick={() => onViewProfile(comment.user)}
      />

      <div className="flex-1 min-w-0">
        {/* User Info */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className="text-white/90 font-medium text-sm cursor-pointer hover:text-white transition-colors"
              onClick={() => onViewProfile(comment.user)}
            >
              {comment.user.nickname}
            </span>
            {comment.user.gender === "male" && (
              <Mars className="w-3 h-3 text-indigo-400" />
            )}
            {comment.user.gender === "female" && (
              <Venus className="w-3 h-3 text-pink-400" />
            )}
            {(!comment.user.gender || comment.user.gender === "unknown") && (
              <CircleHelp className="w-3 h-3 text-gray-400" />
            )}
            {comment.user.is_vip && (
              <span className="px-1.5 py-0.5 bg-linear-to-r from-yellow-500 to-orange-500 text-white text-xs rounded font-medium">
                {t.vip}
              </span>
            )}
            {comment.user.region && (
              <span className="text-white/40 text-xs">
                {comment.user.region}
              </span>
            )}
          </div>

          {isOwner && (
            <button
              onClick={() => {
                triggerHapticFeedback();
                onDelete(comment.id);
              }}
              className="text-white/20 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Reply indicator */}
        {comment.reply_to_user && (
          <span className="text-white/50 text-sm">
            {t.replyTo}
            {comment.reply_to_user.nickname}:{" "}
          </span>
        )}

        {/* Content */}
        <p className="text-white/80 text-sm leading-relaxed wrap-break-word">
          {comment.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-2">
          <span className="text-white/40 text-xs">
            {formatTimeAgo(comment.created_at, language)}
          </span>

          <button
            onClick={() => {
              triggerHapticFeedback();
              onLike(comment.id);
            }}
            className={`flex items-center gap-1 text-xs transition-colors btn-interactive ${
              isLiked ? "text-red-400" : "text-white/40 hover:text-white/60"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
          </button>

          <button
            onClick={() => {
              triggerHapticFeedback();
              onReply(comment);
            }}
            className="text-white/40 hover:text-white/60 text-xs transition-colors btn-interactive"
          >
            {t.reply}
          </button>
        </div>

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && !isReply && (
          <div className="mt-2">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setShowReplies(!showReplies);
              }}
              className="text-blue-400 text-xs hover:text-blue-300 transition-colors btn-interactive"
            >
              {showReplies
                ? t.hideReplies
                : `${t.viewReplies} (${comment.replies.length})`}
            </button>

            {showReplies && (
              <div className="mt-2">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    currentUser={currentUser}
                    onReply={onReply}
                    onLike={onLike}
                    likedComments={likedComments}
                    language={language}
                    isReply
                    onViewProfile={onViewProfile}
                    onDelete={onDelete}
                    expandedIds={expandedIds}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// Main Comment Panel Component
// =============================================
export default function CommentPanel({
  post,
  currentUser,
  onClose,
  onUserRequired,
  onPostClick,
  onUserClick,
  language,
  highlightCommentId,
}: CommentPanelProps) {
  const t = translations[language] || translations.en;
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sortType, setSortType] = useState<SortType>("recommend");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentWithUser | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post?.comments_count || 0);

  useEffect(() => {
    setCommentsCount(post?.comments_count || 0);
  }, [post?.comments_count]);

  // tRPC hooks
  const utils = trpc.useUtils();

  // Follow status
  const { data: isFollowingData } = trpc.user.isFollowing.useQuery(
    { followerId: currentUser?.id || "", followingId: post?.user.id || "" },
    { enabled: !!currentUser && !!post }
  );
  const isFollowing = !!isFollowingData;

  // Like status
  const { data: likeStatus } = trpc.post.getLikeStatus.useQuery(
    { postId: post?.id || "", userId: currentUser?.id },
    { enabled: !!post }
  );

  // Bookmark status
  const { data: bookmarkStatus } = trpc.post.getBookmarkStatus.useQuery(
    { postId: post?.id || "", userId: currentUser?.id },
    { enabled: !!post }
  );

  const toggleLikeMutation = trpc.post.toggleLike.useMutation({
    onMutate: async (newTodo) => {
      await utils.post.getLikeStatus.cancel({
        postId: newTodo.postId,
        userId: newTodo.userId,
      });
      const previousStatus = utils.post.getLikeStatus.getData({
        postId: newTodo.postId,
        userId: newTodo.userId,
      });

      if (previousStatus) {
        const newStatus = {
          isLiked: !previousStatus.isLiked,
          likesCount: previousStatus.isLiked
            ? previousStatus.likesCount - 1
            : previousStatus.likesCount + 1,
        };

        console.log(
          previousStatus.isLiked
            ? "Already liked, toggling to unlike"
            : "Not liked, toggling to like",
          "Previous:",
          previousStatus,
          "New:",
          newStatus
        );

        utils.post.getLikeStatus.setData(
          { postId: newTodo.postId, userId: newTodo.userId },
          newStatus
        );
      }
      return { previousStatus };
    },
    onError: (err, newTodo, context) => {
      console.error("Error toggling like:", err);
      if (context?.previousStatus) {
        utils.post.getLikeStatus.setData(
          { postId: newTodo.postId, userId: newTodo.userId },
          context.previousStatus
        );
      }
    },
    onSettled: (data, error, variables) => {
      utils.post.getLikeStatus.invalidate({
        postId: variables.postId,
        userId: variables.userId,
      });
      if (post) {
        utils.user.getProfile.invalidate({ userId: post.user.id });
      }
    },
  });

  const toggleBookmarkMutation = trpc.post.toggleBookmark.useMutation({
    onMutate: async (newTodo) => {
      await utils.post.getBookmarkStatus.cancel({
        postId: newTodo.postId,
        userId: newTodo.userId,
      });
      const previousStatus = utils.post.getBookmarkStatus.getData({
        postId: newTodo.postId,
        userId: newTodo.userId,
      });

      if (previousStatus) {
        utils.post.getBookmarkStatus.setData(
          { postId: newTodo.postId, userId: newTodo.userId },
          { isBookmarked: !previousStatus.isBookmarked }
        );
      }
      return { previousStatus };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousStatus) {
        utils.post.getBookmarkStatus.setData(
          { postId: newTodo.postId, userId: newTodo.userId },
          context.previousStatus
        );
      }
    },
    onSettled: (data, error, variables) => {
      utils.post.getBookmarkStatus.invalidate({
        postId: variables.postId,
        userId: variables.userId,
      });
      if (post) {
        utils.user.getProfile.invalidate({ userId: currentUser?.id });
      }
    },
  });

  const liked = likeStatus?.isLiked || false;
  const postLikesCount = likeStatus?.likesCount ?? post?.likes_count ?? 0;
  const [likeLoading, setLikeLoading] = useState(false);
  const isBookmarked = bookmarkStatus?.isBookmarked || false;
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // 查看用户资料状态
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  const handleFollow = async () => {
    if (!currentUser || !post) return;
    setIsFollowLoading(true);
    triggerHapticFeedback();

    // Optimistic update
    const previousIsFollowing = isFollowing;
    utils.user.isFollowing.setData(
      { followerId: currentUser.id, followingId: post.user.id },
      !previousIsFollowing
    );

    try {
      if (previousIsFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", post.user.id);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUser.id,
          following_id: post.user.id,
        });

        if (error) throw error;
      }

      // Invalidate to ensure consistency
      utils.user.isFollowing.invalidate({
        followerId: currentUser.id,
        followingId: post.user.id,
      });
      utils.user.getFollowStats.invalidate({ userId: post.user.id });
    } catch (err) {
      console.error("Error toggling follow:", err);
      // Revert optimistic update
      utils.user.isFollowing.setData(
        { followerId: currentUser.id, followingId: post.user.id },
        previousIsFollowing
      );
    } finally {
      setIsFollowLoading(false);
    }
  };

  const [isProfileClosing, setIsProfileClosing] = useState(false);

  // 处理查看用户资料
  const handleViewProfile = useCallback(
    (user: User) => {
      triggerHapticFeedback();
      if (onUserClick) {
        onUserClick(user);
      } else {
        setViewingUser(user);
        setIsProfileClosing(false);
      }
    },
    [onUserClick]
  );

  // 关闭用户资料面板
  const handleCloseProfile = useCallback(() => {
    setIsProfileClosing(true);
    setTimeout(() => {
      setViewingUser(null);
      setIsProfileClosing(false);
    }, 300);
  }, []);

  // 点赞/取消点赞
  const handleLikePost = async () => {
    if (!currentUser || !post) {
      onUserRequired();
      return;
    }

    setLikeLoading(true);
    triggerHapticFeedback();

    try {
      await toggleLikeMutation.mutateAsync({
        postId: post.id,
        userId: currentUser.id,
      });
    } catch (error) {
      // Error handled in mutation callbacks
    } finally {
      setLikeLoading(false);
    }
  };

  // 收藏/取消收藏
  const handleBookmarkPost = async () => {
    if (!currentUser || !post) {
      onUserRequired();
      return;
    }

    setBookmarkLoading(true);
    triggerHapticFeedback();

    try {
      await toggleBookmarkMutation.mutateAsync({
        postId: post.id,
        userId: currentUser.id,
      });
    } catch (error) {
      // Error handled in mutation callbacks
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!post) return;

    setLoading(true);
    try {
      // Determine sort order
      let orderBy = "created_at";
      let ascending = false;
      if (sortType === "hot") {
        orderBy = "likes_count";
      } else if (sortType === "recommend") {
        orderBy = "likes_count"; // Could be more sophisticated
      }

      // Fetch top-level comments
      const { data: commentsData, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .is("parent_id", null)
        .order(orderBy, { ascending })
        .limit(50);

      if (error) throw error;

      // Fetch user info for each comment
      const commentsWithReplies: CommentWithUser[] = [];
      for (const comment of commentsData || []) {
        // Get user
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", comment.user_id)
          .single();

        // Get reply_to_user if exists
        let replyToUser = null;
        if (comment.reply_to_user_id) {
          const { data: replyUser } = await supabase
            .from("users")
            .select("*")
            .eq("id", comment.reply_to_user_id)
            .single();
          replyToUser = replyUser;
        }

        // Fetch replies
        const { data: repliesData } = await supabase
          .from("comments")
          .select("*")
          .eq("parent_id", comment.id)
          .order("created_at", { ascending: true })
          .limit(10);

        // Get user info for replies
        const replies: CommentWithUser[] = [];
        for (const reply of repliesData || []) {
          const { data: replyUserData } = await supabase
            .from("users")
            .select("*")
            .eq("id", reply.user_id)
            .single();

          let replyToUserData = null;
          if (reply.reply_to_user_id) {
            const { data: rtu } = await supabase
              .from("users")
              .select("*")
              .eq("id", reply.reply_to_user_id)
              .single();
            replyToUserData = rtu;
          }

          replies.push({
            ...reply,
            user: replyUserData,
            reply_to_user: replyToUserData,
          });
        }

        commentsWithReplies.push({
          ...comment,
          user: userData,
          reply_to_user: replyToUser,
          replies,
        });
      }

      setComments(commentsWithReplies);
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  }, [post, sortType]);

  // Fetch user's liked comments
  const fetchLikedComments = useCallback(async () => {
    if (!currentUser || comments.length === 0) return;

    const commentIds = comments.flatMap((c) => [
      c.id,
      ...(c.replies?.map((r) => r.id) || []),
    ]);

    if (commentIds.length === 0) return;

    try {
      const { data } = await supabase
        .from("likes")
        .select("comment_id")
        .eq("user_id", currentUser.id)
        .in("comment_id", commentIds);

      if (data) {
        setLikedComments((prev) => {
          const next = new Set(prev);
          data.forEach((l) => next.add(l.comment_id!));
          return next;
        });
      }
    } catch (err) {
      console.error("Error fetching liked comments:", err);
    }
  }, [currentUser, comments]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    fetchLikedComments();
  }, [fetchLikedComments]);

  useEffect(() => {
    if (highlightCommentId && comments.length > 0) {
      let found = false;
      for (const comment of comments) {
        if (comment.id === highlightCommentId) {
          found = true;
          break;
        }
        if (comment.replies?.some((r) => r.id === highlightCommentId)) {
          setExpandedIds((prev) => new Set(prev).add(comment.id));
          found = true;
          break;
        }
      }

      if (found) {
        setTimeout(() => {
          const el = document.getElementById(`comment-${highlightCommentId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add(
              "bg-white/10",
              "transition-colors",
              "duration-1000"
            );
            setTimeout(() => el.classList.remove("bg-white/10"), 2000);
          }
        }, 300);
      }
    }
  }, [highlightCommentId, comments]);

  // Handle like
  const handleLike = async (commentId: string) => {
    if (!currentUser) {
      onUserRequired();
      return;
    }

    const isLiked = likedComments.has(commentId);

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("comment_id", commentId);

        setLikedComments((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });

        // Update local state
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, likes_count: c.likes_count - 1 }
              : {
                  ...c,
                  replies: c.replies?.map((r) =>
                    r.id === commentId
                      ? { ...r, likes_count: r.likes_count - 1 }
                      : r
                  ),
                }
          )
        );
      } else {
        // Like
        await supabase.from("likes").insert({
          user_id: currentUser.id,
          comment_id: commentId,
        });

        setLikedComments((prev) => new Set([...prev, commentId]));

        // Update local state
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, likes_count: c.likes_count + 1 }
              : {
                  ...c,
                  replies: c.replies?.map((r) =>
                    r.id === commentId
                      ? { ...r, likes_count: r.likes_count + 1 }
                      : r
                  ),
                }
          )
        );
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  // Handle delete comment
  const handleDelete = async (commentId: string) => {
    if (!confirm(t.deleteConfirm)) return;

    try {
      const { error } = await supabase
        .from("comments")
        .update({ content: t.contentDeleted })
        .eq("id", commentId);

      if (error) throw error;

      // Update local state
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, content: t.contentDeleted };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? { ...r, content: t.contentDeleted } : r
              ),
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  // Handle send comment
  const handleSend = async () => {
    if (!currentUser) {
      onUserRequired();
      return;
    }

    if (!inputText.trim() || !post) return;

    setSending(true);
    try {
      const newComment = {
        post_id: post.id,
        user_id: currentUser.id,
        content: inputText.trim(),
        parent_id: replyingTo?.parent_id || replyingTo?.id || null,
        reply_to_user_id: replyingTo?.user_id || null,
      };

      const { data, error } = await supabase
        .from("comments")
        .insert(newComment)
        .select("*")
        .single();

      if (error) throw error;

      // Build the comment with user info
      const commentWithUser: CommentWithUser = {
        ...data,
        user: currentUser,
        reply_to_user: replyingTo?.user || null,
        replies: [],
      };

      // Add to local state
      if (replyingTo) {
        // Add as reply
        const parentId = replyingTo.parent_id || replyingTo.id;
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), commentWithUser] }
              : c
          )
        );
      } else {
        // Add as top-level comment
        setComments((prev) => [commentWithUser, ...prev]);
      }

      setCommentsCount((prev) => prev + 1);

      // Create notification
      if (replyingTo && replyingTo.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          user_id: replyingTo.user_id,
          from_user_id: currentUser.id,
          type: "reply",
          post_id: post.id,
          comment_id: data.id,
        });
      }

      setInputText("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Error sending comment:", err);
    } finally {
      setSending(false);
    }
  };

  // Handle reply
  const handleReply = (comment: CommentWithUser) => {
    if (!currentUser) {
      onUserRequired();
      return;
    }
    setReplyingTo(comment);
  };

  if (!post) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop-enter cursor-pointer"
        onClick={() => {
          triggerHapticFeedback();
          onClose();
        }}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-linear-to-b from-gray-900/200 to-black/95 rounded-t-3xl max-h-[80vh] flex flex-col animate-panel-enter"
        style={{ backdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        {/* Post Content Card */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-start gap-3">
            <Avatar
              user={post.user}
              size={36}
              onClick={() => handleViewProfile(post.user)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-white/90 text-sm font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleViewProfile(post.user)}
                >
                  {post.user.nickname}
                </span>
                {post.user.gender === "male" && (
                  <Mars className="w-3 h-3 text-indigo-400" />
                )}
                {post.user.gender === "female" && (
                  <Venus className="w-3 h-3 text-pink-400" />
                )}
                {(!post.user.gender || post.user.gender === "unknown") && (
                  <CircleHelp className="w-3 h-3 text-gray-400" />
                )}
                {post.user.is_vip && (
                  <span className="px-1.5 py-0.5 bg-linear-to-r from-yellow-500 to-orange-500 text-white text-[10px] rounded font-medium">
                    VIP
                  </span>
                )}
                {post.mood && (
                  <span className="text-white/40 text-xs">#{post.mood}</span>
                )}

                <div className="ml-auto flex items-center gap-3">
                  {/* Follow Button */}
                  {currentUser && currentUser.id !== post.user.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollow();
                      }}
                      disabled={isFollowLoading}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                        isFollowing
                          ? "text-white/40 bg-white/5 hover:bg-white/10"
                          : "text-black bg-white hover:bg-white/90"
                      }`}
                    >
                      {isFollowLoading ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isFollowing ? (
                        t.following || "Following"
                      ) : (
                        t.follow || "Follow"
                      )}
                    </button>
                  )}

                  {/* Close Button */}
                  <button
                    onClick={() => {
                      triggerHapticFeedback();
                      onClose();
                    }}
                    className="text-white/60 hover:text-white transition-colors btn-icon"
                  >
                    <svg
                      className="w-5 h-5"
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
              <p className="text-white/80 text-sm leading-relaxed wrap-break-word">
                {post.content}
              </p>
              <div className="flex items-center gap-4 mt-2 text-white/40 text-xs">
                <span>{formatTimeAgo(post.created_at, language)}</span>
                <button
                  className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors btn-interactive ${
                    liked ? "text-pink-400" : "text-white/40"
                  }`}
                  onClick={() => {
                    triggerHapticFeedback();
                    handleLikePost();
                  }}
                  disabled={likeLoading}
                >
                  <svg
                    className="w-4 h-4"
                    fill={liked ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span>{postLikesCount}</span>
                </button>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 15a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h12a2 2 0 012 2v8z" />
                  </svg>
                  {commentsCount}
                </span>
                <button
                  onClick={() => {
                    triggerHapticFeedback();
                    handleBookmarkPost();
                  }}
                  disabled={bookmarkLoading}
                  className={`flex items-center gap-1 hover:text-white transition-colors btn-interactive ${
                    isBookmarked ? "text-yellow-400" : "text-white/40"
                  }`}
                >
                  <Bookmark
                    className="w-3.5 h-3.5"
                    fill={isBookmarked ? "currentColor" : "none"}
                  />
                </button>
                <button
                  onClick={() => {
                    triggerHapticFeedback();
                    setIsShareModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-white/60 hover:text-white transition-colors btn-interactive bg-white/10 hover:bg-white/20 px-2 py-1 rounded-full"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="text-xs">Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sort Tabs */}
        <div className="flex gap-4 px-5 py-3 border-b border-white/5">
          {(["recommend", "hot", "new"] as SortType[]).map((sort) => (
            <button
              key={sort}
              onClick={() => {
                triggerHapticFeedback();
                setSortType(sort);
              }}
              className={`text-sm transition-colors cursor-pointer ${
                sortType === sort
                  ? "text-white font-medium"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {t[sort]}
            </button>
          ))}
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              {t.noComments}
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                onReply={handleReply}
                onLike={handleLike}
                likedComments={likedComments}
                language={language}
                onViewProfile={handleViewProfile}
                onDelete={handleDelete}
                expandedIds={expandedIds}
              />
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 p-4">
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-white/5 rounded-lg">
              <span className="text-white/60 text-sm">
                {t.replyTo}
                {replyingTo.user.nickname}
              </span>
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  setReplyingTo(null);
                }}
                className="text-white/40 hover:text-white/60 cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
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
          )}

          <div className="flex items-center gap-3">
            {currentUser && <Avatar user={currentUser} size={36} />}

            {currentUser ? (
              <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder={t.writeComment}
                  className="flex-1 bg-transparent text-white placeholder-white/40 text-sm outline-none"
                />

                <button
                  onClick={() => {
                    triggerHapticFeedback();
                    handleSend();
                  }}
                  disabled={!inputText.trim() || sending}
                  className="text-blue-400 disabled:text-white/20 text-sm font-medium transition-colors btn-interactive"
                >
                  {t.send}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  onUserRequired();
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 rounded-full px-4 py-3 transition-colors cursor-pointer btn-interactive"
              >
                <span className="text-white/60 text-sm">
                  {t.loginToComment}
                </span>
                <svg
                  className="w-4 h-4 text-white/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User Profile Panel - Only render if onUserClick is NOT provided (legacy mode) */}
      {viewingUser && !onUserClick && (
        <UserProfilePanel
          user={viewingUser}
          currentUser={currentUser}
          onClose={handleCloseProfile}
          onPostClick={(clickedPost) => {
            // Close profile panel
            handleCloseProfile();
            // Notify parent to switch post
            if (onPostClick) {
              onPostClick({ ...clickedPost, user: viewingUser });
            }
          }}
          language={language}
          isClosing={isProfileClosing}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={post}
        language={language}
      />
    </div>
  );
}
