"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Pencil, Trash2, Loader2, Send } from "lucide-react";
import { editTelegramPost, deleteTelegramPost } from "@/server/actions/telegram-post-edit";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  telegramMessageId: number | null;
  contentRaw: string | null;
  postedAt: Date | null;
  views: number | null;
  forwards: number | null;
}

interface Channel {
  id: string;
  telegramChatId: string;
}

interface PostActionsProps {
  post: Post;
  channel: Channel;
}

export function PostActions({ post, channel }: PostActionsProps) {
  void channel;
  const t = useTranslations("posts");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.contentRaw || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const charCount = editContent.length;
  const maxChars = 4096;

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    setIsEditing(true);
    setResult(null);

    const response = await editTelegramPost({
      postId: post.id,
      content: editContent.trim(),
      parseMode: "MarkdownV2",
    });

    if (response.success) {
      setResult({ success: true, message: t("editSuccess") });
      setTimeout(() => {
        setIsEditOpen(false);
        setResult(null);
      }, 1500);
    } else {
      setResult({ success: false, message: response.error });
    }

    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    const response = await deleteTelegramPost(post.id);

    if (response.success) {
      setIsDeleteOpen(false);
    } else {
      setResult({ success: false, message: response.error });
    }

    setIsDeleting(false);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setEditContent(post.contentRaw || "");
            setIsEditOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive h-8 w-8"
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("editPost")}</DialogTitle>
            <DialogDescription>{t("editDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("content")}</span>
                <span
                  className={cn(
                    "text-xs",
                    charCount > maxChars ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {charCount}/{maxChars}
                </span>
              </div>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[200px]"
                maxLength={maxChars}
              />
            </div>

            {result && (
              <div
                className={cn(
                  "rounded-lg p-3 text-sm",
                  result.success
                    ? "border border-green-500/50 bg-green-500/10 text-green-600"
                    : "border-destructive/50 bg-destructive/10 text-destructive border",
                )}
              >
                {result.message}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!editContent.trim() || charCount > maxChars || isEditing}
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t("saveChanges")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                t("delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
