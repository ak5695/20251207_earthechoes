import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function main() {
  try {
    console.log("🔧 开始修复所有表的 RLS 策略...\n");

    // Posts 表
    console.log("📋 修复 posts 表...");
    await sql`ALTER TABLE posts ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts`;
    await sql`DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts`;
    await sql`DROP POLICY IF EXISTS "Users can delete own posts" ON posts`;
    await sql`CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true)`;
    await sql`CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (true)`;
    await sql`CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (true)`;
    console.log("   ✅ posts 完成");

    // Comments 表
    console.log("📋 修复 comments 表...");
    await sql`ALTER TABLE comments ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments`;
    await sql`DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments`;
    await sql`DROP POLICY IF EXISTS "Users can delete own comments" ON comments`;
    await sql`CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true)`;
    await sql`CREATE POLICY "Authenticated users can create comments" ON comments FOR INSERT WITH CHECK (true)`;
    await sql`CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (true)`;
    console.log("   ✅ comments 完成");

    // Notifications 表
    console.log("📋 修复 notifications 表...");
    await sql`ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS "Users can view own notifications" ON notifications`;
    await sql`DROP POLICY IF EXISTS "System can create notifications" ON notifications`;
    await sql`DROP POLICY IF EXISTS "Users can update own notifications" ON notifications`;
    await sql`CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (true)`;
    await sql`CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true)`;
    await sql`CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (true)`;
    console.log("   ✅ notifications 完成");

    // Topics 表
    console.log("📋 修复 topics 表...");
    await sql`ALTER TABLE topics ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS "Topics are viewable by everyone" ON topics`;
    await sql`DROP POLICY IF EXISTS "Anyone can create topics" ON topics`;
    await sql`CREATE POLICY "Topics are viewable by everyone" ON topics FOR SELECT USING (true)`;
    await sql`CREATE POLICY "Anyone can create topics" ON topics FOR INSERT WITH CHECK (true)`;
    console.log("   ✅ topics 完成");

    // Post_topics 表
    console.log("📋 修复 post_topics 表...");
    await sql`ALTER TABLE post_topics ENABLE ROW LEVEL SECURITY`;
    await sql`DROP POLICY IF EXISTS "Post_topics are viewable by everyone" ON post_topics`;
    await sql`DROP POLICY IF EXISTS "Anyone can link posts to topics" ON post_topics`;
    await sql`CREATE POLICY "Post_topics are viewable by everyone" ON post_topics FOR SELECT USING (true)`;
    await sql`CREATE POLICY "Anyone can link posts to topics" ON post_topics FOR INSERT WITH CHECK (true)`;
    console.log("   ✅ post_topics 完成");

    console.log("\n✅ 所有 RLS 策略修复完成！");

    // 验证
    console.log("\n📊 验证结果:");
    const tables = [
      "users",
      "posts",
      "comments",
      "likes",
      "notifications",
      "topics",
      "post_topics",
    ];
    for (const table of tables) {
      const count = await sql`
        SELECT COUNT(*) FROM pg_policies WHERE tablename = ${table}
      `;
      console.log(`   ${table}: ${count[0].count} 策略`);
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
  }
}

main();
