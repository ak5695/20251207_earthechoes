import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const userId = "14f80d19-63c1-4f96-ac1f-4d41ec962608"; 
  const postId = "3a5ec0f6-61b7-4e1c-a6a6-f48c43c77ffa"; // One of the posts

  console.log(`Creating bookmark for post ${postId} by user ${userId}...`);
  
  const { error } = await supabase
    .from("bookmarks")
    .insert({ user_id: userId, post_id: postId });

  if (error) {
    console.error("Error creating bookmark:", error);
  } else {
    console.log("Bookmark created successfully.");
  }
}

run();
