"use client";

import { useState } from "react";

type ConciergeProps = {
  onSearch: (
    query: string,
    filters: { noise: string; wifi: string; studying: string }
  ) => void;
};

export default function Concierge({ onSearch }: ConciergeProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Concierge failed");
      }

      setLastExplanation(data.explanation);
      onSearch(data.search_query, {
        noise: data.filter_noise === "unspecified" ? "" : data.filter_noise,
        wifi: data.filter_wifi === "unspecified" ? "" : data.filter_wifi,
        studying: data.filter_studying === "unspecified" ? "" : data.filter_studying,
      });
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI concierge"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-2xl shadow-lg"
      >
        🤖
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-neutral-900 dark:text-white">
          AI Concierge
        </p>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-neutral-500 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        Tell me what you need, e.g. &quot;I have a Zoom meeting&quot; or
        &quot;somewhere cozy for a rainy day&quot;.
      </p>

      {lastExplanation && (
        <p className="mt-2 text-xs italic text-neutral-600 dark:text-neutral-400">
          {lastExplanation}
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      <form onSubmit={handleAsk} className="mt-3 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What do you need?"
          className="flex-1 text-sm px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 disabled:opacity-50"
        >
          {loading ? "..." : "Ask"}
        </button>
      </form>
    </div>
  );
}