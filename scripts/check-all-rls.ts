import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function main() {
  try {
    // 检查所有表的 RLS 策略
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
      const policies = await sql`
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = ${table}
      `;
      console.log(`\n📋 ${table} (${policies.length} policies):`);
      for (const p of policies) {
        console.log(`   - ${p.policyname} (${p.cmd})`);
      }
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
  }
}

main();
