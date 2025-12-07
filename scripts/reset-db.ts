import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function resetDatabase() {
  console.log("正在重置数据库...");

  try {
    // 删除所有表中的数据（按依赖关系顺序）
    await sql`TRUNCATE TABLE notifications, likes, comments, post_topics, posts, topics, users RESTART IDENTITY CASCADE`;
    console.log("✅ 已清空所有表数据");

    // 添加 language 字段（如果不存在）
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'zh'
    `;
    console.log("✅ 已添加 language 字段");

    // 确保 email 字段存在且正确
    await sql`
      ALTER TABLE users 
      ALTER COLUMN email SET NOT NULL
    `.catch(() => {
      console.log("email 字段已是 NOT NULL");
    });

    console.log("✅ 数据库重置完成！");
  } catch (error) {
    console.error("❌ 重置失败:", error);
  } finally {
    await sql.end();
  }
}

resetDatabase();
