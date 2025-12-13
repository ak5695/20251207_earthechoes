import { useState, useEffect, useRef } from "react";
import { X, Search, User as UserIcon, FileText, Loader2 } from "lucide-react";
import { trpc } from "@/app/_trpc/client";
import { User, Post } from "@/lib/supabase";
import { PostItem } from "./PostItem";
import { triggerHapticFeedback } from "../utils/haptics";

interface ExplorePanelProps {
  currentUser: User | null;
  onClose: () => void;
  onPostClick: (post: Post & { user: User | null }) => void;
  onUserClick: (user: User) => void;
  language: "zh" | "en" | "ja";
  isClosing?: boolean;
}

export default function ExplorePanel({
  currentUser,
  onClose,
  onPostClick,
  onUserClick,
  language,
  isClosing = false,
}: ExplorePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"content" | "user">("content");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch posts
  const {
    data,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = trpc.post.getAllPosts.useInfiniteQuery(
    {
      limit: 10,
      search: debouncedSearchQuery,
      searchType: searchType,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const posts = data?.pages.flatMap((page) => page.items) || [];

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div
      className={`fixed inset-y-0 right-0 w-full md:w-[480px] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col ${
        isClosing ? "animate-slide-out-right" : "animate-slide-in-right"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h2 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-400" />
          探索
        </h2>
        <button
          onClick={() => {
            triggerHapticFeedback();
            onClose();
          }}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="p-6 pb-2 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchType === "content" ? "搜索内容..." : "搜索用户..."
            }
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex p-1 bg-white/5 rounded-lg">
          <button
            onClick={() => {
              triggerHapticFeedback();
              setSearchType("content");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
              searchType === "content"
                ? "bg-indigo-500/20 text-indigo-300 shadow-sm"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            按内容
          </button>
          <button
            onClick={() => {
              triggerHapticFeedback();
              setSearchType("user");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
              searchType === "user"
                ? "bg-indigo-500/20 text-indigo-300 shadow-sm"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            按用户
          </button>
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
        {isPending ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <PostItem
                key={post.id}
                post={post}
                currentUser={currentUser}
                onPostClick={() => onPostClick(post)}
                onUserClick={() => onUserClick(post.user)}
                showActions={false} // Explore view usually just shows content, actions can be inside or simplified
              />
            ))}
            
            {/* Loading More Indicator */}
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {isFetchingNextPage && (
                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p>没有找到相关内容</p>
          </div>
        )}
      </div>
    </div>
  );
}