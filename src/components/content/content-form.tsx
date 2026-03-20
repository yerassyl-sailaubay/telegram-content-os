"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContentItem } from "@/server/actions/content";

type ContentFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ContentItem | null;
  categories: string[];
  onSubmit: (data: ContentFormData) => Promise<void>;
  isSubmitting?: boolean;
};

export type ContentFormData = {
  title: string;
  content: string;
  category: string | null;
  tags: string[];
  isTemplate: boolean;
};

export function ContentForm({
  open,
  onOpenChange,
  item,
  categories,
  onSubmit,
  isSubmitting = false,
}: ContentFormProps) {
  const t = useTranslations("content");
  const tCommon = useTranslations("common");

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [category, setCategory] = React.useState<string>("");
  const [tagsInput, setTagsInput] = React.useState("");
  const [isTemplate, setIsTemplate] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("write");

  // Reset form when dialog opens/closes or item changes
  React.useEffect(() => {
    if (open) {
      if (item) {
        setTitle(item.title ?? "");
        setContent(item.content ?? "");
        setCategory(item.category ?? "");
        const tags = Array.isArray(item.tags) ? (item.tags as string[]) : [];
        setTagsInput(tags.join(", "));
        setIsTemplate(item.isTemplate ?? false);
      } else {
        setTitle("");
        setContent("");
        setCategory("");
        setTagsInput("");
        setIsTemplate(false);
      }
      setActiveTab("write");
    }
  }, [open, item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    await onSubmit({
      title,
      content,
      category: category || null,
      tags,
      isTemplate,
    });
  }

  const isEditing = Boolean(item);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? t("editContent") : t("newContent")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="content-title">{t("titleLabel")}</Label>
              <Input
                id="content-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>{t("bodyLabel")}</Label>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="write" className="flex-1">
                    {t("write")}
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex-1">
                    {t("preview")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="write" className="mt-2">
                  <Textarea
                    id="content-body"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t("bodyPlaceholder")}
                    rows={10}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="preview" className="mt-2">
                  <div className="min-h-[200px] rounded-md border p-3 text-sm">
                    {content ? (
                      <pre className="font-sans whitespace-pre-wrap">{content}</pre>
                    ) : (
                      <p className="text-muted-foreground italic">{t("bodyPlaceholder")}</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="content-category">{t("categoryLabel")}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="content-category">
                    <SelectValue placeholder={t("categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("uncategorized")}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="content-tags">{t("tagsLabel")}</Label>
                <Input
                  id="content-tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder={t("tagsPlaceholder")}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="content-template"
                checked={isTemplate}
                onChange={(e) => setIsTemplate(e.target.checked)}
                className="border-input h-4 w-4 rounded"
              />
              <Label htmlFor="content-template" className="text-sm font-normal">
                {t("templateLabel")}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? tCommon("loading") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
