"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Favorite = {
  place_id: string;
  cafe_name: string;
  cafe_address: string;
  created_at: string;
};

type NoteInfo = {
  noise_level?: string;
  wifi?: string;
  outlets?: string;
  good_for_studying?: string;
  personal_note?: string;
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [notes, setNotes] = useState<Record<string, NoteInfo>>({});
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<NoteInfo>({
    noise_level: "",
    wifi: "",
    outlets: "",
    good_for_studying: "",
    personal_note: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/favorites").then((res) => res.json()),
      fetch("/api/notes").then((res) => res.json()),
    ])
      .then(([favData, noteData]) => {
        setFavorites(favData.favorites || []);

        const notesMap: Record<string, NoteInfo> = {};
        for (const note of noteData.notes || []) {
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
      .finally(() => setLoading(false));
  }, []);

  async function removeFavorite(placeId: string) {
    await fetch(`/api/favorites?place_id=${placeId}`, { method: "DELETE" });
    setFavorites((prev) => prev.filter((f) => f.place_id !== placeId));
  }

  function startEditingNote(favorite: Favorite) {
    const existing = notes[favorite.place_id];
    setNoteDraft({
      noise_level: existing?.noise_level || "",
      wifi: existing?.wifi || "",
      outlets: existing?.outlets || "",
      good_for_studying: existing?.good_for_studying || "",
      personal_note: existing?.personal_note || "",
    });
    setEditingNote(favorite.place_id);
  }

  async function saveNote(favorite: Favorite) {
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_id: favorite.place_id,
        cafe_name: favorite.cafe_name,
        ...noteDraft,
      }),
    });
    setNotes((prev) => ({ ...prev, [favorite.place_id]: noteDraft }));
    setEditingNote(null);
  }

  return (
    <main className="min-h-screen px-6 py-16 bg-white dark:bg-neutral-950">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-sm text-neutral-500 underline"
        >
          ← Back to search
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mt-4">
          Your Favorites
        </h1>

        {loading && (
          <p className="mt-8 text-center text-neutral-500">Loading...</p>
        )}

        {!loading && favorites.length === 0 && (
          <p className="mt-8 text-center text-neutral-500">
            No favorites yet. Search for cafes and tap the heart to save one.
          </p>
        )}

        {!loading && favorites.length > 0 && (
          <ul className="mt-8 space-y-4">
            {favorites.map((favorite) => (
              <li
                key={favorite.place_id}
                className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-neutral-900 dark:text-white">
                    {favorite.cafe_name}
                  </h2>
                  <button
                    onClick={() => removeFavorite(favorite.place_id)}
                    aria-label="Remove favorite"
                    className="text-xl leading-none shrink-0"
                  >
                    ❤️
                  </button>
                </div>
                <p className="text-sm text-neutral-500">{favorite.cafe_address}</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Favorited {new Date(favorite.created_at).toLocaleDateString()}
                </p>

                {notes[favorite.place_id] && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {notes[favorite.place_id].noise_level && (
                      <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        🔊 {notes[favorite.place_id].noise_level} ✓
                      </span>
                    )}
                    {notes[favorite.place_id].wifi && (
                      <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        📶 wifi: {notes[favorite.place_id].wifi} ✓
                      </span>
                    )}
                    {notes[favorite.place_id].outlets && (
                      <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        🔌 outlets: {notes[favorite.place_id].outlets} ✓
                      </span>
                    )}
                    {notes[favorite.place_id].good_for_studying && (
                      <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        📚 studying: {notes[favorite.place_id].good_for_studying} ✓
                      </span>
                    )}
                  </div>
                )}

                {notes[favorite.place_id]?.personal_note && (
                  <p className="mt-2 text-xs italic text-neutral-500">
                    Your note: {notes[favorite.place_id].personal_note}
                  </p>
                )}

                {editingNote === favorite.place_id ? (
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
                        onClick={() => saveNote(favorite)}
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
                    onClick={() => startEditingNote(favorite)}
                    className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 underline block"
                  >
                    {notes[favorite.place_id] ? "Edit your note" : "Add your note"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}