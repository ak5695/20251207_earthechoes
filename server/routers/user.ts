import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { getAuthenticatedClient } from "../utils/supabase-authenticated";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const userRouter = router({
  getFollowStats: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { userId } = input;

      // Get followers count
      const { count: followersCount, error: followersError } =
        await supabaseAdmin
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId);

      if (followersError) throw new Error(followersError.message);

      // Get following count
      const { count: followingCount, error: followingError } =
        await supabaseAdmin
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId);

      if (followingError) throw new Error(followingError.message);

      return {
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
      };
    }),

  isFollowing: publicProcedure
    .input(z.object({ followerId: z.string(), followingId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { followerId, followingId } = input;
      const authenticatedClient = getAuthenticatedClient(ctx.headers);

      const { data, error } = await authenticatedClient
        .from("follows")
        .select("*")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        console.error("Error checking follow status:", error);
      }

      return !!data;
    }),

  getUserPosts: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        sortBy: z
          .enum(["latest", "likes", "comments", "bookmarks"])
          .default("latest"),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.number().nullish(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { userId, sortBy, limit, cursor, search } = input;
      const offset = cursor || 0;
      const client = getAuthenticatedClient(ctx.headers);

      if (sortBy === "bookmarks") {
        // For bookmarks, we still fetch a bit more to sort in memory if needed,
        // but ideally we should paginate the bookmarks table directly.
        // However, the current implementation sorts by bookmark count which is on the post...
        // Wait, the previous implementation sorted by "bookmarks(count)".
        // If we want true pagination for "most bookmarks", we need to join and order by that.
        // Supabase doesn't easily support ordering by a relation's aggregate without a view or RPC.
        // For now, let's keep the "fetch all and sort" strategy for bookmarks sort ONLY if it's small,
        // OR just paginate the "bookmarks" table if it's "my bookmarks".
        // BUT this is "getUserPosts" sorted by "bookmarks".
        // Let's stick to the previous logic but apply slice for pagination.

        let query = client
          .from("posts")
          .select("*, bookmarks(count)")
          .eq("user_id", userId);

        if (search) {
          query = query.ilike("content", `%${search}%`);
        }

        const { data, error } = await query.limit(1000); // Fetch more to sort correctly

        if (error) throw new Error(error.message);

        const sorted = (data || []).sort((a: any, b: any) => {
          const countA = a.bookmarks?.[0]?.count || 0;
          const countB = b.bookmarks?.[0]?.count || 0;
          if (countA !== countB) return countB - countA;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        const sliced = sorted.slice(offset, offset + limit);
        return {
          items: sliced,
          nextCursor:
            offset + limit < sorted.length ? offset + limit : undefined,
        };
      }

      let query = client
        .from("posts")
        .select("*, bookmarks(count)")
        .eq("user_id", userId);

      if (search) {
        query = query.ilike("content", `%${search}%`);
      }

      if (sortBy === "latest") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "likes") {
        query = query.order("likes_count", { ascending: false });
      } else if (sortBy === "comments") {
        query = query.order("comments_count", { ascending: false });
      }

      const { data, error } = await query.range(offset, offset + limit - 1);

      if (error) throw new Error(error.message);

      return {
        items: data || [],
        nextCursor: (data || []).length === limit ? offset + limit : undefined,
      };
    }),

  getProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const { userId } = input;

        // Calculate totals from ALL posts
        // Use the denormalized counts in posts table for performance
        const { data: allPostsStats, error: statsError } = await supabaseAdmin
          .from("posts")
          .select("likes_count, comments_count")
          .eq("user_id", userId);

        if (statsError) throw new Error(statsError.message);

        // Calculate total likes received (excluding self-likes)
        // We query the likes table directly to filter out self-likes
        const { count: totalLikes, error: likesError } = await supabaseAdmin
          .from("likes")
          .select("posts!inner(user_id)", { count: "exact", head: true })
          .eq("posts.user_id", userId)
          .neq("user_id", userId);

        if (likesError) {
          console.error("Error counting likes:", likesError);
        }

        let totalComments = 0;
        const totalPosts = allPostsStats?.length || 0;

        allPostsStats?.forEach((post) => {
          // totalLikes is now calculated separately
          totalComments += post.comments_count || 0;
        });

        // Calculate total bookmarks
        // Use authenticated client to respect RLS (users can only see their own bookmarks)
        const client = getAuthenticatedClient(ctx.headers);
        const { count: totalBookmarks, error: bookmarksError } = await client
          .from("bookmarks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (bookmarksError) {
          console.error("Error counting bookmarks:", bookmarksError);
        } else {
          console.log(`Total bookmarks for ${userId}: ${totalBookmarks}`);
        }

        return {
          totalLikes: totalLikes || 0,
          totalComments,
          totalBookmarks: totalBookmarks || 0,
          totalPosts,
        };
      } catch (error) {
        console.error("Error in getProfile:", error);
        // Return empty profile instead of crashing
        return {
          totalLikes: 0,
          totalComments: 0,
          totalBookmarks: 0,
          totalPosts: 0,
        };
      }
    }),

  getBookmarks: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { userId } = input;
      const authenticatedClient = getAuthenticatedClient(ctx.headers);

      const { data, error } = await authenticatedClient
        .from("bookmarks")
        .select(
          `
          created_at,
          post:posts (
            *,
            user:users (*)
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bookmarks:", error);
        throw new Error(error.message);
      }

      console.log("Fetched bookmarks raw data:", JSON.stringify(data, null, 2));

      // Filter out any null posts and transform
      return data
        .map((item) => {
          // @ts-ignore
          const postData = item.post;
          // Handle case where relation returns array
          const post = Array.isArray(postData) ? postData[0] : postData;

          if (!post) return null;

          return {
            ...post,
            bookmarkedAt: item.created_at,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }),

  getFollowers: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const { userId } = input;
      const { data, error } = await supabaseAdmin
        .from("follows")
        .select(
          `
          follower:users!follower_id (*)
        `
        )
        .eq("following_id", userId);

      if (error) throw new Error(error.message);

      return data.map((item) => item.follower);
    }),

  getFollowing: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const { userId } = input;
      const { data, error } = await supabaseAdmin
        .from("follows")
        .select(
          `
          following:users!following_id (*)
        `
        )
        .eq("follower_id", userId);

      if (error) throw new Error(error.message);

      return data.map((item) => item.following);
    }),

  getReceivedLikes: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const { userId } = input;

        const { data: posts } = await supabaseAdmin
          .from("posts")
          .select("id")
          .eq("user_id", userId);

        if (!posts || posts.length === 0) return [];

        const postIds = posts.map((p) => p.id);

        const { data: likes, error: likesError } = await supabaseAdmin
          .from("likes")
          .select(
            `
            created_at,
            user:users (*),
            post:posts (
              *,
              user:users (*)
            )
          `
          )
          .in("post_id", postIds)
          .order("created_at", { ascending: false })
          .limit(50); // Limit to recent 50

        if (likesError) {
          console.error("Error fetching received likes:", likesError);
          return [];
        }

        return likes;
      } catch (error) {
        console.error("Error in getReceivedLikes:", error);
        return [];
      }
    }),

  getReceivedComments: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const { userId } = input;

        const { data: posts } = await supabaseAdmin
          .from("posts")
          .select("id")
          .eq("user_id", userId);

        if (!posts || posts.length === 0) return [];

        const postIds = posts.map((p) => p.id);

        // Use explicit foreign key for user relationship to avoid ambiguity
        const { data: comments, error: commentsError } = await supabaseAdmin
          .from("comments")
          .select(
            `
            id,
            content,
            created_at,
            user:users!user_id (*),
            post:posts (
              *,
              user:users (*)
            )
          `
          )
          .in("post_id", postIds)
          // .neq("user_id", userId) // Allow seeing own comments to match total count
          .order("created_at", { ascending: false })
          .limit(50);

        if (commentsError) {
          console.error("Error fetching received comments:", commentsError);
          return [];
        }

        return comments;
      } catch (error) {
        console.error("Error in getReceivedComments:", error);
        return [];
      }
    }),

  getUnreadNotifications: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      const client = getAuthenticatedClient(ctx.headers);
      const { data } = await client
        .from("notifications")
        .select("id, type, post_id, comment_id, from_user_id, created_at")
        .eq("user_id", input.userId)
        .eq("is_read", false);

      return data || [];
    }),

  markNotificationsRead: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        type: z.enum(["like", "comment", "all"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const client = getAuthenticatedClient(ctx.headers);
      const { userId, type } = input;

      let query = client
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId);

      if (type === "like") {
        query = query.eq("type", "like");
      } else if (type === "comment") {
        query = query.in("type", ["comment", "reply"]);
      }

      await query;
      return { success: true };
    }),
});
