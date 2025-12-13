"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase, User, Post, Comment } from "@/lib/supabase";
import {
  X,
  Heart,
  MessageCircle,
  Trash2,
  LogOut,
  Edit2,
  Check,
  Mars,
  Venus,
  CircleHelp,
  Bookmark,
  Search,
  Globe,
} from "lucide-react";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { triggerHapticFeedback } from "../utils/haptics";
import { trpc } from "../_trpc/client";
import { PostItem } from "./PostItem";
import ShareModal from "./ShareModal";
import { translations, Language } from "../config/translations";

interface ProfilePanelProps {
  currentUser: User;
  onClose: () => void;
  onLogout: () => void;
  onPostClick: (post: Post & { user: User }) => void;
  onUpdateUser: (user: User) => void;
  language: string;
  onLanguageChange: (lang: any) => void;
  isClosing?: boolean;
  onUserClick?: (user: User) => void;
}

interface PostWithStats extends Post {
  comments: CommentWithUser[];
}

interface CommentWithUser extends Comment {
  user: User;
}

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
  onPostClick,
  onUpdateUser,
  language,
  onLanguageChange,
  isClosing = false,
  onUserClick,
}: ProfilePanelProps) {
  const t = translations[language as Language] || translations.en;
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const listRef = React.useRef<HTMLDivElement>(null);

  // tRPC
  const utils = trpc.useUtils();
  const { data: profileData, isPending: loading } =
    trpc.user.getProfile.useQuery({
      userId: currentUser.id,
    });

  const [activeTab, setActiveTab] = useState<
    "posts" | "bookmarks" | "followers" | "following" | "likes" | "comments"
  >("posts");

  // Sorting state
  const [sortOrder, setSortOrder] = useState<
    "latest" | "likes" | "comments" | "bookmarks"
  >("latest");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sharePost, setSharePost] = useState<Post | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch posts with sorting
  const {
    data: postsData,
    isPending: loadingPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.user.getUserPosts.useInfiniteQuery(
    {
      userId: currentUser.id,
      sortBy: sortOrder,
      limit: 10,
      search: debouncedSearchQuery,
    },
    {
      enabled: activeTab === "posts",
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const posts = postsData?.pages.flatMap((page) => page.items) || [];
  const totalLikes = profileData?.totalLikes || 0;
  const totalComments = profileData?.totalComments || 0;
  const totalBookmarks = profileData?.totalBookmarks || 0;

  const { data: followStats } = trpc.user.getFollowStats.useQuery({
    userId: currentUser.id,
  });
  const followersCount = followStats?.followersCount || 0;
  const followingCount = followStats?.followingCount || 0;

  // Bookmarks
  const { data: bookmarksData, isPending: loadingBookmarks } =
    trpc.user.getBookmarks.useQuery(
      { userId: currentUser.id },
      { enabled: activeTab === "bookmarks" }
    );
  const bookmarks = bookmarksData || [];

  // Followers
  const { data: followersData, isPending: loadingFollowers } =
    trpc.user.getFollowers.useQuery(
      { userId: currentUser.id },
      { enabled: activeTab === "followers" }
    );
  const followers = followersData || [];

  // Following
  const { data: followingData, isPending: loadingFollowing } =
    trpc.user.getFollowing.useQuery(
      { userId: currentUser.id },
      { enabled: activeTab === "following" }
    );
  const following = followingData || [];

  // Received Likes
  const { data: likesData, isPending: loadingLikes } =
    trpc.user.getReceivedLikes.useQuery(
      { userId: currentUser.id },
      { enabled: activeTab === "likes" }
    );
  const receivedLikes = likesData || [];

  // Received Comments
  const { data: commentsData, isPending: loadingComments } =
    trpc.user.getReceivedComments.useQuery(
      { userId: currentUser.id },
      { enabled: activeTab === "comments" }
    );
  const receivedComments = commentsData || [];

  // Unread Notifications
  const { data: unreadNotifications } =
    trpc.user.getUnreadNotifications.useQuery(
      { userId: currentUser.id },
      { refetchInterval: 5000 }
    );

  const unreadLikes = React.useMemo(() => {
    if (!unreadNotifications) return new Set<string>();
    return new Set(
      unreadNotifications
        .filter((n) => n.type === "like")
        .map((n) => `${n.post_id}-${n.from_user_id}`)
    );
  }, [unreadNotifications]);

  const unreadComments = React.useMemo(() => {
    if (!unreadNotifications) return new Set<string>();
    return new Set(
      unreadNotifications
        .filter((n) => n.type === "comment" || n.type === "reply")
        .map((n) => n.comment_id)
    );
  }, [unreadNotifications]);

  const markReadMutation = trpc.user.markNotificationsRead.useMutation({
    onSuccess: () => {
      utils.user.getUnreadNotifications.invalidate();
    },
  });

  useEffect(() => {
    if (activeTab === "likes" && unreadLikes.size > 0) {
      markReadMutation.mutate({ userId: currentUser.id, type: "like" });
    } else if (activeTab === "comments" && unreadComments.size > 0) {
      markReadMutation.mutate({ userId: currentUser.id, type: "comment" });
    }
  }, [activeTab, unreadLikes.size, unreadComments.size]);

  // Restore scroll position
  // useEffect(() => {
  //   const savedScroll = sessionStorage.getItem(
  //     `profile_panel_scroll_${activeTab}`
  //   );
  //   if (savedScroll && listRef.current) {
  //     // Small delay to ensure content is rendered
  //     setTimeout(() => {
  //       if (listRef.current) {
  //         listRef.current.scrollTop = parseInt(savedScroll);
  //       }
  //     }, 100);
  //   }
  // }, [
  //   activeTab,
  //   postsData,
  //   bookmarksData,
  //   followersData,
  //   followingData,
  //   likesData,
  //   commentsData,
  // ]);

  const handleSaveScroll = () => {
    // if (listRef.current) {
    //   sessionStorage.setItem(
    //     `profile_panel_scroll_${activeTab}`,
    //     listRef.current.scrollTop.toString()
    //   );
    // }
  };

  // // Debug bookmarks
  // useEffect(() => {
  //   if (activeTab === "bookmarks") {
  //     console.log("Bookmarks Debug:", {
  //       totalBookmarks: profileData?.totalBookmarks,
  //       fetchedCount: bookmarks.length,
  //       bookmarks,
  //     });
  //   }
  // }, [activeTab, bookmarks, profileData]);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState(currentUser.nickname);
  const [editRegion, setEditRegion] = useState(currentUser.region || "");
  const [editGender, setEditGender] = useState(currentUser.gender || "unknown");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProfile = async () => {
    if (!editNickname.trim()) return;

    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          nickname: editNickname.trim(),
          region: editRegion.trim() || null,
          gender: editGender,
        })
        .eq("id", currentUser.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        onUpdateUser(data);
        localStorage.setItem("earthechoes_user", JSON.stringify(data));
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error("Error updating profile:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));
      alert(`Failed to update profile: ${err.message || "Unknown error"}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm(t.deleteConfirm)) return;

    try {
      await supabase.from("posts").delete().eq("id", postId);
      utils.user.getProfile.invalidate({ userId: currentUser.id });
      utils.user.getUserPosts.invalidate();
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  // Edit Post State
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");

  const updatePostMutation = trpc.post.updatePost.useMutation({
    onSuccess: () => {
      utils.user.getUserPosts.invalidate();
      setEditingPost(null);
      setEditContent("");
    },
  });

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content);
  };

  const handleSavePost = () => {
    if (!editingPost || !editContent.trim()) return;
    updatePostMutation.mutate({
      postId: editingPost.id,
      content: editContent,
    });
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
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ pointerEvents: "auto" }}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer ${
          isClosing ? "animate-backdrop-exit" : "animate-backdrop-enter"
        }`}
        onClick={() => {
          console.log("ProfilePanel: Backdrop clicked");
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
          // 阻止点击面板背景时触发 Backdrop 的关闭事件
          e.stopPropagation();
        }}
      >
        {/* Header with Avatar */}
        <div className="relative pt-3 pb-0 px-2 border-b border-white/10">
          {/* Language Switcher */}
          <div className="absolute top-4 right-24 z-50">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setIsLanguageMenuOpen(!isLanguageMenuOpen);
              }}
              className="text-white/60 hover:text-white transition-colors btn-icon flex items-center justify-center"
              title="Switch Language"
            >
              <Globe className="w-5 h-5" />
              <span className="text-[9px] font-bold absolute -bottom-1 -right-1 bg-indigo-500 text-white px-1 rounded-full leading-tight">
                {language.toUpperCase()}
              </span>
            </button>

            {isLanguageMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsLanguageMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-32 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden backdrop-blur-xl z-50">
                  {Object.entries(
                    translations[language as Language]?.languageNames || {}
                  ).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => {
                        triggerHapticFeedback();
                        onLanguageChange(code);
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors ${
                        language === code
                          ? "text-indigo-400 font-medium"
                          : "text-white/80"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Logout button */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              handleLogout();
            }}
            className="absolute top-4 right-14 text-red-500 font-bold hover:text-red-400 transition-colors btn-icon"
            title={t.logout}
          >
            <LogOut className="w-5 h-5" />
          </button>

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
            <GeneratedAvatar
              seed={currentUser.nickname}
              className="w-16 h-16"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex flex-col gap-2 w-full">
                    <input
                      type="text"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-lg font-medium w-full focus:outline-none focus:border-white/40"
                      placeholder="Nickname"
                      maxLength={20}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditGender("male")}
                        className={`p-1.5 rounded ${
                          editGender === "male"
                            ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        <Mars className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditGender("female")}
                        className={`p-1.5 rounded ${
                          editGender === "female"
                            ? "bg-pink-500/20 text-pink-400 ring-1 ring-pink-500/50"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        <Venus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditGender("unknown")}
                        className={`p-1.5 rounded ${
                          editGender === "unknown"
                            ? "bg-gray-500/20 text-gray-400 ring-1 ring-gray-500/50"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        <CircleHelp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
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
                    {currentUser.gender === "male" && (
                      <Mars className="w-4 h-4 text-indigo-400" />
                    )}
                    {currentUser.gender === "female" && (
                      <Venus className="w-4 h-4 text-pink-400" />
                    )}
                    {(!currentUser.gender ||
                      currentUser.gender === "unknown") && (
                      <CircleHelp className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                )}

                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={isUpdating}
                      className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-full transition-colors btn-icon"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditNickname(currentUser.nickname);
                        setEditRegion(currentUser.region || "");
                      }}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition-colors btn-icon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditNickname(currentUser.nickname);
                      setEditRegion(currentUser.region || "");
                    }}
                    className="p-1.5 text-white/40 hover:text-white/80 transition-colors btn-icon"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}

                {currentUser.is_vip && !isEditing && (
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs rounded font-medium">
                    {t.vip}
                  </span>
                )}
              </div>

              {isEditing ? (
                <input
                  type="text"
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="mt-2 bg-white/10 border border-white/20 rounded px-2 py-1 text-white/80 text-sm w-full focus:outline-none focus:border-white/40"
                  placeholder={t.region}
                  maxLength={50}
                />
              ) : (
                currentUser.region && (
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
                )
              )}

              {!isEditing && (
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
              )}
            </div>
          </div>

          {/* Stats as Tabs */}
          <div className="flex flex-nowrap gap-0 mt-2 pb-2 justify-between">
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex flex-col items-center min-w-[50px] transition-opacity ${
                activeTab === "posts"
                  ? "opacity-100"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              <div className="text-white text-base md:text-lg font-light">
                {profileData?.totalPosts || 0}
              </div>
              <div className="text-white text-xs whitespace-nowrap">
                {t.myPosts}
              </div>
              {activeTab === "posts" && (
                <div className="w-full h-0.5 bg-white mt-1 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("bookmarks")}
              className={`flex flex-col items-center min-w-[50px] transition-opacity ${
                activeTab === "bookmarks"
                  ? "opacity-100"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              <div className="text-yellow-400 text-base md:text-lg font-light">
                {totalBookmarks}
              </div>
              <div className="text-white text-xs whitespace-nowrap">
                {t.myBookmarks}
              </div>
              {activeTab === "bookmarks" && (
                <div className="w-full h-0.5 bg-yellow-400 mt-1 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("likes")}
              className={`relative flex flex-col items-center min-w-[50px] transition-opacity ${
                activeTab === "likes"
                  ? "opacity-100"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              <div className="text-red-400 text-base md:text-lg font-light">
                {totalLikes}
              </div>
              <div className="text-white text-xs whitespace-nowrap">
                {t.totalLikes}
              </div>
              {activeTab === "likes" && (
                <div className="w-full h-0.5 bg-red-400 mt-1 rounded-full" />
              )}
              {unreadLikes.size > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full flex items-center justify-center px-1 border border-black">
                  <span className="text-[9px] font-bold text-white leading-none">
                    +{unreadLikes.size > 99 ? "99" : unreadLikes.size}
                  </span>
                </div>
              )}
            </button>

            <button
              onClick={() => setActiveTab("comments")}
              className={`relative flex flex-col items-center min-w-[50px] transition-opacity ${
                activeTab === "comments"
                  ? "opacity-100"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              <div className="text-blue-400 text-base md:text-lg font-light">
                {totalComments}
              </div>
              <div className="text-white text-xs whitespace-nowrap">
                {t.totalComments}
              </div>
              {activeTab === "comments" && (
                <div className="w-full h-0.5 bg-blue-400 mt-1 rounded-full" />
              )}
              {unreadComments.size > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full flex items-center justify-center px-1 border border-black">
                  <span className="text-[9px] font-bold text-white leading-none">
                    +{unreadComments.size > 99 ? "99" : unreadComments.size}
                  </span>
                </div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("followers")}
              className={`flex flex-col items-center min-w-[50px] transition-opacity ${
                activeTab === "followers"
                  ? "opacity-100"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              <div className="text-white text-base md:text-lg font-light">
                {followersCount}
              </div>
              <div className="text-white text-xs whitespace-nowrap">
                {t.followers}
              </div>
              {activeTab === "followers" && (
                <div className="w-full h-0.5 bg-white mt-1 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("following")}
              className={`flex flex-col items-center min-w-[50px] transition-opacity ${
                activeTab === "following"
                  ? "opacity-100"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              <div className="text-white text-base md:text-lg font-light">
                {followingCount}
              </div>
              <div className="text-white text-xs whitespace-nowrap">
                {t.following}
              </div>
              {activeTab === "following" && (
                <div className="w-full h-0.5 bg-white mt-1 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Content List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 pt-0 pb-2 min-h-[300px]"
        >
          {activeTab === "posts" && (
            <>
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
                <div className="text-center py-12 text-white/40">
                  {t.noPosts}
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostItem
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onPostClick={(p) => {
                        handleSaveScroll();
                        onPostClick({ ...p, user: currentUser });
                      }}
                      onDelete={handleDeletePost}
                      showDelete={true}
                      onEdit={handleEditPost}
                      showEdit={true}
                      onShare={(p) => setSharePost(p)}
                      language={language}
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
            </>
          )}

          {activeTab === "bookmarks" &&
            (loadingBookmarks ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                {t.noBookmarks}
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarks.map((post) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onPostClick={(p) => {
                      handleSaveScroll();
                      // @ts-ignore
                      onPostClick({ ...p, user: post.user || currentUser });
                    }}
                    onDelete={handleDeletePost}
                    showDelete={post.user_id === currentUser.id}
                    language={language}
                    onUserClick={(u) => {
                      handleSaveScroll();
                      onUserClick?.(u);
                    }}
                    onShare={(p) => setSharePost(p)}
                  />
                ))}
              </div>
            ))}

          {activeTab === "followers" &&
            (loadingFollowers ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : followers.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                {t.noFollowers}
              </div>
            ) : (
              <div className="space-y-4">
                {followers.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => {
                      triggerHapticFeedback();
                      handleSaveScroll();
                      onUserClick?.(user);
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden"
                      style={{ backgroundColor: generateRandomAvatar(user.id) }}
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.nickname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <GeneratedAvatar seed={user.id} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {user.nickname}
                      </div>
                      {user.region && (
                        <div className="text-white/40 text-xs">
                          {user.region}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {activeTab === "following" &&
            (loadingFollowing ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : following.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                {t.noFollowing}
              </div>
            ) : (
              <div className="space-y-4">
                {following.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => {
                      triggerHapticFeedback();
                      handleSaveScroll();
                      onUserClick?.(user);
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden"
                      style={{ backgroundColor: generateRandomAvatar(user.id) }}
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.nickname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <GeneratedAvatar seed={user.id} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {user.nickname}
                      </div>
                      {user.region && (
                        <div className="text-white/40 text-xs">
                          {user.region}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {activeTab === "likes" &&
            (loadingLikes ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : receivedLikes.length === 0 ? (
              <div className="text-center py-12 text-white/40">{t.noLikes}</div>
            ) : (
              <div className="space-y-4">
                {receivedLikes.map((like: any) => (
                  <div
                    key={like.created_at}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      unreadLikes.has(`${like.post_id}-${like.user_id}`)
                        ? "bg-white/10 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                        : "bg-white/5"
                    }`}
                  >
                    <div className="mt-1">
                      <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm">
                        <span
                          className="font-bold cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (like.user) {
                              triggerHapticFeedback();
                              handleSaveScroll();
                              onUserClick?.(like.user);
                            }
                          }}
                        >
                          {like.user?.nickname || "Someone"}
                        </span>{" "}
                        liked your post
                      </div>
                      <div className="text-white/40 text-xs mt-1">
                        {new Date(like.created_at).toLocaleDateString()}
                      </div>
                      {like.post && (
                        <div
                          className="mt-2 p-2 bg-white/5 rounded text-xs text-white/60 line-clamp-2 cursor-pointer hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHapticFeedback();
                            handleSaveScroll();
                            // @ts-ignore
                            onPostClick({ ...like.post, user: currentUser });
                          }}
                        >
                          {like.post.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {activeTab === "comments" &&
            (loadingComments ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : receivedComments.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                {t.noReceivedComments}
              </div>
            ) : (
              <div className="space-y-4">
                {receivedComments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      unreadComments.has(comment.id)
                        ? "bg-white/10 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                        : "bg-white/5"
                    }`}
                  >
                    <div className="mt-1">
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm">
                        <span
                          className="font-bold cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (comment.user) {
                              triggerHapticFeedback();
                              handleSaveScroll();
                              onUserClick?.(comment.user);
                            }
                          }}
                        >
                          {comment.user?.nickname || "Someone"}
                        </span>{" "}
                        commented
                      </div>
                      <div
                        className="text-white/80 text-sm mt-1 cursor-pointer hover:bg-white/5 p-1 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (comment.post) {
                            triggerHapticFeedback();
                            handleSaveScroll();
                            // @ts-ignore
                            onPostClick({
                              ...comment.post,
                              user: currentUser,
                              highlightCommentId: comment.id,
                            });
                          }
                        }}
                      >
                        "{comment.content}"
                      </div>
                      <div className="text-white/40 text-xs mt-1">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </div>
                      {comment.post && (
                        <div
                          className="mt-2 p-2 bg-white/5 rounded text-xs text-white/60 line-clamp-2 cursor-pointer hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHapticFeedback();
                            handleSaveScroll();
                            // @ts-ignore
                            onPostClick({
                              ...comment.post,
                              user: currentUser,
                              highlightCommentId: comment.id,
                            });
                          }}
                        >
                          Re: {comment.post.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-white text-lg font-medium mb-4">编辑思考</h3>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-white resize-none focus:outline-none focus:border-white/30 mb-4"
              placeholder="写下你的思考..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 text-white/60 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSavePost}
                disabled={!editContent.trim() || updatePostMutation.isPending}
                className="px-4 py-2 bg-white text-black hover:bg-white/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {updatePostMutation.isPending ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

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
