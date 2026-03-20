"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus } from "lucide-react";

type CategoryManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  onCreateCategory: (name: string) => Promise<void>;
  onRenameCategory: (oldName: string, newName: string) => Promise<void>;
  onDeleteCategory: (name: string) => Promise<void>;
};

export function CategoryManager({
  open,
  onOpenChange,
  categories,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const t = useTranslations("content");

  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [editingCategory, setEditingCategory] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleCreate() {
    if (!newCategoryName.trim()) return;
    setIsLoading(true);
    try {
      await onCreateCategory(newCategoryName.trim());
      setNewCategoryName("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRename(oldName: string) {
    if (!editName.trim() || editName.trim() === oldName) {
      setEditingCategory(null);
      return;
    }
    setIsLoading(true);
    try {
      await onRenameCategory(oldName, editName.trim());
      setEditingCategory(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(name: string) {
    setIsLoading(true);
    try {
      await onDeleteCategory(name);
    } finally {
      setIsLoading(false);
    }
  }

  function startEditing(category: string) {
    setEditingCategory(category);
    setEditName(category);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("categoriesTitle")}</DialogTitle>
          <DialogDescription>{t("categoriesDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new category */}
          <div className="flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={t("categoryName")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isLoading || !newCategoryName.trim()}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("newCategory")}
            </Button>
          </div>

          {/* Category list */}
          <div className="space-y-1">
            {categories.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                {t("noCategoriesYet")}
              </p>
            ) : (
              categories.map((category) => (
                <div
                  key={category}
                  className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5"
                >
                  {editingCategory === category ? (
                    <form
                      className="flex flex-1 gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRename(category);
                      }}
                    >
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onBlur={() => handleRename(category)}
                      />
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{category}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEditing(category)}
                        disabled={isLoading}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-7 w-7"
                        onClick={() => handleDelete(category)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
