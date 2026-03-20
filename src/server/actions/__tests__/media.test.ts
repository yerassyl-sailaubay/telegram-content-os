import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isAllowedMimeType,
  isFileSizeValid,
  buildStoragePath,
  getMimeTypeCategory,
  MAX_FILE_SIZE,
} from "@/lib/storage/client";

// ─── Storage helper unit tests ───────────────────────────────────────────────

describe("storage/client helpers", () => {
  describe("isAllowedMimeType", () => {
    it("accepts valid image MIME types", () => {
      expect(isAllowedMimeType("image/jpeg")).toBe(true);
      expect(isAllowedMimeType("image/png")).toBe(true);
      expect(isAllowedMimeType("image/gif")).toBe(true);
      expect(isAllowedMimeType("image/webp")).toBe(true);
    });

    it("accepts valid video MIME types", () => {
      expect(isAllowedMimeType("video/mp4")).toBe(true);
      expect(isAllowedMimeType("video/webm")).toBe(true);
    });

    it("rejects invalid MIME types", () => {
      expect(isAllowedMimeType("application/pdf")).toBe(false);
      expect(isAllowedMimeType("text/plain")).toBe(false);
      expect(isAllowedMimeType("audio/mp3")).toBe(false);
      expect(isAllowedMimeType("image/svg+xml")).toBe(false);
      expect(isAllowedMimeType("")).toBe(false);
    });
  });

  describe("isFileSizeValid", () => {
    it("accepts valid file sizes", () => {
      expect(isFileSizeValid(1)).toBe(true);
      expect(isFileSizeValid(1024)).toBe(true);
      expect(isFileSizeValid(MAX_FILE_SIZE)).toBe(true);
    });

    it("rejects zero-byte files", () => {
      expect(isFileSizeValid(0)).toBe(false);
    });

    it("rejects files over 50MB", () => {
      expect(isFileSizeValid(MAX_FILE_SIZE + 1)).toBe(false);
    });

    it("rejects negative sizes", () => {
      expect(isFileSizeValid(-1)).toBe(false);
    });
  });

  describe("buildStoragePath", () => {
    it("includes userId and sanitized filename", () => {
      const path = buildStoragePath("user-123", "photo.jpg");
      expect(path).toMatch(/^user-123\/\d+-photo\.jpg$/);
    });

    it("sanitizes special characters in filename", () => {
      const path = buildStoragePath("user-123", "my file (1).jpg");
      expect(path).toMatch(/^user-123\/\d+-my_file__1_\.jpg$/);
    });

    it("preserves allowed characters", () => {
      const path = buildStoragePath("user-123", "test-file_2.png");
      expect(path).toMatch(/^user-123\/\d+-test-file_2\.png$/);
    });
  });

  describe("getMimeTypeCategory", () => {
    it("returns 'images' for image MIME types", () => {
      expect(getMimeTypeCategory("image/jpeg")).toBe("images");
      expect(getMimeTypeCategory("image/png")).toBe("images");
    });

    it("returns 'videos' for video MIME types", () => {
      expect(getMimeTypeCategory("video/mp4")).toBe("videos");
      expect(getMimeTypeCategory("video/webm")).toBe("videos");
    });

    it("returns 'all' for unknown MIME types", () => {
      expect(getMimeTypeCategory("application/pdf")).toBe("all");
    });
  });
});

// ─── Server action tests (mocked dependencies) ──────────────────────────────

const mockUser = { id: "user-uuid-123", email: "test@example.com" };

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
};

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

// Mock DB
const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();
const mockDbDelete = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    insert: (...args: unknown[]) => mockDbInsert(...args),
    select: (...args: unknown[]) => mockDbSelect(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
  },
}));

