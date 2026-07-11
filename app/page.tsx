"use client";

import { useState } from "react";
import CafeMap from "./components/CafeMap";

type Cafe = {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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
                <h2 className="font-semibold text-neutral-900 dark:text-white">
                  {cafe.displayName.text}
                </h2>
                <p className="text-sm text-neutral-500">{cafe.formattedAddress}</p>
                {cafe.rating && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    ⭐ {cafe.rating} ({cafe.userRatingCount} reviews)
                  </p>
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