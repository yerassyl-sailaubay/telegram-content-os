/**
 * Seed script for Telegram Content OS database.
 *
 * Run with: bun src/server/db/seed.ts
 *
 * Requires DATABASE_URL to be set. Gracefully exits if not available.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(
      "⚠️  DATABASE_URL is not set. Skipping seed. Set it in .env.local to run seeds.",
    );
    process.exit(0);
  }

  const connection = postgres(url, { prepare: false });
  const db = drizzle(connection, { schema });

  console.log("🌱 Seeding database...");

  try {
    // 1. Create sample user
    const [user] = await db
      .insert(schema.users)
      .values({
        email: "demo@telegram-content-os.dev",
        name: "Demo User",
        locale: "ru",
      })
      .returning();

    console.log("  ✓ Created user:", user.id);

    // 2. Create subscription
    const [subscription] = await db
      .insert(schema.subscriptions)
      .values({
        userId: user.id,
        plan: "free",
        status: "active",
      })
      .returning();

    console.log("  ✓ Created subscription:", subscription.id);

    // 3. Create telegram channel
    const [channel] = await db
      .insert(schema.telegramChannels)
      .values({
        userId: user.id,
        telegramChatId: "-1001234567890",
        title: "Мой Tech Канал",
        username: "mytechchannel",
        description: "Канал о технологиях и разработке",
        memberCount: 1500,
      })
      .returning();

    console.log("  ✓ Created telegram channel:", channel.id);

    // 4. Create telegram posts
    const [post1] = await db
      .insert(schema.telegramPosts)
      .values([
        {
          channelId: channel.id,
          telegramMessageId: 101,
          contentRaw:
            "🚀 Новый релиз Next.js 16 — что нового?\n\nNext.js 16 принёс кучу улучшений...",
          contentParsed: {
            text: "Новый релиз Next.js 16 — что нового?",
            entities: [],
          },
          mediaUrls: [],
          views: 420,
          forwards: 15,
          reactions: { "🔥": 23, "👍": 18 },
          postedAt: new Date("2025-02-20T10:00:00Z"),
        },
        {
          channelId: channel.id,
          telegramMessageId: 102,
          contentRaw:
            "TypeScript 6.0 beta вышел!\n\nОсновные фичи:\n- Улучшенный type inference\n- Новый синтаксис для pattern matching",
          contentParsed: {
            text: "TypeScript 6.0 beta вышел!",
            entities: [],
          },
          mediaUrls: [],
          views: 350,
          forwards: 8,
          reactions: { "👍": 12, "❤️": 5 },
          postedAt: new Date("2025-02-22T14:30:00Z"),
        },
      ])
      .returning();

    console.log("  ✓ Created 2 telegram posts");

    // 5. Create platform connection
    const [platformConn] = await db
      .insert(schema.platformConnections)
      .values({
        userId: user.id,
        platform: "linkedin",
        platformUserId: "linkedin_12345",
        platformUsername: "demo-user",
      })
      .returning();

    console.log("  ✓ Created platform connection:", platformConn.id);

    // 6. Create cross post
    const [crossPost] = await db
      .insert(schema.crossPosts)
      .values({
        userId: user.id,
        sourcePostId: post1.id,
        platform: "linkedin",
        adaptedContent:
          "🚀 Next.js 16 just dropped — here's what's new!\n\nThe latest release brings major improvements...",
        originalLanguage: "ru",
        targetLanguage: "en",
        aiModelUsed: "gpt-4o",
        status: "draft",
      })
      .returning();

    console.log("  ✓ Created cross post:", crossPost.id);

    // 7. Create schedule
    const [schedule] = await db
      .insert(schema.schedules)
      .values({
        userId: user.id,
        crossPostId: crossPost.id,
        scheduledAt: new Date("2025-03-01T09:00:00Z"),
        timezone: "Europe/Moscow",
        isRecurring: false,
        status: "pending",
      })
      .returning();

    console.log("  ✓ Created schedule:", schedule.id);

    // 8. Create content library item
    const [contentItem] = await db
      .insert(schema.contentLibrary)
      .values({
        userId: user.id,
        title: "Tech Announcement Template",
        content:
          "🚀 [Product Name] [Version] is here!\n\nKey highlights:\n- [Feature 1]\n- [Feature 2]\n- [Feature 3]\n\nWhat are your thoughts?",
        category: "templates",
        tags: ["tech", "announcement", "template"],
        isTemplate: true,
      })
      .returning();

    console.log("  ✓ Created content library item:", contentItem.id);

    // 9. Create media file
    const [mediaFile] = await db
      .insert(schema.mediaFiles)
      .values({
        userId: user.id,
        storagePath: "media/demo-user/nextjs-16-banner.png",
        filename: "nextjs-16-banner.png",
        mimeType: "image/png",
        sizeBytes: 245760,
      })
      .returning();

    console.log("  ✓ Created media file:", mediaFile.id);

    // 10. Create channel profile
    const [profile] = await db
      .insert(schema.channelProfiles)
      .values({
        channelId: channel.id,
        niche: "technology",
        tone: "informative",
        topTopics: ["nextjs", "typescript", "react", "web-development"],
        language: "ru",
        generatedAt: new Date(),
      })
      .returning();

    console.log("  ✓ Created channel profile:", profile.id);

    // 11. Create usage tracking
    const [usage] = await db
      .insert(schema.usageTracking)
      .values({
        userId: user.id,
        month: "2025-02",
        crossPostsCount: 3,
        aiCallsCount: 7,
      })
      .returning();

    console.log("  ✓ Created usage tracking:", usage.id);

    // 12. Create welcome message
    const [welcomeMsg] = await db
      .insert(schema.welcomeMessages)
      .values({
        channelId: channel.id,
        content:
          "👋 Добро пожаловать в наш канал!\n\nЗдесь вы найдёте самые свежие новости из мира технологий.",
        language: "ru",
        isActive: true,
      })
      .returning();

    console.log("  ✓ Created welcome message:", welcomeMsg.id);

    console.log("\n✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