vi.mock("@/server/db/schema", () => ({
  mediaFiles: {
    id: "id",
    userId: "userId",
    storagePath: "storagePath",
    filename: "filename",
    mimeType: "mimeType",
    sizeBytes: "sizeBytes",
    createdAt: "createdAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ op: "eq", a, b })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
  desc: vi.fn((col) => ({ op: "desc", col })),
  inArray: vi.fn((col, vals) => ({ op: "inArray", col, vals })),
}));

describe("server actions: media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });
  });

  describe("uploadMedia", () => {
    it("returns error if no file provided", async () => {
      const { uploadMedia } = await import("@/server/actions/media");
      const formData = new FormData();

      const result = await uploadMedia(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("No file provided");
      }
    });

    it("returns error for invalid MIME type", async () => {
      const { uploadMedia } = await import("@/server/actions/media");
      const file = new File(["content"], "test.txt", {
        type: "text/plain",
      });
      const formData = new FormData();
      formData.set("file", file);

      const result = await uploadMedia(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not allowed");
      }
    });

    it("returns error for oversized file", async () => {
      const { uploadMedia } = await import("@/server/actions/media");
      // Create a mock File with a large size
      const file = new File(["x"], "big.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", {
        value: MAX_FILE_SIZE + 1,
      });
      const formData = new FormData();
      formData.set("file", file);

      const result = await uploadMedia(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("50MB");
      }
    });

    it("uploads valid file and inserts DB record", async () => {
      const { uploadMedia } = await import("@/server/actions/media");

      const mockRecord = {
        id: "media-uuid-1",
        userId: mockUser.id,
        storagePath: "user-uuid-123/123-photo.jpg",
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        thumbnailUrl: null,
        createdAt: new Date(),
      };

      // Mock storage upload
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: "user-uuid-123/123-photo.jpg" },
          error: null,
        }),
      });

      // Mock DB insert
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRecord]),
        }),
      });

      const file = new File(["image-data"], "photo.jpg", {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.set("file", file);

      const result = await uploadMedia(formData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filename).toBe("photo.jpg");
        expect(result.data.mimeType).toBe("image/jpeg");
      }
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith("media");
    });
  });

  describe("deleteMedia", () => {
    it("returns error when media not found", async () => {
      const { deleteMedia } = await import("@/server/actions/media");

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await deleteMedia("non-existent-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("deletes file from storage and DB", async () => {
      const { deleteMedia } = await import("@/server/actions/media");

      const mockRecord = {
        id: "media-uuid-1",
        userId: mockUser.id,
        storagePath: "user-uuid-123/123-photo.jpg",
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        thumbnailUrl: null,
        createdAt: new Date(),
      };

      // Mock DB select (find the record)
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRecord]),
          }),
        }),
      });

      // Mock storage delete
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Mock DB delete
      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await deleteMedia("media-uuid-1");

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith("media");
    });
  });

  describe("listMedia", () => {
    it("lists all media for current user", async () => {
      const { listMedia } = await import("@/server/actions/media");

      const mockRecords = [
        {
          id: "1",
          userId: mockUser.id,
          storagePath: "path/1.jpg",
          filename: "1.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
          thumbnailUrl: null,
          createdAt: new Date(),
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockRecords),
          }),
        }),
      });

      const result = await listMedia("all");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].filename).toBe("1.jpg");
      }
    });

    it("filters by category", async () => {
      const { listMedia } = await import("@/server/actions/media");

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await listMedia("images");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe("getMediaUrl", () => {
    it("returns error when media not found", async () => {
      const { getMediaUrl } = await import("@/server/actions/media");

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await getMediaUrl("non-existent-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("returns signed URL for media", async () => {
      const { getMediaUrl } = await import("@/server/actions/media");

      const mockRecord = {
        id: "media-uuid-1",
        userId: mockUser.id,
        storagePath: "user-uuid-123/123-photo.jpg",
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        thumbnailUrl: null,
        createdAt: new Date(),
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRecord]),
          }),
        }),
      });

      mockSupabaseClient.storage.from.mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed-url" },
          error: null,
        }),
      });

      const result = await getMediaUrl("media-uuid-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("https://example.com/signed-url");
      }
    });
  });
});
