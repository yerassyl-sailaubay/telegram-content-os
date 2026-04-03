"use server";

import { db } from "@/server/db";
import { contentLibrary } from "@/server/db/schema";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContentItem = typeof contentLibrary.$inferSelect;

export type CreateContentInput = {
  title: string;
  content: string;
  category?: string | null;
  tags?: string[];
  isTemplate?: boolean;
};

export type UpdateContentInput = {
  id: string;
  title?: string;
  content?: string;
  category?: string | null;
  tags?: string[];
  isTemplate?: boolean;
};

export type ListContentInput = {
  page?: number;
  perPage?: number;
  category?: string | null;
  search?: string;
  sort?: "newest" | "oldest";
  tag?: string;
};

export type ListContentResult = {
  items: ContentItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export type ContentSourceType =
  | "telegram_import"
  | "idea"
  | "repurposed"
  | "external_source"
  | "ai_generated";

export type ContentStatus = "draft" | "published" | "archived" | "scheduled";

export type CreateContentItemInput = {
  title: string;
  content?: string;
  sourceType?: ContentSourceType;
  status?: ContentStatus;
  channelId?: string;
  sourceUrl?: string;
  sourceMetadata?: Record<string, unknown>;
  category?: string;
  tags?: string[];
};

const CONTENT_SOURCE_TYPES: ReadonlySet<ContentSourceType> = new Set([
  "telegram_import",
  "idea",
  "repurposed",
  "external_source",
  "ai_generated",
]);

const CONTENT_STATUSES: ReadonlySet<ContentStatus> = new Set([
  "draft",
  "published",
  "archived",
  "scheduled",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActionErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const maybeCause = (error as { cause?: unknown }).cause;
  if (maybeCause && typeof maybeCause === "object" && "message" in maybeCause) {
    const causeMessage = (maybeCause as { message?: unknown }).message;
    if (typeof causeMessage === "string" && causeMessage.trim().length > 0) {
      return `${error.message}\nCause: ${causeMessage}`;
    }
  }

  return error.message || fallback;
}

// ─── Server Actions ──────────────────────────────────────────────────────────

export async function createContent(input: CreateContentInput): Promise<ActionResult<ContentItem>> {
  try {
    const userId = await getCurrentUserId();

    if (!input.title?.trim()) {
      return { success: false, error: "Title is required" };
    }

    const [item] = await db
      .insert(contentLibrary)
      .values({
        userId,
        title: input.title.trim(),
        content: input.content ?? "",
        category: input.category?.trim() || null,
        tags: input.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
        isTemplate: input.isTemplate ?? false,
      })
      .returning();

    return { success: true, data: item };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create content";
    return { success: false, error: message };
  }
}

export async function updateContent(input: UpdateContentInput): Promise<ActionResult<ContentItem>> {
  try {
    const userId = await getCurrentUserId();

    if (!input.id) {
      return { success: false, error: "Content ID is required" };
    }

    // Verify ownership
    const existing = await db
      .select()
      .from(contentLibrary)
      .where(and(eq(contentLibrary.id, input.id), eq(contentLibrary.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: "Content not found" };
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) {
      if (!input.title.trim()) {
        return { success: false, error: "Title cannot be empty" };
      }
      updateData.title = input.title.trim();
    }
    if (input.content !== undefined) updateData.content = input.content;
    if (input.category !== undefined) updateData.category = input.category?.trim() || null;
    if (input.tags !== undefined) updateData.tags = input.tags.map((t) => t.trim()).filter(Boolean);
    if (input.isTemplate !== undefined) updateData.isTemplate = input.isTemplate;

    const [item] = await db
      .update(contentLibrary)
      .set(updateData)
      .where(and(eq(contentLibrary.id, input.id), eq(contentLibrary.userId, userId)))
      .returning();

    return { success: true, data: item };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update content";
    return { success: false, error: message };
  }
}

export async function deleteContent(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId();

    if (!id) {
      return { success: false, error: "Content ID is required" };
    }

    const deleted = await db
      .delete(contentLibrary)
      .where(and(eq(contentLibrary.id, id), eq(contentLibrary.userId, userId)))
      .returning({ id: contentLibrary.id });

    if (deleted.length === 0) {
      return { success: false, error: "Content not found" };
    }

    return { success: true, data: { id: deleted[0].id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete content";
    return { success: false, error: message };
  }
}

export async function getContent(id: string): Promise<ActionResult<ContentItem>> {
  try {
    const userId = await getCurrentUserId();

    const [item] = await db
      .select()
      .from(contentLibrary)
      .where(and(eq(contentLibrary.id, id), eq(contentLibrary.userId, userId)))
      .limit(1);

    if (!item) {
      return { success: false, error: "Content not found" };
    }

    return { success: true, data: item };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get content";
    return { success: false, error: message };
  }
}

export async function listContent(
  input: ListContentInput = {},
): Promise<ActionResult<ListContentResult>> {
  try {
    const userId = await getCurrentUserId();
    const page = Math.max(1, input.page ?? 1);
    const perPage = Math.min(100, Math.max(1, input.perPage ?? 20));
    const offset = (page - 1) * perPage;

    // Build WHERE conditions
    const conditions = [eq(contentLibrary.userId, userId)];

    if (input.category) {
      conditions.push(eq(contentLibrary.category, input.category));
    }

    if (input.tag) {
      // Filter by tag using jsonb contains
      conditions.push(sql`${contentLibrary.tags}::jsonb @> ${JSON.stringify([input.tag])}::jsonb`);
    }

    if (input.search?.trim()) {
      const searchTerm = `%${input.search.trim()}%`;
      conditions.push(
        or(ilike(contentLibrary.title, searchTerm), ilike(contentLibrary.content, searchTerm))!,
      );
    }

    const whereClause = and(...conditions);

    // Sort
    const orderBy =
      input.sort === "oldest" ? asc(contentLibrary.createdAt) : desc(contentLibrary.createdAt);

    // Count total matching items
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contentLibrary)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Fetch items
    const items = await db
      .select()
      .from(contentLibrary)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(perPage)
      .offset(offset);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list content";
    return { success: false, error: message };
  }
}

export async function searchContent(query: string): Promise<ActionResult<ContentItem[]>> {
  try {
    const userId = await getCurrentUserId();

    if (!query.trim()) {
      return { success: true, data: [] };
    }

    // Full-text search using Postgres tsvector
    const searchQuery = query
      .trim()
      .split(/\s+/)
      .map((word) => `${word}:*`)
      .join(" & ");

    const items = await db
      .select()
      .from(contentLibrary)
      .where(
        and(
          eq(contentLibrary.userId, userId),
          sql`to_tsvector('english', coalesce(${contentLibrary.title}, '') || ' ' || coalesce(${contentLibrary.content}, '')) @@ to_tsquery('english', ${searchQuery})`,
        ),
      )
      .orderBy(
        sql`ts_rank(to_tsvector('english', coalesce(${contentLibrary.title}, '') || ' ' || coalesce(${contentLibrary.content}, '')), to_tsquery('english', ${searchQuery})) DESC`,
      )
      .limit(50);

    return { success: true, data: items };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search content";
    return { success: false, error: message };
  }
}

export async function getUserCategories(): Promise<ActionResult<string[]>> {
  try {
    const userId = await getCurrentUserId();

    const result = await db
      .selectDistinct({ category: contentLibrary.category })
      .from(contentLibrary)
      .where(
        and(
          eq(contentLibrary.userId, userId),
          sql`${contentLibrary.category} IS NOT NULL AND ${contentLibrary.category} != ''`,
        ),
      )
      .orderBy(asc(contentLibrary.category));

    const categories = result.map((r) => r.category).filter((c): c is string => c !== null);

    return { success: true, data: categories };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get categories";
    return { success: false, error: message };
  }
}

export async function renameCategory(
  oldName: string,
  newName: string,
): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await getCurrentUserId();

    if (!oldName.trim() || !newName.trim()) {
      return { success: false, error: "Category names are required" };
    }

    const result = await db
      .update(contentLibrary)
      .set({ category: newName.trim(), updatedAt: new Date() })
      .where(and(eq(contentLibrary.userId, userId), eq(contentLibrary.category, oldName.trim())))
      .returning({ id: contentLibrary.id });

    return { success: true, data: { count: result.length } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rename category";
    return { success: false, error: message };
  }
}

export async function deleteCategory(name: string): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await getCurrentUserId();

    if (!name.trim()) {
      return { success: false, error: "Category name is required" };
    }

    // Set category to null for all items with this category
    const result = await db
      .update(contentLibrary)
      .set({ category: null, updatedAt: new Date() })
      .where(and(eq(contentLibrary.userId, userId), eq(contentLibrary.category, name.trim())))
      .returning({ id: contentLibrary.id });

    return { success: true, data: { count: result.length } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete category";
    return { success: false, error: message };
  }
}

// ─── Content Library Pivot Actions ───────────────────────────────────────────

const VALID_STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["published", "scheduled", "archived"],
  published: ["archived"],
  scheduled: ["draft", "published", "archived"],
  archived: ["draft"],
};

