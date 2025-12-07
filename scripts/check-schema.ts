import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function checkSchema() {
  console.log("检查数据库结构...\n");

  try {
    // 检查 public.users 表结构
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `;

    console.log("Public.Users 表结构:");
    console.log("─".repeat(60));
    columns.forEach((col) => {
      console.log(
        `  ${col.column_name.padEnd(15)} ${col.data_type.padEnd(20)} ${
          col.is_nullable === "YES" ? "nullable" : "not null"
        }`
      );
    });

    console.log("\n✅ 数据库结构检查完成！");
  } catch (error) {
    console.error("❌ 检查失败:", error);
  } finally {
    await sql.end();
  }
}

checkSchema();
