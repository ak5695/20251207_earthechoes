"use client";

import React, { useState, useEffect } from "react";
import { Post, User } from "@/lib/supabase";
import { Heart, MessageCircle, Trash2, Bookmark, Edit2 } from "lucide-react";
import { trpc } from "../_trpc/client";
import { triggerHapticFeedback } from "../utils/haptics";
import { GeneratedAvatar } from "@/components/generated-avatar";

interface PostItemProps {
  post: Post & { user?: User };
  currentUser: User | null;
  onPostClick: (post: Post) => void;
  onDelete?: (postId: string) => void;
  showDelete?: boolean;
  onUserClick?: (user: User) => void;
  onEdit?: (post: Post) => void;
  showEdit?: boolean;
}

export const PostItem = ({
  post,
  currentUser,
  onPostClick,
  onDelete,
  showDelete = false,
  onUserClick,
  onEdit,
  showEdit = false,
}: PostItemProps) => {
  const utils = trpc.useUtils();
  const { data: likeStatus } = trpc.post.getLikeStatus.useQuery(
    { postId: post.id, userId: currentUser?.id },
    { enabled: !!currentUser }
  );

  const isLiked = likeStatus?.isLiked || false;
  const likesCount = likeStatus?.likesCount ?? post.likes_count ?? 0;

  const { data: bookmarkStatus } = trpc.post.getBookmarkStatus.useQuery(
    { postId: post.id, userId: currentUser?.id },
    { enabled: !!currentUser }
  );
  const isBookmarked = bookmarkStatus?.isBookmarked || false;
  // Use the count from the post object if available (it comes from the join in getUserPosts)
  // @ts-ignore
  const initialBookmarksCount = post.bookmarks?.[0]?.count || 0;
  const [optimisticBookmarksCount, setOptimisticBookmarksCount] = useState(
    initialBookmarksCount
  );

  useEffect(() => {
    setOptimisticBookmarksCount(initialBookmarksCount);
  }, [initialBookmarksCount]);

  const toggleLikeMutation = trpc.post.toggleLike.useMutation({
    onMutate: async ({ postId, userId }) => {
      console.log(
        `[PostItem] Toggling like for post ${postId} by user ${userId}`
      );
      await utils.post.getLikeStatus.cancel({ postId, userId });
      const previousStatus = utils.post.getLikeStatus.getData({
        postId,
        userId,
      });

      if (previousStatus) {
        console.log(
          `[PostItem] Optimistic update. Previous status:`,
          previousStatus
        );
        utils.post.getLikeStatus.setData(
          { postId, userId },
          {
            isLiked: !previousStatus.isLiked,
            likesCount: previousStatus.isLiked
              ? previousStatus.likesCount - 1
              : previousStatus.likesCount + 1,
          }
        );
      }
      return { previousStatus };
    },
    onError: (err, newTodo, context) => {
      console.error(`[PostItem] Error toggling like:`, err);
      if (context?.previousStatus) {
        utils.post.getLikeStatus.setData(
          { postId: newTodo.postId, userId: newTodo.userId },
          context.previousStatus
        );
      }
    },
    onSettled: (data, error, variables) => {
      console.log(`[PostItem] Mutation settled. Invalidating queries.`);
      utils.post.getLikeStatus.invalidate({
        postId: post.id,
        userId: currentUser?.id,
      });
      utils.user.getProfile.invalidate({ userId: post.user_id });
    },
  });

  const toggleBookmarkMutation = trpc.post.toggleBookmark.useMutation({
    onMutate: async ({ postId, userId }) => {
      await utils.post.getBookmarkStatus.cancel({ postId, userId });
      const previousStatus = utils.post.getBookmarkStatus.getData({
        postId,
        userId,
      });

      if (previousStatus) {
        utils.post.getBookmarkStatus.setData(
          { postId, userId },
          { isBookmarked: !previousStatus.isBookmarked }
        );
        // Optimistic update for count
        setOptimisticBookmarksCount((prev: number) =>
          previousStatus.isBookmarked ? Math.max(0, prev - 1) : prev + 1
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
        // Revert count
        setOptimisticBookmarksCount(initialBookmarksCount);
      }
    },
    onSettled: () => {
      utils.post.getBookmarkStatus.invalidate({
        postId: post.id,
        userId: currentUser?.id,
      });
      utils.user.getBookmarks.invalidate({ userId: currentUser?.id });
      utils.user.getProfile.invalidate({ userId: currentUser?.id });
    },
  });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    triggerHapticFeedback();
    toggleLikeMutation.mutate({ postId: post.id, userId: currentUser.id });
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    triggerHapticFeedback();
    toggleBookmarkMutation.mutate({ postId: post.id, userId: currentUser.id });
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticFeedback();
    onPostClick(post);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticFeedback();
    onDelete?.(post.id);
  };

  return (
    <div
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
          {post.user && (
            <div
              className="flex items-center gap-2 mr-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onUserClick?.(post.user!);
              }}
            >
              <GeneratedAvatar seed={post.user.nickname} className="w-5 h-5" />
              <span className="text-white/80 text-xs font-medium">
                {post.user.nickname}
              </span>
            </div>
          )}
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
        <div className="flex items-center gap-1">
          {showEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback();
                onEdit?.(post);
              }}
              className="text-white/30 hover:text-blue-400 transition-colors btn-icon"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {showDelete && (
            <button
              onClick={handleDelete}
              className="text-white/30 hover:text-red-400 transition-colors btn-icon"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <p className="text-white/90 text-sm mb-3">{post.content}</p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs">
        <button
          className={`flex items-center gap-1 transition-colors btn-interactive ${
            isLiked ? "text-pink-400" : "text-white/40 hover:text-pink-400"
          }`}
          onClick={handleLike}
        >
          <Heart
            className="w-3.5 h-3.5"
            fill={isLiked ? "currentColor" : "none"}
          />
          {likesCount}
        </button>
        <button
          className={`flex items-center gap-1 transition-colors btn-interactive ${
            isBookmarked
              ? "text-yellow-400"
              : "text-white/40 hover:text-yellow-400"
          }`}
          onClick={handleBookmark}
        >
          <Bookmark
            className="w-3.5 h-3.5"
            fill={isBookmarked ? "currentColor" : "none"}
          />
          {optimisticBookmarksCount}
        </button>
        <button
          className="flex items-center gap-1 text-blue-400/80 hover:text-blue-300 transition-colors btn-interactive"
          onClick={handleCommentClick}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {post.comments_count || 0}
        </button>
      </div>
    </div>
  );
};