export async function createContentItem(
  input: CreateContentItemInput,
): Promise<ActionResult<ContentItem>> {
  try {
    const userId = await getCurrentUserId();

    if (!input.title?.trim()) {
      return { success: false, error: "Title is required" };
    }

    const normalizedTitle = input.title.trim();
    const normalizedContent = input.content ?? "";
    const normalizedStatus: ContentStatus =
      input.status && CONTENT_STATUSES.has(input.status) ? input.status : "draft";
    const normalizedChannelId = input.channelId?.trim() ? input.channelId.trim() : null;
    const normalizedSourceUrl = input.sourceUrl?.trim() ? input.sourceUrl.trim() : null;
    const normalizedSourceMetadata =
      input.sourceMetadata &&
      typeof input.sourceMetadata === "object" &&
      !Array.isArray(input.sourceMetadata)
        ? input.sourceMetadata
        : null;
    const normalizedCategory = input.category?.trim() || null;
    const normalizedTags = input.tags?.map((t) => t.trim()).filter(Boolean) ?? [];
    const normalizedSourceType =
      input.sourceType && CONTENT_SOURCE_TYPES.has(input.sourceType) ? input.sourceType : null;

    const [item] = await db
      .insert(contentLibrary)
      .values({
        userId,
        title: normalizedTitle,
        content: normalizedContent,
        sourceType: normalizedSourceType,
        status: normalizedStatus,
        channelId: normalizedChannelId,
        sourceUrl: normalizedSourceUrl,
        sourceMetadata: normalizedSourceMetadata,
        category: normalizedCategory,
        tags: normalizedTags,
        isTemplate: false,
      })
      .returning();

    return { success: true, data: item };
  } catch (error) {
    const message = getActionErrorMessage(error, "Failed to create content item");
    return { success: false, error: message };
  }
}

