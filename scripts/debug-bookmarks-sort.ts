import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const userId = "14f80d19-63c1-4f96-ac1f-4d41ec962608"; 
  
  console.log("Fetching posts with bookmarks count...");
  
  const { data, error } = await supabase
    .from("posts")
    .select("id, content, bookmarks(count)")
    .eq("user_id", userId)
    .limit(5);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Raw Data Sample:", JSON.stringify(data, null, 2));

  const sorted = (data || []).sort((a: any, b: any) => {
    // Debug the count extraction
    const countA = a.bookmarks?.[0]?.count || 0;
    const countB = b.bookmarks?.[0]?.count || 0;
    
    console.log(`Post ${a.id} count: ${countA} (Raw: ${JSON.stringify(a.bookmarks)})`);
    
    if (countA !== countB) return countB - countA;
    return 0;
  });
}

test();
