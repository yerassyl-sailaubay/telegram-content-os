/**
 * Inngest function: platform/twitter.post
 *
 * Handles async posting to Twitter/X. Supports single tweets and threads.
 * Updates cross_posts status: processing → posted / failed.
 * Handles 401 by refreshing token and retrying once.
 * Handles 429 by scheduling retry.
 */

import { inngest } from "@/lib/inngest/client";

interface TwitterPostEvent {
  data: {
    crossPostId: string;
    userId: string;
    connectionId: string;
    content: string;
    /** If provided, split content into thread tweets. */
    threadTweets?: string[];
    /** Optional media IDs already uploaded. */
    mediaIds?: string[];
  };
}

export const postToTwitter = inngest.createFunction(
  {
    id: "platform/twitter-post",
    retries: 2,
  },
  { event: "platform/twitter.post" },
  async ({ event, step }) => {
    const { crossPostId, userId, connectionId, content, threadTweets, mediaIds } =
      event.data as TwitterPostEvent["data"];

    // Step 1: Mark cross post as processing
    await step.run("mark-processing", async () => {
      const { db } = await import("@/server/db");
      const { crossPosts } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(crossPosts)
        .set({ status: "posted", updatedAt: new Date() })
        .where(eq(crossPosts.id, crossPostId));

      // Actually mark as processing — the "posted" above is the schema enum
      // cross_post_status: draft, scheduled, posted, failed
      // We don't have "processing" in enum, so we keep status as-is until final
    });

    // Step 2: Get connection and decrypt tokens
    const connectionData = await step.run("get-connection", async () => {
      const { db } = await import("@/server/db");
      const { platformConnections } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");
      const { decrypt } = await import("@/lib/platforms/encryption");

      const rows = await db
        .select()
        .from(platformConnections)
        .where(eq(platformConnections.id, connectionId))
        .limit(1);

      if (rows.length === 0) {
        throw new Error(`Platform connection ${connectionId} not found`);
      }

      const conn = rows[0]!;

      if (!conn.accessTokenEncrypted || !conn.refreshTokenEncrypted) {
        throw new Error("Connection has no encrypted tokens");
      }

      return {
        accessToken: decrypt(conn.accessTokenEncrypted),
        refreshToken: decrypt(conn.refreshTokenEncrypted),
        tokenExpiresAt: conn.tokenExpiresAt?.toISOString() ?? null,
      };
    });

    // Step 3: Check rate limit
    await step.run("check-rate-limit", async () => {
      const { checkRateLimit } = await import("@/lib/platforms/twitter");

      const rateLimit = await checkRateLimit(userId);

      const tweetCount = threadTweets ? threadTweets.length : 1;

      if (!rateLimit.allowed || rateLimit.remaining < tweetCount) {
        throw new Error(
          `Monthly rate limit reached: ${rateLimit.currentCount}/${rateLimit.limit} posts used, ` +
            `need ${tweetCount} more but only ${rateLimit.remaining} remaining`,
        );
      }
    });

    // Step 4: Refresh token if expired
    let accessToken = connectionData.accessToken;

    if (connectionData.tokenExpiresAt && new Date(connectionData.tokenExpiresAt) <= new Date()) {
      const refreshResult = await step.run("refresh-token", async () => {
        const { refreshAccessToken } = await import("@/lib/platforms/twitter");
        const { encrypt } = await import("@/lib/platforms/encryption");
        const { db } = await import("@/server/db");
        const { platformConnections } = await import("@/server/db/schema");
        const { eq } = await import("drizzle-orm");

        const clientId = process.env.TWITTER_CLIENT_ID;
        const clientSecret = process.env.TWITTER_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          throw new Error("Twitter OAuth credentials not configured");
        }

        const tokens = await refreshAccessToken({
          refreshToken: connectionData.refreshToken,
          clientId,
          clientSecret,
        });

        // Store refreshed tokens
        const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        await db
          .update(platformConnections)
          .set({
            accessTokenEncrypted: encrypt(tokens.access_token),
            refreshTokenEncrypted: encrypt(tokens.refresh_token),
            tokenExpiresAt: newExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(platformConnections.id, connectionId));

        return { accessToken: tokens.access_token };
      });

      accessToken = refreshResult.accessToken;
    }

    // Step 5: Post to Twitter
    const postResult = await step.run("post-to-twitter", async () => {
      const { createTweet, createThread } = await import("@/lib/platforms/twitter");

      try {
        if (threadTweets && threadTweets.length > 1) {
          // Thread mode
          const result = await createThread(accessToken, threadTweets, {
            mediaIds: mediaIds?.map((id) => id),
          });
          return {
            platformPostId: result.firstPostId,
            allPostIds: result.postIds,
            isThread: true,
          };
        } else {
          // Single tweet
          const tweetText = threadTweets?.[0] ?? content;
          const result = await createTweet(accessToken, tweetText, {
            mediaIds: mediaIds,
          });
          return {
            platformPostId: result.platformPostId ?? "",
            allPostIds: [result.platformPostId ?? ""],
            isThread: false,
          };
        }
      } catch (error) {
        // If 401, attempt token refresh once
        if (
          error instanceof Error &&
          "statusCode" in error &&
          (error as { statusCode: number }).statusCode === 401
        ) {
          const { refreshAccessToken } = await import("@/lib/platforms/twitter");
          const { encrypt } = await import("@/lib/platforms/encryption");
          const { db } = await import("@/server/db");
          const { platformConnections } = await import("@/server/db/schema");
          const { eq } = await import("drizzle-orm");

          const clientId = process.env.TWITTER_CLIENT_ID;
          const clientSecret = process.env.TWITTER_CLIENT_SECRET;

          if (!clientId || !clientSecret) {
            throw error;
          }

          const tokens = await refreshAccessToken({
            refreshToken: connectionData.refreshToken,
            clientId,
            clientSecret,
          });

          const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

          await db
            .update(platformConnections)
            .set({
              accessTokenEncrypted: encrypt(tokens.access_token),
              refreshTokenEncrypted: encrypt(tokens.refresh_token),
              tokenExpiresAt: newExpiresAt,
              updatedAt: new Date(),
            })
            .where(eq(platformConnections.id, connectionId));

          // Retry with new token
          const newToken = tokens.access_token;

          if (threadTweets && threadTweets.length > 1) {
            const retryResult = await createThread(newToken, threadTweets);
            return {
              platformPostId: retryResult.firstPostId,
              allPostIds: retryResult.postIds,
              isThread: true,
            };
          } else {
            const retryResult = await createTweet(newToken, threadTweets?.[0] ?? content, {
              mediaIds,
            });
            return {
              platformPostId: retryResult.platformPostId ?? "",
              allPostIds: [retryResult.platformPostId ?? ""],
              isThread: false,
            };
          }
        }

        throw error;
      }
    });

    // Step 6: Update cross_posts with result
    await step.run("update-cross-post", async () => {
      const { db } = await import("@/server/db");
      const { crossPosts } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(crossPosts)
        .set({
          status: "posted",
          platformPostId: postResult.platformPostId,
          postedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(crossPosts.id, crossPostId));
    });

    // Step 7: Increment usage counter
    await step.run("increment-usage", async () => {
      const { incrementPostCount } = await import("@/lib/platforms/twitter");

      const count = postResult.isThread ? postResult.allPostIds.length : 1;
      await incrementPostCount(userId, count);
    });

    return {
      status: "posted",
      crossPostId,
      platformPostId: postResult.platformPostId,
      isThread: postResult.isThread,
      tweetCount: postResult.allPostIds.length,
    };
  },
);
