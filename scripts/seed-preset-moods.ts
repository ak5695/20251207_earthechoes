import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

// 预设的心情文本
const defaultMoods: Record<string, string[]> = {
  zh: [
    "我这一生无论如何都不会失败的，我要么经历成功，要么收获成功的背面。",
    "仅此一生,我至少要有一次，拿出生而为人的胆量和意志，踩死油门，去挑战我的极限。",
    "耳机是唯一不用扎针的输液管，发呆是唯一不用付费的宇宙遨游",
    "不要怕，提心吊胆的爱情不是爱情。",
    "我放弃了一个特别特别重要的女孩",
    "这辈子还没完，不是吗？",
    "我表演了太久了,忘记了做自己。",
    "我真的喜欢你,你明明知道的.",
    "寂静星河里的一粒尘埃 ✨",
    "月亮不睡我不睡，我是人间小美味",
    "愿你出走半生，归来仍是少年",
    "人生海海，山山而川",
  ],
  en: [
    "We are made of star-stuff, contemplating the stars ✨",
    "The wound is the place where the light enters you 💫",
    "Not all those who wander are lost 🧭",
    "To see a world in a grain of sand 🏖️",
    "What is essential is invisible to the eye 👁️",
    "The universe is under no obligation to make sense to you 🌌",
    "We are all in the gutter, but some of us are looking at the stars ⭐",
    "In the middle of difficulty lies opportunity 🌱",
    "This too shall pass 🌊",
    "Be the change you wish to see 🦋",
    "Amor fati - love your fate 💫",
    "Per aspera ad astra 🚀",
  ],
  ja: [
    "古池や蛙飛び込む水の音 🐸",
    "花鳥風月の美しさに心打たれる 🌸",
    "一期一会、この瞬間を大切に 🍃",
    "雨降って地固まる ☔",
    "月が綺麗ですね 🌙",
    "七転び八起き 💪",
    "人生は旅である 🗾",
    "静けさや岩にしみ入る蝉の声 🪨",
    "散る桜、残る桜も散る桜 🌸",
    "今を生きる 🌅",
    "宇宙の旋律に耳を澄ませて 🎵",
    "夢は逃げない、逃げるのはいつも自分だ",
  ],
  ko: [
    "별 하나에 추억과, 별 하나에 사랑 ⭐",
    "죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를 🌌",
    "내 마음은 호수요 💧",
    "꽃이 피면 달이 뜨고 🌷",
    "바람이 분다, 살아야겠다 🍃",
    "오늘 하루도 수고했어 💙",
    "지금 이 순간이 영원이다 ✨",
    "모든 것은 지나간다 🌊",
    "우주는 우리 안에 있다 🌀",
    "사랑은 움직이는 거야",
  ],
  fr: [
    "Je pense, donc je suis 💭",
    "La vie est un sommeil, l'amour en est le rêve 💫",
    "Le cœur a ses raisons que la raison ne connaît point 💕",
    "Carpe diem, cueillez dès aujourd'hui les roses de la vie 🌹",
    "Il faut cultiver notre jardin 🌻",
    "L'essentiel est invisible pour les yeux 👁️",
    "Rien ne se perd, rien ne se crée, tout se transforme ♻️",
    "Le temps passe et nous passons avec lui ⏳",
    "L'univers tout entier dans un grain de poussière 🌌",
    "On ne voit bien qu'avec le cœur",
  ],
  es: [
    "Caminante, no hay camino, se hace camino al andar 👣",
    "La vida es sueño 💭",
    "Podrán cortar todas las flores, pero no podrán detener la primavera 🌷",
    "El que lee mucho y anda mucho, ve mucho y sabe mucho 📚",
    "En un lugar de la Mancha... 🗺️",
    "Solo sé que no sé nada 🤔",
    "Hay más luz en tu cuerpo que en un medio día 🌞",
    "Volverán las oscuras golondrinas 🐦",
    "El amor es eterno mientras dura",
    "Vivir es resistir",
  ],
};

const colors = [
  "#6366f1",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
];

async function seedPresetMoods() {
  console.log("开始插入预设心情到数据库...\n");

  try {
    // 1. 首先创建一个匿名系统用户
    const anonymousEmail = "anonymous@earthechoes.app";

    // 检查匿名用户是否已存在
    let anonymousUser = await sql`
      SELECT * FROM users WHERE email = ${anonymousEmail}
    `.then((rows) => rows[0]);

    if (!anonymousUser) {
      console.log("创建匿名用户...");
      const result = await sql`
        INSERT INTO users (email, nickname, region, language)
        VALUES (${anonymousEmail}, '星云旅人', '宇宙', 'zh')
        RETURNING *
      `;
      anonymousUser = result[0];
      console.log("✅ 匿名用户创建成功:", anonymousUser.id);
    } else {
      console.log("✅ 匿名用户已存在:", anonymousUser.id);
    }

    // 2. 获取所有已存在的内容
    const existingPosts = await sql`SELECT content FROM posts`;
    const existingContents = new Set(existingPosts.map((p) => p.content));
    console.log(`数据库中已有 ${existingContents.size} 条帖子`);

    // 3. 准备要插入的数据
    const toInsert: { content: string; language: string; color: string }[] = [];

    for (const [language, moods] of Object.entries(defaultMoods)) {
      for (const content of moods) {
        if (!existingContents.has(content)) {
          const color = colors[Math.floor(Math.random() * colors.length)];
          toInsert.push({ content, language, color });
        }
      }
    }

    console.log(`需要插入 ${toInsert.length} 条新帖子`);

    // 4. 批量插入
    if (toInsert.length > 0) {
      for (const item of toInsert) {
        await sql`
          INSERT INTO posts (user_id, content, mood, color, language)
          VALUES (${anonymousUser.id}, ${item.content}, '思绪', ${item.color}, ${item.language})
        `;
      }
      console.log(`✅ 成功插入 ${toInsert.length} 条`);
    } else {
      console.log("✅ 所有预设心情已存在，无需插入");
    }

    console.log("\n✅ 完成！");
  } catch (error) {
    console.error("❌ 插入失败:", error);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

seedPresetMoods();
