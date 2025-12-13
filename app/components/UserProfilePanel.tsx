"use client";

import React, { useState, useEffect } from "react";
import { supabase, User, Post, Comment } from "@/lib/supabase";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { X, Mars, Venus, CircleHelp, Search } from "lucide-react";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { triggerHapticFeedback } from "../utils/haptics";
import { trpc } from "../_trpc/client";
import { PostItem } from "./PostItem";
import ShareModal from "./ShareModal";
import { translations, Language } from "../config/translations";

interface UserProfilePanelProps {
  user: User;
  currentUser: User | null;
  onClose: () => void;
  onPostClick: (post: Post) => void;
  onUserRequired?: () => void;
  language: string;
  isClosing?: boolean;
}

interface PostWithStats extends Post {
  comments_count: number;
  likes_count: number;
}

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
  currentUser,
  onClose,
  onPostClick,
  onUserRequired,
  language,
  isClosing = false,
}: UserProfilePanelProps) {
  const t = translations[language as Language] || translations.en;
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<
    "latest" | "likes" | "comments" | "bookmarks"
  >("latest");

  const utils = trpc.useUtils();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch profile data (posts + stats)
  const { data: profileData, isPending: loading } =
    trpc.user.getProfile.useQuery({
      userId: user.id,
    });

  // Fetch posts (always sorted by latest)
  const {
    data: postsData,
    isPending: loadingPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.user.getUserPosts.useInfiniteQuery(
    {
      userId: user.id,
      sortBy: sortOrder,
      search: debouncedSearchQuery,
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const posts = postsData?.pages.flatMap((page) => page.items) || [];
  const totalLikes = profileData?.totalLikes || 0;
  const totalComments = profileData?.totalComments || 0;

  const { data: followStats } = trpc.user.getFollowStats.useQuery({
    userId: user.id,
  });
  const { data: isFollowingData } = trpc.user.isFollowing.useQuery(
    { followerId: currentUser?.id || "", followingId: user.id },
    { enabled: !!currentUser }
  );

  const followersCount = followStats?.followersCount || 0;
  const followingCount = followStats?.followingCount || 0;
  const isFollowing = !!isFollowingData;

  const bgColor = generateRandomAvatar(user.id);

  // Monitor profile data updates
  useEffect(() => {
    console.log("[UserProfilePanel] profileData updated:", {
      totalLikes: profileData?.totalLikes,
    });
  }, [profileData]);

  const handleFollow = async () => {
    if (!currentUser) return;
    setIsFollowLoading(true);
    triggerHapticFeedback();

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", user.id);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUser.id,
          following_id: user.id,
        });

        if (error) throw error;
      }

      // Invalidate queries to refresh data
      utils.user.getFollowStats.invalidate({ userId: user.id });
      utils.user.isFollowing.invalidate({
        followerId: currentUser.id,
        followingId: user.id,
      });
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-2"
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
        className={`relative z-10 w-full max-w-md bg-gradient-to-b from-gray-900/200 to-black/95 rounded-2xl h-[85vh] flex flex-col overflow-hidden ${
          isClosing ? "animate-panel-exit" : "animate-panel-enter"
        }`}
        style={{ backdropFilter: "blur(20px)", pointerEvents: "auto" }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header with Avatar */}
        <div className="relative pt-3 pb-0 px-2 border-b border-white/10">
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
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
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
                {currentUser && currentUser.id !== user.id && (
                  <button
                    onClick={handleFollow}
                    disabled={isFollowLoading}
                    className={`px-4 py-1 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1 shrink-0 ${
                      isFollowing
                        ? "bg-white/10 text-white/60 hover:bg-white/20"
                        : "bg-orange-700 text-black hover:bg-white/90"
                    }`}
                  >
                    {isFollowLoading ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isFollowing ? (
                      t.following
                    ) : (
                      t.follow
                    )}
                  </button>
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

            {/* Follow Button */}
          </div>

          {/* Stats */}
          <div className="flex justify-between mx-4 my-2 px-2">
            <div className="text-center">
              <div className="text-white text-base md:text-xl font-light">
                {posts.length}
              </div>
              <div className="text-white/50 text-xs">{t.posts}</div>
            </div>
            <div className="text-center">
              <div className="text-white  text-base md:text-xl font-light">
                {followersCount}
              </div>
              <div className="text-white/50 text-xs">{t.followers}</div>
            </div>
            <div className="text-center">
              <div className="text-white  text-base md:text-xl font-light">
                {followingCount}
              </div>
              <div className="text-white/50 text-xs">{t.following}</div>
            </div>
            <div className="text-center">
              <div className="text-red-400 text-base md:text-xl font-light">
                {totalLikes}
              </div>
              <div className="text-white/50 text-xs">{t.totalLikes}</div>
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-0">
          {/* Search Input */}
          <div className="sticky -top-0.5 z-30 bg-black/50 backdrop-blur-md pt-2 pb-2 -mx-4 px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-white/10 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:bg-white/20 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sorting Controls */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1">
              {(["latest", "likes", "bookmarks", "comments"] as const).map(
                (sort) => (
                  <button
                    key={sort}
                    onClick={() => setSortOrder(sort)}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                      sortOrder === sort
                        ? "bg-white text-black font-medium"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    {sort === "latest" && t.latest}
                    {sort === "likes" && t.mostLikes}
                    {sort === "bookmarks" && t.mostBookmarks}
                    {sort === "comments" && t.mostComments}
                  </button>
                )
              )}
            </div>
          </div>

          {loading || loadingPosts ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-white/40">{t.noPosts}</div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onPostClick={onPostClick}
                  onUserRequired={onUserRequired}
                  onShare={(p) => setSharePost(p)}
                />
              ))}

              {hasNextPage && (
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full py-3 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm"
                >
                  {isFetchingNextPage ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto" />
                  ) : (
                    "Load More"
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {sharePost && (
        <ShareModal
          isOpen={true}
          post={sharePost}
          onClose={() => setSharePost(null)}
          language={language}
        />
      )}
    </div>
  );
}
