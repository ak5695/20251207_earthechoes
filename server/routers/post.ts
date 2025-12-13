import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedClient } from "../utils/supabase-authenticated";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const postRouter = router({
  toggleLike: publicProcedure
    .input(z.object({ postId: z.string(), userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { postId, userId } = input;
      const authenticatedClient = getAuthenticatedClient(ctx.headers);

      // Check if like exists
      const { data: existingLike, error: checkError } =
        await authenticatedClient
          .from("likes")
          .select("*")
          .eq("user_id", userId)
          .eq("post_id", postId)
          .maybeSingle();

      if (checkError) throw new Error(checkError.message);

      let isLiked = false;

      if (existingLike) {
        // Unlike
        const { error: deleteError } = await authenticatedClient
          .from("likes")
          .delete()
          .eq("user_id", userId)
          .eq("post_id", postId);

        if (deleteError) throw new Error(deleteError.message);
        isLiked = false;
      } else {
        // Like
        // Use upsert or ignore conflict if possible, but Supabase JS client insert doesn't have onConflict for simple inserts easily without upsert.
        // However, since we checked existingLike, race condition is the only issue.
        // We can try catch the insert error.
        const { error: insertError } = await authenticatedClient
          .from("likes")
          .insert({ user_id: userId, post_id: postId })
          .select() // Adding select sometimes helps with return data but not error handling
          .maybeSingle();

        if (insertError) {
          // Check for unique constraint violation
          if (insertError.code === "23505") {
            // duplicate key value violates unique constraint
            // It means it's already liked. We can consider this a success (idempotent) or toggle it back (unlikely intent).
            // Let's assume if they clicked like and it's already liked, they want it liked.
            isLiked = true;
          } else {
            throw new Error(insertError.message);
          }
        } else {
          isLiked = true;

          // Create notification if it's a new like
          try {
            const { data: post } = await authenticatedClient
              .from("posts")
              .select("user_id")
              .eq("id", postId)
              .single();

            if (post && post.user_id !== userId) {
              await authenticatedClient.from("notifications").insert({
                user_id: post.user_id,
                from_user_id: userId,
                type: "like",
                post_id: postId,
              });
            }
          } catch (e) {
            console.error("Failed to create notification:", e);
          }
        }
      }

      // Get updated count
      const { count, error: countError } = await authenticatedClient
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      if (countError) throw new Error(countError.message);

      // Note: We rely on database triggers to update posts.likes_count

      return { isLiked, likesCount: count || 0 };
    }),

  getLikeStatus: publicProcedure
    .input(z.object({ postId: z.string(), userId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const { postId, userId } = input;
      const authenticatedClient = getAuthenticatedClient(ctx.headers);

      let isLiked = false;

      if (userId) {
        const { data, error } = await authenticatedClient
          .from("likes")
          .select("*")
          .eq("user_id", userId)
          .eq("post_id", postId)
          .maybeSingle();

        if (!error && data) {
          isLiked = true;
        }
      }

      const { count, error: countError } = await authenticatedClient
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      return {
        isLiked,
        likesCount: count || 0,
      };
    }),

  toggleBookmark: publicProcedure
    .input(z.object({ postId: z.string(), userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { postId, userId } = input;
      const authenticatedClient = getAuthenticatedClient(ctx.headers);

      // Check if bookmark exists
      const { data: existingBookmark, error: checkError } =
        await authenticatedClient
          .from("bookmarks")
          .select("*")
          .eq("user_id", userId)
          .eq("post_id", postId)
          .maybeSingle();

      if (checkError) throw new Error(checkError.message);

      let isBookmarked = false;

      if (existingBookmark) {
        // Remove bookmark
        const { error: deleteError } = await authenticatedClient
          .from("bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("post_id", postId);

        if (deleteError) throw new Error(deleteError.message);
        isBookmarked = false;
      } else {
        // Add bookmark
        const { error: insertError } = await authenticatedClient
          .from("bookmarks")
          .insert({ user_id: userId, post_id: postId });

        if (insertError) {
          if (insertError.code === "23505") {
            isBookmarked = true;
          } else {
            throw new Error(insertError.message);
          }
        } else {
          isBookmarked = true;
        }
      }

      return { isBookmarked };
    }),

  getBookmarkStatus: publicProcedure
    .input(z.object({ postId: z.string(), userId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const { postId, userId } = input;
      const authenticatedClient = getAuthenticatedClient(ctx.headers);

      let isBookmarked = false;

      if (userId) {
        const { data, error } = await authenticatedClient
          .from("bookmarks")
          .select("*")
          .eq("user_id", userId)
          .eq("post_id", postId)
          .maybeSingle();

        if (!error && data) {
          isBookmarked = true;
        }
      }

      return { isBookmarked };
    }),

  updatePost: publicProcedure
    .input(z.object({ postId: z.string(), content: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { postId, content } = input;
      const authenticatedClient = getAuthenticatedClient(ctx.headers);

      const { error } = await authenticatedClient
        .from("posts")
        .update({ content })
        .eq("id", postId);

      if (error) throw new Error(error.message);

      return { success: true };
    }),
});
