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

  getAllPosts: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.number().nullish(),
        search: z.string().optional(),
        searchType: z.enum(["content", "user"]).default("content"),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, cursor, search, searchType } = input;
      const offset = cursor || 0;
      const client = getAuthenticatedClient(ctx.headers);

      let query = client
        .from("posts")
        .select("*, user:users(*), bookmarks(count)")
        .order("created_at", { ascending: false });

      if (search) {
        if (searchType === "content") {
          query = query.ilike("content", `%${search}%`);
        } else {
          // Supabase doesn't support filtering on joined tables directly in the top-level query easily with simple syntax
          // But we can use !inner to filter by joined table
          query = client
            .from("posts")
            .select("*, user:users!inner(*), bookmarks(count)")
            .ilike("users.nickname", `%${search}%`)
            .order("created_at", { ascending: false });
        }
      }

      const { data, error } = await query.range(offset, offset + limit - 1);

      if (error) throw new Error(error.message);

      return {
        items: data || [],
        nextCursor: (data || []).length === limit ? offset + limit : undefined,
      };
    }),

  translatePost: publicProcedure
    .input(z.object({ text: z.string(), targetLang: z.string() }))
    .mutation(async ({ input }) => {
      const { text, targetLang } = input;
      const apiKey = process.env.DEEPSEEK_API_KEY;

      if (!apiKey) {
        throw new Error("DeepSeek API key not configured");
      }

      const langMap: Record<string, string> = {
        zh: "Simplified Chinese",
        en: "English",
        ja: "Japanese",
        ko: "Korean",
        fr: "French",
        es: "Spanish",
      };

      const targetLanguageName = langMap[targetLang] || targetLang;

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content:
                  "You are a professional translator. Translate the user's text to the target language. If the text is already in the target language, return the original text. Only return the translated text, no explanations. Keep the tone and style of the original text.",
              },
              {
                role: "user",
                content: `Target Language: ${targetLanguageName}\nText: ${text}`,
              },
            ],
            temperature: 0.3,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("DeepSeek API error:", error);
        throw new Error("Translation failed");
      }

      const data = await response.json();
      return { translatedText: data.choices[0].message.content.trim() };
    }),
});
