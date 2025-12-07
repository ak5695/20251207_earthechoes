import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function main() {
  try {
    // 先确保 RLS 已启用
    await sql`ALTER TABLE likes ENABLE ROW LEVEL SECURITY`;
    console.log("✅ RLS enabled on likes");

    // 删除可能存在的旧策略
    await sql`DROP POLICY IF EXISTS "Likes are viewable by everyone" ON likes`;
    await sql`DROP POLICY IF EXISTS "Users can manage own likes" ON likes`;

    // 创建策略: 所有人可查看
    await sql`
      CREATE POLICY "Likes are viewable by everyone" ON likes
      FOR SELECT USING (true)
    `;
    console.log("✅ SELECT policy created");

    // 创建策略: 所有人可管理自己的点赞
    await sql`
      CREATE POLICY "Users can manage own likes" ON likes
      FOR ALL USING (true)
    `;
    console.log("✅ ALL policy created");

    // 验证策略
    const policies = await sql`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'likes'
    `;
    console.log("\n现有策略:", policies);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
  }
}

main();
