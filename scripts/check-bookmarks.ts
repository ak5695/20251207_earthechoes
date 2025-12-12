import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking bookmarks table...");
  
  const { data: bookmarks, error } = await supabase
    .from("bookmarks")
    .select("*")
    .limit(10);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Bookmarks found:", bookmarks.length);
  console.log(JSON.stringify(bookmarks, null, 2));
}

test();