export async function updateContentStatus(
  id: string,
  status: ContentStatus,
): Promise<ActionResult<ContentItem>> {
  try {
    const userId = await getCurrentUserId();

    if (!id) {
      return { success: false, error: "Content ID is required" };
    }

    const [existing] = await db
      .select()
      .from(contentLibrary)
      .where(and(eq(contentLibrary.id, id), eq(contentLibrary.userId, userId)))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Content not found" };
    }

    const currentStatus = existing.status as ContentStatus | null;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus ?? "draft"];

    if (!allowedTransitions.includes(status)) {
      return {
        success: false,
        error: `Invalid status transition from ${currentStatus ?? "draft"} to ${status}`,
      };
    }

    const [item] = await db
      .update(contentLibrary)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(contentLibrary.id, id), eq(contentLibrary.userId, userId)))
      .returning();

    return { success: true, data: item };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update content status";
    return { success: false, error: message };
  }
}

export async function getContentByStatus(
  status: ContentStatus,
  opts?: { limit?: number; offset?: number },
): Promise<ActionResult<ContentItem[]>> {
  try {
    const userId = await getCurrentUserId();

    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    const items = await db
      .select()
      .from(contentLibrary)
      .where(and(eq(contentLibrary.userId, userId), eq(contentLibrary.status, status)))
      .orderBy(desc(contentLibrary.createdAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data: items };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get content by status";
    return { success: false, error: message };
  }
}

export async function getContentByChannel(
  channelId: string,
  opts?: { limit?: number; offset?: number },
): Promise<ActionResult<ContentItem[]>> {
  try {
    const userId = await getCurrentUserId();

    if (!channelId) {
      return { success: false, error: "Channel ID is required" };
    }

    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    const items = await db
      .select()
      .from(contentLibrary)
      .where(and(eq(contentLibrary.userId, userId), eq(contentLibrary.channelId, channelId)))
      .orderBy(desc(contentLibrary.createdAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data: items };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get content by channel";
    return { success: false, error: message };
  }
}

export async function getDraftsAndIdeas(): Promise<
  ActionResult<{ drafts: ContentItem[]; ideas: ContentItem[] }>
> {
  try {
    const userId = await getCurrentUserId();

    const [drafts, ideas] = await Promise.all([
      db
        .select()
        .from(contentLibrary)
        .where(and(eq(contentLibrary.userId, userId), eq(contentLibrary.status, "draft")))
        .orderBy(desc(contentLibrary.createdAt))
        .limit(50),
      db
        .select()
        .from(contentLibrary)
        .where(and(eq(contentLibrary.userId, userId), eq(contentLibrary.sourceType, "idea")))
        .orderBy(desc(contentLibrary.createdAt))
        .limit(50),
    ]);

    return { success: true, data: { drafts, ideas } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get drafts and ideas";
    return { success: false, error: message };
  }
}
