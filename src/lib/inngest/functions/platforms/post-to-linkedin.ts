/**
 * Inngest function: platform/linkedin.post
 *
 * Triggered when content should be posted to LinkedIn.
 * Handles token decryption, posting, 401 → refresh → retry,
 * and cross_posts status updates.
 *
 * Event data:
 *   - crossPostId: UUID of the cross_posts record
 *   - userId: UUID of the user
 *   - content: text content to post
 *   - imageUrl?: optional image URL to download and attach
 */

import { inngest } from "@/lib/inngest/client";
import { LinkedInApiError } from "@/lib/platforms/types";

// ---------------------------------------------------------------------------
// Event type
// ---------------------------------------------------------------------------

interface LinkedInPostEvent {
  data: {
    crossPostId: string;
    userId: string;
    content: string;
    imageUrl?: string;
  };
}

// ---------------------------------------------------------------------------
// Lazy imports — avoid eager DB/module connection at build time
// ---------------------------------------------------------------------------

async function getDb() {
  const { db } = await import("@/server/db");
  return db;
}

async function getSchema() {
  const schema = await import("@/server/db/schema");
  return schema;
}

async function getLinkedIn() {
  const linkedin = await import("@/lib/platforms/linkedin");
  return linkedin;
}

async function getDrizzleOps() {
  const { eq, and } = await import("drizzle-orm");
  return { eq, and };
}

async function getEncryption() {
  const { encrypt, decrypt } = await import("@/lib/platforms/encryption");
  return { encrypt, decrypt };
}

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

export const postToLinkedIn = inngest.createFunction(
  {
    id: "platform/post-to-linkedin",
    retries: 2,
  },
  { event: "platform/linkedin.post" },
  async ({ event, step }) => {
    const { crossPostId, userId, content, imageUrl } = (event as LinkedInPostEvent).data;

    // Step 1: Mark cross_post as processing
    await step.run("mark-processing", async () => {
      const db = await getDb();
      const { crossPosts } = await getSchema();
      const { eq } = await getDrizzleOps();
      // crossPostStatusEnum only has: draft, scheduled, posted, failed
      // Use 'scheduled' as intermediate processing state
      await db
        .update(crossPosts)
        .set({ status: "scheduled", updatedAt: new Date() })
        .where(eq(crossPosts.id, crossPostId));
    });

    // Step 2: Fetch platform connection (encrypted tokens)
    const connection = await step.run("fetch-connection", async () => {
      const db = await getDb();
      const { platformConnections } = await getSchema();
      const { eq, and } = await getDrizzleOps();

      const rows = await db
        .select()
        .from(platformConnections)
        .where(
          and(eq(platformConnections.userId, userId), eq(platformConnections.platform, "linkedin")),
        )
        .limit(1);

      if (rows.length === 0) {
        throw new Error("LinkedIn connection not found for user");
      }

      const conn = rows[0]!;
      return {
        id: conn.id,
        accessTokenEncrypted: conn.accessTokenEncrypted,
        refreshTokenEncrypted: conn.refreshTokenEncrypted,
        platformUserId: conn.platformUserId,
        tokenExpiresAt: conn.tokenExpiresAt?.toISOString() ?? null,
      };
    });

    if (!connection.accessTokenEncrypted || !connection.platformUserId) {
      // Mark as failed — missing credentials
      await step.run("mark-failed-no-creds", async () => {
        const db = await getDb();
        const { crossPosts } = await getSchema();
        const { eq } = await getDrizzleOps();

        await db
          .update(crossPosts)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(crossPosts.id, crossPostId));
      });

      return { status: "failed", reason: "Missing LinkedIn credentials" };
    }

    // Step 3: Decrypt tokens
    const tokens = await step.run("decrypt-tokens", async () => {
      const { decrypt } = await getEncryption();

      const accessToken = decrypt(connection.accessTokenEncrypted!);
      const refreshToken = connection.refreshTokenEncrypted
        ? decrypt(connection.refreshTokenEncrypted)
        : null;

      return { accessToken, refreshToken };
    });

    // Step 4: Upload image if provided
    let imageUrn: string | undefined;
    if (imageUrl) {
      imageUrn = await step.run("upload-image", async () => {
        const linkedin = await getLinkedIn();

        // Download the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();

        return linkedin.uploadImage({
          accessToken: tokens.accessToken,
          personUrn: `urn:li:person:${connection.platformUserId}`,
          imageBuffer,
        });
      });
    }

    // Step 5: Create the LinkedIn post (with 401 → refresh → retry)
    const postResult = await step.run("create-post", async () => {
      const linkedin = await getLinkedIn();
      const personUrn = `urn:li:person:${connection.platformUserId}`;

      const result = await linkedin.createPost({
        accessToken: tokens.accessToken,
        personUrn,
        content,
        imageUrn,
      });

      // If post failed with what looks like auth error, try refreshing token
      if (!result.success && result.error && tokens.refreshToken) {
        const isAuthError = result.error.includes("401") || result.error.includes("Unauthorized");

        if (isAuthError) {
          const clientId = process.env.LINKEDIN_CLIENT_ID;
          const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

          if (clientId && clientSecret) {
            try {
              // Refresh token
              const newTokens = await linkedin.refreshAccessToken({
                refreshToken: tokens.refreshToken,
                clientId,
                clientSecret,
              });

              // Update stored tokens
              const db = await getDb();
              const { platformConnections } = await getSchema();
              const { eq } = await getDrizzleOps();
              const { encrypt } = await getEncryption();

              await db
                .update(platformConnections)
                .set({
                  accessTokenEncrypted: encrypt(newTokens.accessToken),
                  refreshTokenEncrypted: encrypt(newTokens.refreshToken),
                  tokenExpiresAt: newTokens.expiresAt,
                  updatedAt: new Date(),
                })
                .where(eq(platformConnections.id, connection.id));

              // Retry post with new token
              return linkedin.createPost({
                accessToken: newTokens.accessToken,
                personUrn,
                content,
                imageUrn,
              });
            } catch (refreshError) {
              if (refreshError instanceof LinkedInApiError) {
                return {
                  success: false as const,
                  error: `Token refresh failed: ${refreshError.message}`,
                };
              }
              throw refreshError;
            }
          }
        }
      }

      return result;
    });

    // Step 6: Update cross_posts status based on result
    await step.run("update-status", async () => {
      const db = await getDb();
      const { crossPosts } = await getSchema();
      const { eq } = await getDrizzleOps();

      if (postResult.success) {
        await db
          .update(crossPosts)
          .set({
            status: "posted",
            platformPostId: postResult.platformPostId ?? null,
            postedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(crossPosts.id, crossPostId));
      } else {
        await db
          .update(crossPosts)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(crossPosts.id, crossPostId));
      }
    });

    return {
      status: postResult.success ? "posted" : "failed",
      crossPostId,
      platformPostId: postResult.platformPostId,
      error: postResult.error,
    };
  },
);
