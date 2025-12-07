import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

async function applyRLS() {
  console.log("应用 RLS 策略...\n");

  try {
    // Enable RLS on users table
    await sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY`;
    console.log("✅ 已启用 users 表的 RLS");

    // Drop and recreate policies using raw SQL
    await sql.unsafe(`
      DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
      DROP POLICY IF EXISTS "Users can update own profile" ON users;
      DROP POLICY IF EXISTS "Allow anonymous user creation" ON users;
    `);
    console.log("✅ 已删除旧策略");

    // Create policies
    await sql.unsafe(`
      CREATE POLICY "Users are viewable by everyone" ON users
      FOR SELECT USING (true)
    `);
    console.log("✅ 创建 SELECT 策略");

    await sql.unsafe(`
      CREATE POLICY "Users can update own profile" ON users
      FOR UPDATE USING (auth.uid()::text = id::text)
    `);
    console.log("✅ 创建 UPDATE 策略");

    await sql.unsafe(`
      CREATE POLICY "Allow anonymous user creation" ON users
      FOR INSERT WITH CHECK (true)
    `);
    console.log("✅ 创建 INSERT 策略");

    console.log("\n✅ RLS 策略应用完成！");
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("策略已存在");
    } else {
      console.error("❌ 应用失败:", error.message);
    }
  } finally {
    await sql.end();
    process.exit(0);
  }
}

applyRLS();
