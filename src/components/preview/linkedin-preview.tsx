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
        <span key={i} className="cursor-pointer text-[#0a66c2] hover:underline">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  return (
    <div className="max-w-[552px] rounded-lg border border-[#e0e0e0] bg-white font-[system-ui,-apple-system,sans-serif] shadow-sm">
      {/* Post Header */}
      <div className="p-3 pb-0">
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0a66c2] to-[#004182] text-lg font-semibold text-white">
            {authorName.slice(0, 1).toUpperCase()}
          </div>
          {/* Author info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-tight font-semibold text-[#000000e6]">{authorName}</p>
            <p className="mt-0.5 text-xs leading-tight text-[#00000099]">{authorTitle}</p>
            <p className="mt-0.5 text-xs leading-tight text-[#00000099]">Just now • 🌐</p>
          </div>
          {/* More button */}
          <button className="rounded-full p-1 text-[#00000099] hover:text-[#000000e6]">
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
        <p className="text-sm leading-[1.5] break-words whitespace-pre-wrap text-[#000000e6]">
          {renderContent(content)}
        </p>
      </div>

      {/* Reaction counts */}
      <div className="mx-3 flex items-center justify-between border-b border-[#e0e0e0] py-1">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-0.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0a66c2] text-[8px] text-white">
              👍
            </span>
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#df704d] text-[8px] text-white">
              ❤️
            </span>
          </div>
          <span className="cursor-pointer text-xs text-[#00000099] hover:underline">47</span>
        </div>
        <div className="flex gap-2 text-xs text-[#00000099]">
          <span className="cursor-pointer hover:underline">12 comments</span>
          <span className="cursor-pointer hover:underline">4 reposts</span>
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded py-2 text-xs font-semibold text-[#00000099] transition-colors hover:bg-[#f3f2ef] hover:text-[#000000e6]"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
