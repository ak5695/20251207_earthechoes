// 测试 Supabase API 直接访问 likes 表
const url =
  "https://emxfpwzxdgngqcyzbetv.supabase.co/rest/v1/likes?select=*&user_id=eq.14f80d19-63c1-4f96-ac1f-4d41ec962608&post_id=eq.1e98a923-de4d-4fe0-b86a-1c8f3edbfd42";

// 从 .env.local 读取 key
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  console.log("Testing Supabase API...");
  console.log("URL:", url);
  console.log("Anon Key:", anonKey?.substring(0, 20) + "...");

  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  console.log("\nResponse status:", response.status);
  console.log(
    "Response headers:",
    Object.fromEntries(response.headers.entries())
  );

  const body = await response.text();
  console.log("\nResponse body:", body);
}

main();
