"use client";

import { Heart, MessageCircle, Repeat2, Bookmark, BarChart2, Upload } from "lucide-react";

type TwitterPreviewProps = {
  content: string;
  authorName?: string;
  authorHandle?: string;
  tweets?: string[]; // for threads
};

function TweetCard({
  text,
  authorName,
  authorHandle,
  isThread = false,
  tweetNumber,
  totalTweets,
}: {
  text: string;
  authorName: string;
  authorHandle: string;
  isThread?: boolean;
  tweetNumber?: number;
  totalTweets?: number;
}) {
  const renderText = (content: string) => {
    // Style hashtags and @mentions
    const parts = content.split(/([@#]\w+)/g);
    return parts.map((part, i) =>
      part.startsWith("#") || part.startsWith("@") ? (
        <span key={i} className="text-[#1d9bf0] hover:underline cursor-pointer">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  return (
    <div className="flex gap-3">
      {/* Left column: avatar + thread line */}
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1d9bf0] to-[#0f6cbd] text-white font-bold text-base">
          {authorName.slice(0, 1).toUpperCase()}
        </div>
        {isThread && (
          <div className="mt-1 w-0.5 flex-1 bg-[#2f3336] min-h-[20px]" />
        )}
      </div>

      {/* Right column: content */}
      <div className="flex-1 pb-3 min-w-0">
        {/* Author + timestamp */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-[15px] text-white leading-tight">
            {authorName}
          </span>
          <span className="text-[#71767b] text-[15px]">@{authorHandle}</span>
          <span className="text-[#71767b]">·</span>
          <span className="text-[#71767b] text-sm">now</span>
          {isThread && tweetNumber && totalTweets && (
            <span className="ml-auto text-xs text-[#71767b]">
              {tweetNumber}/{totalTweets}
            </span>
          )}
        </div>

        {/* Tweet text */}
        <p className="mt-1 text-[15px] text-white leading-[1.5] whitespace-pre-wrap break-words">
          {renderText(text)}
        </p>

        {/* Engagement row */}
        <div className="mt-3 flex items-center justify-between max-w-[340px] text-[#71767b]">
          {[
            { icon: MessageCircle, count: "24" },
            { icon: Repeat2, count: "8" },
            { icon: Heart, count: "142" },
            { icon: BarChart2, count: "1.2K" },
          ].map(({ icon: Icon, count }, i) => (
            <button
              key={i}
              className="flex items-center gap-1.5 text-sm hover:text-[#1d9bf0] transition-colors group"
            >
              <span className="rounded-full p-1.5 group-hover:bg-[#1d9bf0]/10 transition-colors">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[13px]">{count}</span>
            </button>
          ))}
          <div className="flex gap-1">
            <button className="rounded-full p-1.5 hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] transition-colors">
              <Bookmark className="h-4 w-4" />
            </button>
            <button className="rounded-full p-1.5 hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] transition-colors">
              <Upload className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TwitterPreview({
  content,
  authorName = "Your Name",
  authorHandle = "yourhandle",
  tweets,
}: TwitterPreviewProps) {
  const isThread = tweets && tweets.length > 1;

  return (
    <div className="rounded-2xl border border-[#2f3336] bg-[#000000] max-w-[598px] font-[system-ui,-apple-system,sans-serif] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2f3336]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span className="text-white font-bold text-base">
          {isThread ? `Thread (${tweets!.length} tweets)` : "Post preview"}
        </span>
      </div>

      {/* Tweet(s) */}
      <div className="px-4 pt-3">
        {isThread ? (
          tweets!.map((tweet, i) => (
            <TweetCard
              key={i}
              text={tweet}
              authorName={authorName}
              authorHandle={authorHandle}
              isThread={i < tweets!.length - 1}
              tweetNumber={i + 1}
              totalTweets={tweets!.length}
            />
          ))
        ) : (
          <TweetCard
            text={content}
            authorName={authorName}
            authorHandle={authorHandle}
          />
        )}
      </div>
    </div>
  );
}
