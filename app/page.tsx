"use client";

import React, { useState, useEffect } from "react";
import CafeMap from "./components/CafeMap";
import Concierge from "./components/Concierge";
import Link from "next/link";

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
  noise_review_index?: number;
  wifi: string;
  wifi_evidence: string;
  wifi_review_index?: number;
  outlets: string;
  outlets_evidence: string;
  outlets_review_index?: number;
  good_for_studying: string;
  studying_evidence: string;
  studying_review_index?: number;
  data_source?: string;
  review_urls?: string[];
};

type NoteInfo = {
  noise_level?: string;
  wifi?: string;
  outlets?: string;
  good_for_studying?: string;
  personal_note?: string;
};

type EvidenceItem = {
  label: string;
  text: string;
  idx?: number;
};

const LinkTag = "a" as const;

export default function Home() {
  const [query, setQuery] = useState("");
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [vibeData, setVibeData] = useState<Record<string, VibeInfo | "loading" | "error">>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, NoteInfo>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<NoteInfo>({
    noise_level: "",
    wifi: "",
    outlets: "",
    good_for_studying: "",
    personal_note: "",
  });
  const [filterNoise, setFilterNoise] = useState("");
  const [filterWifi, setFilterWifi] = useState("");
  const [filterStudying, setFilterStudying] = useState("");
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        const ids = new Set<string>(
          (data.favorites || []).map((f: { place_id: string }) => f.place_id)
        );
        setFavorites(ids);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/notes")
      .then((res) => res.json())
      .then((data) => {
        const notesMap: Record<string, NoteInfo> = {};
        for (const note of data.notes || []) {
          notesMap[note.place_id] = {
            noise_level: note.noise_level || "",
            wifi: note.wifi || "",
            outlets: note.outlets || "",
            good_for_studying: note.good_for_studying || "",
            personal_note: note.personal_note || "",
          };
        }
        setNotes(notesMap);
      })
      .catch(() => {});
  }, []);

  const [preferences, setPreferences] = useState<{
    preferred_noise: string;
    preferred_wifi: string;
    preferred_studying: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      })
      .catch(() => {});
  }, []);

  const suggestedPrompts = [
    { emoji: "☕", label: "Best study cafes", query: "best cafes for studying" },
    { emoji: "💻", label: "I have a Zoom meeting", query: "quiet cafe with good wifi for video calls" },
    { emoji: "📖", label: "Somewhere for 5 hours", query: "cafe good for long work sessions" },
    { emoji: "🌧", label: "Cozy rainy-day cafes", query: "cozy warm cafe" },
  ];

  async function runSearch(searchQuery: string) {
    setQuery(searchQuery);
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setFilterNoise("");
    setFilterWifi("");
    setFilterStudying("");

    try {
      const response = await fetch(`/api/places?q=${encodeURIComponent(searchQuery)}`);
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setFilterNoise("");
    setFilterWifi("");
    setFilterStudying("");

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

  async function handleConciergeSearch(
    searchQuery: string,
    filters: { noise: string; wifi: string; studying: string }
  ) {
    setFilterNoise(filters.noise);
    setFilterWifi(filters.wifi);
    setFilterStudying(filters.studying);
    await runSearch(searchQuery);
  }

  async function checkVibe(cafeId: string) {
    setVibeData((prev) => ({ ...prev, [cafeId]: "loading" }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`/api/places/${cafeId}/vibe`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
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
  function toggleCompare(cafeId: string) {
    setCompareSelection((prev) => {
      const next = new Set(prev);
      if (next.has(cafeId)) {
        next.delete(cafeId);
      } else if (next.size < 4) {
        next.add(cafeId);
      }
      return next;
    });
  }

  function startEditingNote(cafe: Cafe) {
    const existing = notes[cafe.id];
    setNoteDraft({
      noise_level: existing?.noise_level || "",
      wifi: existing?.wifi || "",
      outlets: existing?.outlets || "",
      good_for_studying: existing?.good_for_studying || "",
      personal_note: existing?.personal_note || "",
    });
    setEditingNote(cafe.id);
  }

  async function saveNote(cafe: Cafe) {
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_id: cafe.id,
        cafe_name: cafe.displayName.text,
        ...noteDraft,
      }),
    });
    setNotes((prev) => ({ ...prev, [cafe.id]: noteDraft }));
    setEditingNote(null);
  }

  function getEffectiveVibe(cafeId: string) {
    const vibe = vibeData[cafeId];
    if (!vibe || vibe === "loading" || vibe === "error") return null;
    const note = notes[cafeId];
    return {
      noise_level: note?.noise_level || vibe.noise_level,
      wifi: note?.wifi || vibe.wifi,
      good_for_studying: note?.good_for_studying || vibe.good_for_studying,
    };
  }

  function getMatchScore(cafeId: string) {
    if (!preferences) return null;

    const effective = getEffectiveVibe(cafeId);
    if (!effective) return null;

    const checks: { matched: boolean }[] = [];

    if (preferences.preferred_noise !== "any") {
      checks.push({ matched: effective.noise_level === preferences.preferred_noise });
    }
    if (preferences.preferred_wifi !== "any") {
      checks.push({ matched: effective.wifi === preferences.preferred_wifi });
    }
    if (preferences.preferred_studying !== "any") {
      checks.push({ matched: effective.good_for_studying === preferences.preferred_studying });
    }

    if (checks.length === 0) return null;

    const matchedCount = checks.filter((c) => c.matched).length;
    return {
      matched: matchedCount,
      total: checks.length,
      percent: Math.round((matchedCount / checks.length) * 100),
    };
  }

  function renderEvidenceItem(item: EvidenceItem, reviewUrls?: string[]) {
    const url =
      item.idx && item.idx > 0 && reviewUrls ? reviewUrls[item.idx - 1] : null;
    return (
      <li key={item.label}>
        {item.label}: {item.text}
        {url
          ? " "
          : null}
        {url
          ? React.createElement(
              LinkTag,
              {
                href: url,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "underline text-neutral-600 dark:text-neutral-300",
              },
              "(view source)"
            )
          : null}
      </li>
    );
  }

  const filtersActive = filterNoise || filterWifi || filterStudying;

  const checkedCount = cafes.filter((cafe) => {
    const v = vibeData[cafe.id];
    return v && v !== "loading" && v !== "error";
  }).length;

  const filteredCafes = !filtersActive
    ? cafes
    : cafes.filter((cafe) => {
        const effective = getEffectiveVibe(cafe.id);
        if (!effective) return false;
        if (filterNoise && effective.noise_level !== filterNoise) return false;
        if (filterWifi && effective.wifi !== filterWifi) return false;
        if (filterStudying && effective.good_for_studying !== filterStudying) return false;
        return true;
      });

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16 bg-white dark:bg-neutral-950">
      <div className="max-w-2xl w-full text-center">
        <div className="flex justify-end mb-4">
          <Link href="/favorites" className="text-sm text-neutral-500 underline">
            ❤️ Favorites
          </Link>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-coffee dark:text-coffee-light">
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
            className="w-full px-5 py-3 rounded-2xl border border-coffee/20 dark:border-coffee-light/30 bg-cream dark:bg-cream text-foreground placeholder-coffee/40 focus:outline-none focus:ring-2 focus:ring-coffee dark:focus:ring-coffee-light"
          />
        </form>

        {!hasSearched && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => runSearch(prompt.query)}
                className="text-sm px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                {prompt.emoji} {prompt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {cafes.length > 0 && (
        <div className="max-w-2xl w-full mt-6 flex flex-wrap gap-2 items-center justify-center text-sm">
          <select
            value={filterNoise}
            onChange={(e) => setFilterNoise(e.target.value)}
            className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
          >
            <option value="">Any noise</option>
            <option value="quiet">Quiet</option>
            <option value="moderate">Moderate</option>
            <option value="loud">Loud</option>
          </select>
          <select
            value={filterWifi}
            onChange={(e) => setFilterWifi(e.target.value)}
            className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
          >
            <option value="">Any wifi</option>
            <option value="yes">Has wifi</option>
            <option value="no">No wifi</option>
          </select>
          <select
            value={filterStudying}
            onChange={(e) => setFilterStudying(e.target.value)}
            className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
          >
            <option value="">Any studying</option>
            <option value="yes">Good for studying</option>
            <option value="no">Not for studying</option>
          </select>
        </div>
      )}

      <div className="max-w-2xl w-full mt-4">
        {loading && (
          <p className="text-center text-neutral-500">Searching...</p>
        )}

        {error && (
          <p className="text-center text-red-600 dark:text-red-400">{error}</p>
        )}

        {!loading && !error && cafes.length > 0 && (
          <>
            {filtersActive && (
              <p className="text-center text-xs text-neutral-500 mb-3">
                Showing {filteredCafes.length} of {cafes.length} results
                ({checkedCount} vibe-checked -- check more cafes to include them in filtering)
              </p>
            )}

            {filtersActive && checkedCount === 0 && (
              <p className="text-center text-neutral-500">
                Filters only apply to cafes you&apos;ve checked the vibe for.
                Click &quot;Check vibe&quot; on a few results below, then your
                filters will start working.
              </p>
            )}

            {filtersActive && checkedCount > 0 && filteredCafes.length === 0 && (
              <p className="text-center text-neutral-500">
                None of your checked cafes match these filters yet. Try checking more, or clear filters.
              </p>
            )}

            <ul className="space-y-4">
              {filteredCafes.map((cafe) => (
                <li
                  key={cafe.id}
                  className="p-4 rounded-2xl border border-coffee/15 dark:border-coffee-light/20 bg-cream/50 dark:bg-cream/30"
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
                  <label className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
                    <input
                      type="checkbox"
                      checked={compareSelection.has(cafe.id)}
                      onChange={() => toggleCompare(cafe.id)}
                    />
                    Compare
                  </label>
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
                    vibeData[cafe.id] !== "error" && (() => {
                      const v = vibeData[cafe.id] as VibeInfo;
                      const effectiveNoise = notes[cafe.id]?.noise_level || v.noise_level;
                      const effectiveWifi = notes[cafe.id]?.wifi || v.wifi;
                      const effectiveOutlets = notes[cafe.id]?.outlets || v.outlets;
                      const effectiveStudying = notes[cafe.id]?.good_for_studying || v.good_for_studying;

                      const noiseSteps = { quiet: 1, moderate: 2, loud: 3, unknown: 0 };
                      const noiseLevel = noiseSteps[effectiveNoise as keyof typeof noiseSteps] ?? 0;

                      const recommendedFor: string[] = [];
                      if (effectiveStudying === "yes") recommendedFor.push("Studying");
                      if (effectiveWifi === "yes") recommendedFor.push("Remote work");
                      if (effectiveNoise === "quiet") recommendedFor.push("Focus / deep work");

                      const evidenceItems: EvidenceItem[] = [
                        { label: "Noise", text: v.noise_evidence, idx: v.noise_review_index },
                        { label: "Wifi", text: v.wifi_evidence, idx: v.wifi_review_index },
                        { label: "Outlets", text: v.outlets_evidence, idx: v.outlets_review_index },
                        { label: "Studying", text: v.studying_evidence, idx: v.studying_review_index },
                      ];

                      return (
                        <div className="mt-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-600 dark:text-neutral-400">
                              🔊 Noise{notes[cafe.id]?.noise_level && " (your note)"}
                            </span>
                            <span className="flex gap-0.5">
                              {[1, 2, 3].map((step) => (
                                <span
                                  key={step}
                                  className={`w-4 h-2 rounded-sm ${
                                    step <= noiseLevel
                                      ? "bg-neutral-700 dark:bg-neutral-300"
                                      : "bg-neutral-200 dark:bg-neutral-700"
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-neutral-500">{effectiveNoise}</span>
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-neutral-600 dark:text-neutral-400">
                              📶 Wifi{notes[cafe.id]?.wifi && " (your note)"}
                            </span>
                            <span className="text-neutral-500">{effectiveWifi}</span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-neutral-600 dark:text-neutral-400">
                              🔌 Outlets{notes[cafe.id]?.outlets && " (your note)"}
                            </span>
                            <span className="text-neutral-500">{effectiveOutlets}</span>
                          </div>

                          {(() => {
                            const match = getMatchScore(cafe.id);
                            if (!match) return null;
                            return (
                              <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                                <span className="text-neutral-600 dark:text-neutral-400">
                                  Match for your preferences
                                </span>
                                <span className="font-semibold text-neutral-900 dark:text-white">
                                  {match.percent}% ({match.matched}/{match.total})
                                </span>
                              </div>
                            );
                          })()}

                          {v.data_source === "ai_estimate" && (
                            <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                              ⚠️ No reviews available — this is a general AI estimate, not confirmed by real reviews.
                            </p>
                          )}

                          {recommendedFor.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                                Recommended for
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {recommendedFor.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded-full bg-sage/20 dark:bg-sage/25 text-xs text-sage dark:text-sage-light"
                                  >
                                    ✓ {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <details className="mt-3 text-xs text-neutral-500">
                            <summary className="cursor-pointer underline">
                              View evidence
                            </summary>
                            <ul className="mt-1 space-y-1 pl-4 list-disc">
                              {evidenceItems.map((item) => renderEvidenceItem(item, v.review_urls))}
                            </ul>
                          </details>

                          {notes[cafe.id]?.personal_note && (
                            <p className="mt-2 text-xs italic text-neutral-500">
                              Your note: {notes[cafe.id]?.personal_note}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                  {editingNote === cafe.id ? (
                    <div className="mt-2 space-y-2 p-3 rounded border border-neutral-200 dark:border-neutral-800">
                      <input
                        type="text"
                        placeholder="Noise (e.g. quiet)"
                        value={noteDraft.noise_level}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, noise_level: e.target.value }))}
                        className="w-full text-sm px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Wifi (e.g. yes)"
                        value={noteDraft.wifi}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, wifi: e.target.value }))}
                        className="w-full text-sm px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Outlets (e.g. yes)"
                        value={noteDraft.outlets}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, outlets: e.target.value }))}
                        className="w-full text-sm px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Good for studying (e.g. yes)"
                        value={noteDraft.good_for_studying}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, good_for_studying: e.target.value }))}
                        className="w-full text-sm px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
                      />
                      <textarea
                        placeholder="Personal note"
                        value={noteDraft.personal_note}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, personal_note: e.target.value }))}
                        className="w-full text-sm px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveNote(cafe)}
                          className="text-sm px-3 py-1 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          className="text-sm px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditingNote(cafe)}
                      className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 underline block"
                    >
                      {notes[cafe.id] ? "Edit your note" : "Add your note"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
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

      <Concierge onSearch={handleConciergeSearch} />
      {compareSelection.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-5 py-3 rounded-full shadow-lg flex items-center gap-3">
          <span className="text-sm">{compareSelection.size} selected</span>
          <Link
            href={`/compare?ids=${Array.from(compareSelection).join(",")}`}
            className="text-sm font-semibold underline"
          >
            Compare
          </Link>
        </div>
      )}
    </main>
  );
}