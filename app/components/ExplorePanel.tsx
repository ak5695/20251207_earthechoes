import { useState, useEffect, useRef, useMemo } from "react";
import { X, Search, User as UserIcon, FileText, Loader2, RefreshCw } from "lucide-react";
import { trpc } from "@/app/_trpc/client";
import { User, Post } from "@/lib/supabase";
import { PostItem } from "./PostItem";
import { triggerHapticFeedback } from "../utils/haptics";
import ShareModal from "./ShareModal";

interface ExplorePanelProps {
  currentUser: User | null;
  onClose: () => void;
  onPostClick: (post: Post & { user: User | null }) => void;
  onUserClick: (user: User) => void;
  onUserRequired?: () => void;
  language: "zh" | "en" | "ja";
  isClosing?: boolean;
}

export default function ExplorePanel({
  currentUser,
  onClose,
  onPostClick,
  onUserClick,
  onUserRequired,
  language,
  isClosing = false,
}: ExplorePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"content" | "user">("content");
  const [sharePost, setSharePost] = useState<Post | null>(null);

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
    isFetching,
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

  const posts = useMemo(() => {
    const allPosts = data?.pages.flatMap((page) => page.items) || [];
    const seen = new Set();
    return allPosts.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [data]);

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
      className={`fixed inset-y-0 right-0 w-full md:w-[480px] bg-slate-900/150 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col ${
        isClosing ? "animate-slide-out-right" : "animate-slide-in-right"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <h2 className="text-base md:text-xl font-bold text-white tracking-wider flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-400" />
          探索
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              triggerHapticFeedback();
              refetch();
            }}
            className={`p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white ${
              isFetching && !isFetchingNextPage ? "animate-spin" : ""
            }`}
            title="刷新"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
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
      </div>

      {/* Search & Filter - Compact Design */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1.5 focus-within:bg-white/10 focus-within:border-white/20 transition-all">
          <Search className="w-4 h-4 text-white/40 ml-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchType === "content" ? "搜索内容..." : "搜索用户..."
            }
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/30 min-w-0"
          />

          {/* Compact Toggle */}
          <div className="flex bg-black/20 rounded-lg p-1 shrink-0 gap-1">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setSearchType("content");
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                searchType === "content"
                  ? "bg-orange-800 text-white shadow-sm"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              <FileText className="w-3 h-3" />
              内容
            </button>
            <button
              onClick={() => {
                triggerHapticFeedback();
                setSearchType("user");
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                searchType === "user"
                  ? "bg-orange-800 text-white shadow-sm"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              <UserIcon className="w-3 h-3" />
              用户
            </button>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 custom-scrollbar">
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
                onUserRequired={onUserRequired}
                onShare={(p) => setSharePost(p)}
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
