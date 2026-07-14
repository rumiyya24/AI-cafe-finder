"use client";

import React, { useState, useEffect } from "react";
import CafeMap from "./components/CafeMap";
import Concierge from "./components/Concierge";
import Link from "next/link";
import {
  Search,
  Heart,
  Volume2,
  Wifi,
  Plug,
  Star,
  Coffee,
  CloudRain,
  Laptop,
  Clock,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Scale,
} from "lucide-react";

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
    { icon: Coffee, label: "Best study cafes", query: "best cafes for studying" },
    { icon: Laptop, label: "I have a Zoom meeting", query: "quiet cafe with good wifi for video calls" },
    { icon: Clock, label: "Somewhere for 5 hours", query: "cafe good for long work sessions" },
    { icon: CloudRain, label: "Cozy rainy-day cafes", query: "cozy warm cafe" },
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
        {url ? " " : null}
        {url
          ? React.createElement(
              LinkTag,
              {
                href: url,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "underline text-coffee dark:text-caramel",
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
    <main className="min-h-screen flex flex-col items-center bg-background">
      <header className="w-full border-b border-line sticky top-0 z-40 bg-background/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-espresso tracking-tight">
            <span className="w-8 h-8 rounded-[10px] bg-coffee text-white flex items-center justify-center">
              <Coffee size={18} />
            </span>
            Cafe Finder
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/favorites" className="flex items-center gap-1.5 text-muted hover:text-espresso">
              <Heart size={16} /> Favorites
            </Link>
            <Link href="/preferences" className="text-muted hover:text-espresso">
              Preferences
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-2xl w-full text-center px-6 pt-16 pb-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-espresso">
          Find your <span className="text-coffee">kind</span> of cafe
        </h1>
        <p className="mt-4 text-lg text-muted">
          Search by vibe, noise level, wifi, seating, and more.
        </p>

        <form
          onSubmit={handleSearch}
          className="mt-8 flex items-center gap-2 bg-white dark:bg-crema border border-line rounded-full pl-5 pr-2 py-2 shadow-sm focus-within:ring-2 focus-within:ring-caramel/40"
        >
          <Search size={18} className="text-muted shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. quiet cafes for studying in Baku"
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted"
          />
          <button
            type="submit"
            className="text-sm font-semibold px-5 py-2.5 rounded-full bg-coffee text-white hover:bg-espresso transition-colors"
          >
            Search
          </button>
        </form>

        {!hasSearched && (
          <div className="mt-5 flex flex-wrap gap-2.5 justify-center">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => runSearch(prompt.query)}
                className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-full border border-line bg-white dark:bg-crema text-espresso hover:border-caramel hover:bg-crema transition-colors"
              >
                <prompt.icon size={15} className="text-coffee" />
                {prompt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {cafes.length > 0 && (
        <div className="max-w-2xl w-full px-6 mt-6 flex flex-wrap gap-2 items-center justify-center text-sm">
          <div className="flex items-center gap-1.5 bg-white dark:bg-crema border border-line rounded-lg px-2 py-1.5">
            <Volume2 size={14} className="text-coffee" />
            <select
              value={filterNoise}
              onChange={(e) => setFilterNoise(e.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="">Any noise</option>
              <option value="quiet">Quiet</option>
              <option value="moderate">Moderate</option>
              <option value="loud">Loud</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-crema border border-line rounded-lg px-2 py-1.5">
            <Wifi size={14} className="text-coffee" />
            <select
              value={filterWifi}
              onChange={(e) => setFilterWifi(e.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="">Any wifi</option>
              <option value="yes">Has wifi</option>
              <option value="no">No wifi</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-crema border border-line rounded-lg px-2 py-1.5">
            <BookOpen size={14} className="text-coffee" />
            <select
              value={filterStudying}
              onChange={(e) => setFilterStudying(e.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="">Any studying</option>
              <option value="yes">Good for studying</option>
              <option value="no">Not for studying</option>
            </select>
          </div>
        </div>
      )}

      <div className="max-w-2xl w-full px-6 mt-4">
        {loading && (
          <p className="text-center text-muted">Searching...</p>
        )}

        {error && (
          <p className="text-center text-red-600">{error}</p>
        )}

        {!loading && !error && cafes.length > 0 && (
          <>
            {filtersActive && (
              <p className="text-center text-xs text-muted mb-3">
                Showing {filteredCafes.length} of {cafes.length} results
                ({checkedCount} vibe-checked -- check more cafes to include them in filtering)
              </p>
            )}

            {filtersActive && checkedCount === 0 && (
              <p className="text-center text-muted">
                Filters only apply to cafes you&apos;ve checked the vibe for.
                Click &quot;Check vibe&quot; on a few results below, then your
                filters will start working.
              </p>
            )}

            {filtersActive && checkedCount > 0 && filteredCafes.length === 0 && (
              <p className="text-center text-muted">
                None of your checked cafes match these filters yet. Try checking more, or clear filters.
              </p>
            )}

            <ul className="space-y-4">
              {filteredCafes.map((cafe) => (
                <li
                  key={cafe.id}
                  className="p-4 rounded-2xl border border-line bg-white dark:bg-crema shadow-sm hover:shadow-md hover:border-caramel transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-espresso">
                      {cafe.displayName.text}
                    </h2>
                    <button
                      onClick={() => toggleFavorite(cafe)}
                      aria-label={favorites.has(cafe.id) ? "Remove favorite" : "Add favorite"}
                      className="shrink-0"
                    >
                      <Heart
                        size={20}
                        className={favorites.has(cafe.id) ? "fill-red-500 text-red-500" : "text-muted"}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-muted">{cafe.formattedAddress}</p>
                  <label className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={compareSelection.has(cafe.id)}
                      onChange={() => toggleCompare(cafe.id)}
                    />
                    Compare
                  </label>
                  {cafe.rating && (
                    <p className="flex items-center gap-1 text-sm text-amber font-semibold mt-1">
                      <Star size={14} className="fill-amber text-amber" />
                      {cafe.rating} ({cafe.userRatingCount} reviews)
                    </p>
                  )}

                  {!vibeData[cafe.id] && (
                    <button
                      onClick={() => checkVibe(cafe.id)}
                      className="mt-2 text-sm text-coffee underline"
                    >
                      Check vibe
                    </button>
                  )}

                  {vibeData[cafe.id] === "loading" && (
                    <p className="mt-2 text-sm text-muted">Checking vibe...</p>
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
                        <div className="mt-3 p-3 rounded-xl bg-crema/60 dark:bg-crema border border-line">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted">
                              <Volume2 size={13} className="text-coffee" />
                              Noise{notes[cafe.id]?.noise_level && " (your note)"}
                            </span>
                            <span className="flex items-center gap-0.5">
                              {[1, 2, 3].map((step) => (
                                <span
                                  key={step}
                                  className={`w-4 h-2 rounded-sm ${
                                    step <= noiseLevel ? "bg-coffee" : "bg-line"
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-muted">{effectiveNoise}</span>
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted">
                              <Wifi size={13} className="text-coffee" />
                              Wifi{notes[cafe.id]?.wifi && " (your note)"}
                            </span>
                            <span className="text-muted">{effectiveWifi}</span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted">
                              <Plug size={13} className="text-coffee" />
                              Outlets{notes[cafe.id]?.outlets && " (your note)"}
                            </span>
                            <span className="text-muted">{effectiveOutlets}</span>
                          </div>

                          {(() => {
                            const match = getMatchScore(cafe.id);
                            if (!match) return null;
                            return (
                              <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-line">
                                <span className="flex items-center gap-1.5 text-muted">
                                  <Scale size={13} className="text-coffee" />
                                  Match for your preferences
                                </span>
                                <span className="font-semibold text-espresso">
                                  {match.percent}% ({match.matched}/{match.total})
                                </span>
                              </div>
                            );
                          })()}

                          {v.data_source === "ai_estimate" && (
                            <p className="flex items-start gap-1.5 mt-2 text-xs text-amber">
                              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                              No reviews available — this is a general AI estimate, not confirmed by real reviews.
                            </p>
                          )}

                          {recommendedFor.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-line">
                              <p className="text-xs text-muted mb-1.5">Recommended for</p>
                              <div className="flex flex-wrap gap-1.5">
                                {recommendedFor.map((tag) => (
                                  <span
                                    key={tag}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green/15 text-xs text-green font-medium"
                                  >
                                    <CheckCircle2 size={12} />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <details className="mt-3 text-xs text-muted">
                            <summary className="cursor-pointer underline">
                              View evidence
                            </summary>
                            <ul className="mt-1 space-y-1 pl-4 list-disc">
                              {evidenceItems.map((item) => renderEvidenceItem(item, v.review_urls))}
                            </ul>
                          </details>

                          {notes[cafe.id]?.personal_note && (
                            <p className="mt-2 text-xs italic text-muted">
                              Your note: {notes[cafe.id]?.personal_note}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                  {editingNote === cafe.id ? (
                    <div className="mt-2 space-y-2 p-3 rounded-xl border border-line bg-crema/40">
                      <input
                        type="text"
                        placeholder="Noise (e.g. quiet)"
                        value={noteDraft.noise_level}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, noise_level: e.target.value }))}
                        className="w-full text-sm px-2 py-1.5 rounded-lg border border-line bg-white dark:bg-background"
                      />
                      <input
                        type="text"
                        placeholder="Wifi (e.g. yes)"
                        value={noteDraft.wifi}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, wifi: e.target.value }))}
                        className="w-full text-sm px-2 py-1.5 rounded-lg border border-line bg-white dark:bg-background"
                      />
                      <input
                        type="text"
                        placeholder="Outlets (e.g. yes)"
                        value={noteDraft.outlets}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, outlets: e.target.value }))}
                        className="w-full text-sm px-2 py-1.5 rounded-lg border border-line bg-white dark:bg-background"
                      />
                      <input
                        type="text"
                        placeholder="Good for studying (e.g. yes)"
                        value={noteDraft.good_for_studying}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, good_for_studying: e.target.value }))}
                        className="w-full text-sm px-2 py-1.5 rounded-lg border border-line bg-white dark:bg-background"
                      />
                      <textarea
                        placeholder="Personal note"
                        value={noteDraft.personal_note}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, personal_note: e.target.value }))}
                        className="w-full text-sm px-2 py-1.5 rounded-lg border border-line bg-white dark:bg-background"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveNote(cafe)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-coffee text-white hover:bg-espresso transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          className="text-sm px-3 py-1.5 rounded-lg border border-line text-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditingNote(cafe)}
                      className="mt-2 text-sm text-coffee underline block"
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
          <p className="text-center text-muted">
            No cafes found. Try a different search.
          </p>
        )}
      </div>

      <div className="max-w-2xl w-full px-6 mt-10 pb-16">
        <div className="rounded-2xl border border-line shadow-sm overflow-hidden">
          <CafeMap cafes={cafes} />
        </div>
      </div>

      <Concierge onSearch={handleConciergeSearch} />
      {compareSelection.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-espresso text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-3">
          <Scale size={16} />
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