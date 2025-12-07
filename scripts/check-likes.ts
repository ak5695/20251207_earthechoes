import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function main() {
  try {
    // 检查 likes 表结构
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'likes'
      ORDER BY ordinal_position
    `;
    console.log("Likes table columns:", columns);

    // 检查 RLS 策略
    const policies = await sql`
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'likes'
    `;
    console.log("\nLikes RLS policies:", policies);

    // 检查是否有数据
    const count = await sql`SELECT COUNT(*) FROM likes`;
    console.log("\nLikes count:", count[0].count);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
  }
}

main();
