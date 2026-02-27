"use client";

import { ThumbsUp, MessageSquare, Repeat2, Send } from "lucide-react";

type LinkedInPreviewProps = {
  content: string;
  authorName?: string;
  authorTitle?: string;
};

export function LinkedInPreview({
  content,
  authorName = "Your Name",
  authorTitle = "Your Title",
}: LinkedInPreviewProps) {
  // Parse hashtags for styling
  const renderContent = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, i) =>
      part.startsWith("#") ? (
        <span key={i} className="text-[#0a66c2] hover:underline cursor-pointer">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  return (
    <div className="rounded-lg border border-[#e0e0e0] bg-white shadow-sm max-w-[552px] font-[system-ui,-apple-system,sans-serif]">
      {/* Post Header */}
      <div className="p-3 pb-0">
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0a66c2] to-[#004182] text-white text-lg font-semibold">
            {authorName.slice(0, 1).toUpperCase()}
          </div>
          {/* Author info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#000000e6] leading-tight">
              {authorName}
            </p>
            <p className="text-xs text-[#00000099] leading-tight mt-0.5">
              {authorTitle}
            </p>
            <p className="text-xs text-[#00000099] leading-tight mt-0.5">
              Just now • 🌐
            </p>
          </div>
          {/* More button */}
          <button className="text-[#00000099] hover:text-[#000000e6] rounded-full p-1">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-sm text-[#000000e6] leading-[1.5] whitespace-pre-wrap break-words">
          {renderContent(content)}
        </p>
      </div>

      {/* Reaction counts */}
      <div className="mx-3 flex items-center justify-between border-b border-[#e0e0e0] py-1">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-0.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0a66c2] text-[8px] text-white">👍</span>
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#df704d] text-[8px] text-white">❤️</span>
          </div>
          <span className="text-xs text-[#00000099] hover:underline cursor-pointer">47</span>
        </div>
        <div className="flex gap-2 text-xs text-[#00000099]">
          <span className="hover:underline cursor-pointer">12 comments</span>
          <span className="hover:underline cursor-pointer">4 reposts</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex px-1 py-1">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageSquare, label: "Comment" },
          { icon: Repeat2, label: "Repost" },
          { icon: Send, label: "Send" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex flex-1 items-center justify-center gap-1.5 rounded py-2 text-xs font-semibold text-[#00000099] hover:bg-[#f3f2ef] hover:text-[#000000e6] transition-colors"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
