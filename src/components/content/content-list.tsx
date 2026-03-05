"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, FolderCog, ChevronLeft, ChevronRight } from "lucide-react";
import { ContentCard } from "./content-card";
import { ContentForm, type ContentFormData } from "./content-form";
import { CategoryManager } from "./category-manager";
import {
  createContent,
  updateContent,
  deleteContent,
  listContent,
  getUserCategories,
  renameCategory as renameCategoryAction,
  deleteCategory as deleteCategoryAction,
  type ContentItem,
  type ListContentResult,
} from "@/server/actions/content";

type ContentListProps = {
  initialData: ListContentResult;
  initialCategories: string[];
};

export function ContentList({ initialData, initialCategories }: ContentListProps) {
  const t = useTranslations("content");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [data, setData] = React.useState(initialData);
  const [categories, setCategories] = React.useState(initialCategories);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ContentItem | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<ContentItem | null>(null);

  // Filter state from URL
  const searchQuery = searchParams.get("q") ?? "";
  const categoryFilter = searchParams.get("category") ?? "";
  const sortOrder = (searchParams.get("sort") as "newest" | "oldest") ?? "newest";
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);

  // Debounced search
  const [searchInput, setSearchInput] = React.useState(searchQuery);
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function updateUrlParams(params: Record<string, string>) {
    const newParams = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    }
    // Reset page when filters change (unless we're specifically changing page)
    if (!("page" in params)) {
      newParams.delete("page");
    }
    router.push(`?${newParams.toString()}`);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      updateUrlParams({ q: value });
    }, 300);
  }

  async function refreshData() {
    setIsLoading(true);
    try {
      const [contentResult, categoriesResult] = await Promise.all([
        listContent({
          page: currentPage,
          search: searchQuery,
          category: categoryFilter || undefined,
          sort: sortOrder,
        }),
        getUserCategories(),
      ]);
      if (contentResult.success) {
        setData(contentResult.data);
      } else {
        toast.error(contentResult.error ?? tCommon("error"));
      }
      if (categoriesResult.success) {
        setCategories(categoriesResult.data);
      } else {
        toast.error(categoriesResult.error ?? tCommon("error"));
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsLoading(false);
    }
  }

  // Refresh when URL params change
  React.useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, categoryFilter, sortOrder, currentPage]);

  // ─── CRUD Handlers ───────────────────────────────────────────────────

  async function handleFormSubmit(formData: ContentFormData) {
    setIsSubmitting(true);
    try {
      // Handle category = "__none__" from Select
      const category = formData.category === "__none__" ? null : formData.category;

      if (editingItem) {
        const result = await updateContent({
          id: editingItem.id,
          title: formData.title,
          content: formData.content,
          category,
          tags: formData.tags,
          isTemplate: formData.isTemplate,
        });
        if (!result.success) {
          toast.error(result.error ?? tCommon("error"));
          return;
        }
        toast.success(t("updated"));
      } else {
        const result = await createContent({
          title: formData.title,
          content: formData.content,
          category,
          tags: formData.tags,
          isTemplate: formData.isTemplate,
        });
        if (!result.success) {
          toast.error(result.error ?? tCommon("error"));
          return;
        }
        toast.success(t("created"));
      }

      setFormOpen(false);
      setEditingItem(null);
      await refreshData();
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingItem) return;
    setIsSubmitting(true);
    try {
      const result = await deleteContent(deletingItem.id);
      if (!result.success) {
        toast.error(result.error ?? tCommon("error"));
        return;
      }
      setDeletingItem(null);
      await refreshData();
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEditClick(item: ContentItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  function handleNewClick() {
    setEditingItem(null);
    setFormOpen(true);
  }

  // ─── Category Handlers ───────────────────────────────────────────────

  async function handleCreateCategory(name: string) {
    // We "create" a category by creating a temporary content item,
    // but a cleaner approach is to just add it to the local list
    // and let it persist when content is saved with that category.
    // For now, we add it optimistically.
    setCategories((prev) => (prev.includes(name) ? prev : [...prev, name].sort()));
  }

  async function handleRenameCategory(oldName: string, newName: string) {
    try {
      const result = await renameCategoryAction(oldName, newName);
      if (result.success) {
        await refreshData();
      } else {
        toast.error(result.error ?? tCommon("error"));
      }
    } catch {
      toast.error(tCommon("error"));
    }
  }

  async function handleDeleteCategory(name: string) {
    try {
      const result = await deleteCategoryAction(name);
      if (result.success) {
        await refreshData();
      } else {
        toast.error(result.error ?? tCommon("error"));
      }
    } catch {
      toast.error(tCommon("error"));
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────

  const hasFilters = searchQuery || categoryFilter;
  const isEmpty = data.items.length === 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-8"
            />
          </div>
          <Select
            value={categoryFilter || "__all__"}
            onValueChange={(val) => updateUrlParams({ category: val === "__all__" ? "" : val })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("filterByCategory")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("filterByCategory")}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(val) => updateUrlParams({ sort: val })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("sortNewest")}</SelectItem>
              <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCategoryManagerOpen(true)}>
            <FolderCog className="mr-1 h-4 w-4" />
            {t("manageCategories")}
          </Button>
          <Button size="sm" onClick={handleNewClick}>
            <Plus className="mr-1 h-4 w-4" />
            {t("newContent")}
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-muted/30 h-[200px] animate-pulse rounded-lg border" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <p className="text-lg font-medium">
            {hasFilters ? t("noSearchResults") : t("noContent")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {hasFilters ? t("noSearchResultsDescription") : t("noContentDescription")}
          </p>
          {!hasFilters && (
            <Button className="mt-4" onClick={handleNewClick}>
              <Plus className="mr-1 h-4 w-4" />
              {t("newContent")}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>{t("itemCount", { count: data.total })}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => (
              <ContentCard key={item.id} item={item} onEdit={handleEditClick} />
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => updateUrlParams({ page: String(currentPage - 1) })}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("previousPage")}
          </Button>
          <span className="text-muted-foreground text-sm">
            {t("pageInfo", {
              page: currentPage,
              totalPages: data.totalPages,
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= data.totalPages}
            onClick={() => updateUrlParams({ page: String(currentPage + 1) })}
          >
            {t("nextPage")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <ContentForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
        categories={categories}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <CategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? tCommon("loading") : tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
