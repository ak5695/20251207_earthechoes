import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { users, posts } from "../db/schema";
import { eq, and } from "drizzle-orm";

// Load .env.local
config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

// Disable prefetch to avoid hanging
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function main() {
  const quotesPath = path.join(process.cwd(), "语录.json");
  if (!fs.existsSync(quotesPath)) {
    console.error("语录.json not found!");
    process.exit(1);
  }

  const quotesRaw = fs.readFileSync(quotesPath, "utf-8");
  const quotes = JSON.parse(quotesRaw);

  console.log(`Found ${quotes.length} quotes to process.`);

  let newUsers = 0;
  let newPosts = 0;
  let skippedPosts = 0;

  for (const quote of quotes) {
    const { sentence, person, gender, created_at } = quote;

    let dateObj: Date;
    try {
      // Handle BC dates or standard dates
      let dateStr = created_at;
      if (dateStr.startsWith("-")) {
        // For BC dates, just use 0001-01-01 to avoid Postgres issues with negative years/timezones
        console.warn(
          `BC date found for ${person}: ${created_at}. Using 0001-01-01.`
        );
        dateObj = new Date("0001-01-01T00:00:00Z");
      } else {
        dateObj = new Date(dateStr);
      }

      if (isNaN(dateObj.getTime())) {
        throw new Error("Invalid Date");
      }
    } catch (e) {
      console.warn(
        `Invalid date for ${person}: ${created_at}. Using default 0001-01-01.`
      );
      dateObj = new Date("0001-01-01T00:00:00Z");
    }

    // Generate a deterministic email based on the person's name
    const emailLocal = Buffer.from(person)
      .toString("base64")
      .replace(/=/g, "")
      .toLowerCase();
    const email = `quote_${emailLocal}@earthechoes.history`;

    // Check if user exists
    let userId;
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      // Update gender if it was unknown or different (optional, but good for sync)
      if (existingUsers[0].gender !== gender) {
        await db.update(users).set({ gender }).where(eq(users.id, userId));
      }
    } else {
      // Create user
      const newUser = await db
        .insert(users)
        .values({
          email,
          nickname: person,
          gender: gender || "unknown",
          createdAt: dateObj,
          updatedAt: new Date(),
          isVip: true,
          language: "zh",
          region: "History",
        })
        .returning({ id: users.id });
      userId = newUser[0].id;
      newUsers++;
      console.log(`Created user: ${person}`);
    }

    // Check if post already exists for this user with this content
    const existingPosts = await db
      .select()
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.content, sentence)))
      .limit(1);

    if (existingPosts.length === 0) {
      await db.insert(posts).values({
        userId,
        content: sentence,
        mood: "感悟", // Default mood
        language: "zh",
        createdAt: dateObj,
        color: getRandomColor(),
      });
      newPosts++;
    } else {
      skippedPosts++;
    }
  }

  console.log(`Sync complete.`);
  console.log(`New Users: ${newUsers}`);
  console.log(`New Posts: ${newPosts}`);
  console.log(`Skipped Posts (Duplicates): ${skippedPosts}`);

  await client.end();
  process.exit(0);
}

function getRandomColor() {
  const colors = [
    "#6366f1",
    "#ec4899",
    "#06b6d4",
    "#f59e0b",
    "#8b5cf6",
    "#10b981",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
