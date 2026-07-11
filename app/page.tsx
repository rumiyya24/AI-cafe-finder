"use client";

import { useState, useEffect } from "react";
import CafeMap from "./components/CafeMap";

type Cafe = {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
};

type VibeInfo = {
  noise_level: string;
  noise_evidence: string;
  wifi: string;
  wifi_evidence: string;
  outlets: string;
  outlets_evidence: string;
  good_for_studying: string;
  studying_evidence: string;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [vibeData, setVibeData] = useState<Record<string, VibeInfo | "loading" | "error">>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        const ids = new Set<string>(
          (data.favorites || []).map((f: { place_id: string }) => f.place_id)
        );
        setFavorites(ids);
      })
      .catch(() => {
        // Silently fail -- favorites just won't be pre-marked, not critical
      });
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/places?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setCafes(data.places || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCafes([]);
    } finally {
      setLoading(false);
    }
  }

  async function checkVibe(cafeId: string) {
    setVibeData((prev) => ({ ...prev, [cafeId]: "loading" }));

    try {
      const response = await fetch(`/api/places/${cafeId}/vibe`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Vibe check failed");
      }

      setVibeData((prev) => ({ ...prev, [cafeId]: data }));
    } catch {
      setVibeData((prev) => ({ ...prev, [cafeId]: "error" }));
    }
  }

  async function toggleFavorite(cafe: Cafe) {
    const isFavorited = favorites.has(cafe.id);

    if (isFavorited) {
      await fetch(`/api/favorites?place_id=${cafe.id}`, { method: "DELETE" });
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(cafe.id);
        return next;
      });
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: cafe.id,
          cafe_name: cafe.displayName.text,
          cafe_address: cafe.formattedAddress,
        }),
      });
      setFavorites((prev) => new Set(prev).add(cafe.id));
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16 bg-white dark:bg-neutral-950">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Find your kind of cafe
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Search by vibe, noise level, wifi, seating, and more.
        </p>

        <form onSubmit={handleSearch} className="mt-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. quiet cafes for studying in Baku"
            className="w-full px-5 py-3 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
        </form>
      </div>

      <div className="max-w-2xl w-full mt-10">
        {loading && (
          <p className="text-center text-neutral-500">Searching...</p>
        )}

        {error && (
          <p className="text-center text-red-600 dark:text-red-400">{error}</p>
        )}

        {!loading && !error && cafes.length > 0 && (
          <ul className="space-y-4">
            {cafes.map((cafe) => (
              <li
                key={cafe.id}
                className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-neutral-900 dark:text-white">
                    {cafe.displayName.text}
                  </h2>
                  <button
                    onClick={() => toggleFavorite(cafe)}
                    aria-label={favorites.has(cafe.id) ? "Remove favorite" : "Add favorite"}
                    className="text-xl leading-none shrink-0"
                  >
                    {favorites.has(cafe.id) ? "❤️" : "🤍"}
                  </button>
                </div>
                <p className="text-sm text-neutral-500">{cafe.formattedAddress}</p>
                {cafe.rating && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    ⭐ {cafe.rating} ({cafe.userRatingCount} reviews)
                  </p>
                )}

                {!vibeData[cafe.id] && (
                  <button
                    onClick={() => checkVibe(cafe.id)}
                    className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 underline"
                  >
                    Check vibe
                  </button>
                )}

                {vibeData[cafe.id] === "loading" && (
                  <p className="mt-2 text-sm text-neutral-400">Checking vibe...</p>
                )}

                {vibeData[cafe.id] === "error" && (
                  <p className="mt-2 text-sm text-red-500">Couldn&apos;t check vibe</p>
                )}

                {vibeData[cafe.id] &&
                  vibeData[cafe.id] !== "loading" &&
                  vibeData[cafe.id] !== "error" && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          🔊 {(vibeData[cafe.id] as VibeInfo).noise_level}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          📶 wifi: {(vibeData[cafe.id] as VibeInfo).wifi}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          🔌 outlets: {(vibeData[cafe.id] as VibeInfo).outlets}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          📚 studying: {(vibeData[cafe.id] as VibeInfo).good_for_studying}
                        </span>
                      </div>

                      <details className="mt-2 text-xs text-neutral-500">
                        <summary className="cursor-pointer underline">
                          View evidence
                        </summary>
                        <ul className="mt-1 space-y-1 pl-4 list-disc">
                          <li>Noise: {(vibeData[cafe.id] as VibeInfo).noise_evidence}</li>
                          <li>Wifi: {(vibeData[cafe.id] as VibeInfo).wifi_evidence}</li>
                          <li>Outlets: {(vibeData[cafe.id] as VibeInfo).outlets_evidence}</li>
                          <li>Studying: {(vibeData[cafe.id] as VibeInfo).studying_evidence}</li>
                        </ul>
                      </details>
                    </div>
                  )}
              </li>
            ))}
          </ul>
        )}
        {!loading && !error && hasSearched && cafes.length === 0 && (
          <p className="text-center text-neutral-500">
            No cafes found. Try a different search.
          </p>
        )}
      </div>

      <div className="max-w-2xl w-full mt-10">
        <CafeMap cafes={cafes} />
      </div>
    </main>
  );
}