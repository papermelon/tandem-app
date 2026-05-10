"use client";

import * as React from "react";
import { Check, Copy, PlaneLanding, RotateCcw, Send, Share2 } from "lucide-react";

import type { WrappedSnapshot } from "@/lib/caregiver-wrapped/types";

type Props = {
  snapshot: WrappedSnapshot;
  onShare: () => void;
  onRestart: () => void;
  onEndHandover?: () => void;
};

export function ThankYouCard({ snapshot, onRestart, onEndHandover }: Props) {
  const [copied, setCopied] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setShareUrl(window.location.href);
  }, []);

  async function copyLink() {
    try {
      const text = `${snapshot.shareCaption}\n\n${shareUrl}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers might not allow clipboard access; the prompt fallback is good enough.
      window.prompt("Copy this link", shareUrl);
    }
  }

  function tweet() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(snapshot.shareCaption)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function telegram() {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(snapshot.shareCaption)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex w-full flex-col text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Thank you</div>

      <div className="mt-8 text-balance text-4xl font-black leading-tight sm:text-5xl">
        Thank you, {snapshot.memberName}.
      </div>

      <p className="mt-6 max-w-md self-center text-balance text-base leading-relaxed text-white/85">
        You showed up. You cared. You made a difference for {snapshot.recipientName}.
        The impact you had will ripple forward. <span aria-hidden>❤️</span>
      </p>

      <div className="mx-auto mt-8 flex w-full max-w-xs flex-col items-center gap-1 text-xs text-white/60">
        <div className="h-px w-16 bg-white/30" />
        <div className="mt-2">Signed,</div>
        <div className="font-semibold text-white/80">The Tandem family</div>
      </div>

      <div className="mt-10 rounded-3xl bg-white/10 p-5 text-left">
        <div className="text-sm font-semibold uppercase tracking-wider text-white/70">Share your story</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/10 px-3 py-3 text-xs font-semibold transition-all hover:bg-white/20"
          >
            {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={tweet}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/10 px-3 py-3 text-xs font-semibold transition-all hover:bg-white/20"
          >
            <Share2 className="size-5" />
            Tweet
          </button>
          <button
            type="button"
            onClick={telegram}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/10 px-3 py-3 text-xs font-semibold transition-all hover:bg-white/20"
          >
            <Send className="size-5" />
            Telegram
          </button>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/30 px-3 py-2 text-xs font-semibold text-white/85 transition-all hover:bg-white/10"
        >
          <RotateCcw className="size-4" />
          Watch again
        </button>
      </div>

      {onEndHandover ? (
        <button
          type="button"
          onClick={onEndHandover}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm transition-all hover:bg-white/90"
        >
          <PlaneLanding className="size-4" />
          End handover
        </button>
      ) : null}
    </div>
  );
}
