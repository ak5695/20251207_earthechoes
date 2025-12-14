import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("Checking database connection and data counts...");

  try {
    const { count: userCount, error: userError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (userError) {
      console.error("Error checking users:", userError);
    } else {
      console.log(`Users count: ${userCount}`);
    }

    const { count: postCount, error: postError } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true });

    if (postError) {
      console.error("Error checking posts:", postError);
    } else {
      console.log(`Posts count: ${postCount}`);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

checkData();
