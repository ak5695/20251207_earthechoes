import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase URL or Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const QUOTES_FILE = path.join(process.cwd(), "语录.json");

interface Quote {
  sentence: string;
  person: string;
}

// Nebula color palette from constants (approximate)
const COLORS = [
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#8b5cf6", // Violet
  "#f43f5e", // Rose
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#3b82f6", // Blue
];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

async function seed() {
  console.log("Reading quotes from:", QUOTES_FILE);
  const rawData = fs.readFileSync(QUOTES_FILE, "utf-8");
  const quotes: Quote[] = JSON.parse(rawData);

  console.log(`Found ${quotes.length} quotes.`);

  // 1. Identify unique authors
  const authors = new Set<string>();
  quotes.forEach((q) => authors.add(q.person));
  console.log(`Found ${authors.size} unique authors.`);

  // 2. Create or Get Users
  const authorToUserId = new Map<string, string>();

  for (const authorName of authors) {
    // Check if user exists by nickname (assuming nickname is unique for simplicity in this seed script,
    // though schema only says email is unique. We'll search by nickname)

    // Note: In a real app, nickname isn't unique. But for seeding famous people, we can try to find them.
    // Or we can just check if we already created them in this run.

    // Let's try to find a user with this nickname first.
    const { data: existingUsers, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", authorName)
      .limit(1);

    if (findError) {
      console.error(`Error finding user ${authorName}:`, findError);
      continue;
    }

    let userId = "";

    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id;
      // console.log(`User ${authorName} already exists: ${userId}`);
    } else {
      // Create new user
      // Generate a fake email
      const email = `quote_${Math.random()
        .toString(36)
        .substring(7)}@history.com`;

      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          email: email,
          nickname: authorName,
          avatar_url: null, // Could use a placeholder
          region: "History",
          is_vip: true, // Give them VIP status!
        })
        .select()
        .single();

      if (createError) {
        console.error(`Error creating user ${authorName}:`, createError);
        continue;
      }

      userId = newUser.id;
      console.log(`Created user ${authorName}: ${userId}`);
    }

    authorToUserId.set(authorName, userId);
  }

  // 3. Insert Posts
  let successCount = 0;
  for (const quote of quotes) {
    const userId = authorToUserId.get(quote.person);
    if (!userId) {
      console.warn(`Skipping quote by ${quote.person} (no user id)`);
      continue;
    }

    // Check if post already exists (by content) to avoid duplicates on re-run
    const { data: existingPosts } = await supabase
      .from("posts")
      .select("id")
      .eq("content", quote.sentence)
      .limit(1);

    if (existingPosts && existingPosts.length > 0) {
      // console.log(`Quote already exists: "${quote.sentence.substring(0, 20)}..."`);
      continue;
    }

    const { error: insertError } = await supabase.from("posts").insert({
      user_id: userId,
      content: quote.sentence,
      mood: "思绪",
      color: getRandomColor(),
      language: "zh",
      likes_count: Math.floor(Math.random() * 100), // Random likes
      comments_count: 0,
    });

    if (insertError) {
      console.error(`Error inserting quote: "${quote.sentence}"`, insertError);
    } else {
      successCount++;
      process.stdout.write("."); // Progress indicator
    }
  }

  console.log(`\nSuccessfully inserted ${successCount} quotes.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
