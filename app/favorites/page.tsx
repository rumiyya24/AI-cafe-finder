"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Volume2, Wifi, Plug, BookOpen } from "lucide-react";

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

type VibeInfo = {
  noise_level: string;
  wifi: string;
  outlets: string;
  good_for_studying: string;
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [notes, setNotes] = useState<Record<string, NoteInfo>>({});
  const [vibes, setVibes] = useState<Record<string, VibeInfo>>({});
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
      fetch("/api/vibes").then((res) => res.json()),
    ])
      .then(([favData, noteData, vibeData]) => {
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

        const vibesMap: Record<string, VibeInfo> = {};
        for (const vibe of vibeData.vibes || []) {
          vibesMap[vibe.place_id] = {
            noise_level: vibe.noise_level,
            wifi: vibe.wifi,
            outlets: vibe.outlets,
            good_for_studying: vibe.good_for_studying,
          };
        }
        setVibes(vibesMap);
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
    <main className="min-h-screen px-6 py-16 bg-background">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-espresso">
          <ArrowLeft size={15} /> Back to search
        </Link>

        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-espresso mt-4">
          <Heart size={26} className="fill-red-500 text-red-500" />
          Your Favorites
        </h1>

        {loading && (
          <p className="mt-8 text-center text-muted">Loading...</p>
        )}

        {!loading && favorites.length === 0 && (
          <p className="mt-8 text-center text-muted">
            No favorites yet. Search for cafes and tap the heart to save one.
          </p>
        )}

        {!loading && favorites.length > 0 && (
          <ul className="mt-8 space-y-4">
            {favorites.map((favorite) => (
              <li
                key={favorite.place_id}
                className="p-4 rounded-2xl border border-line bg-white dark:bg-crema shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-espresso">
                    {favorite.cafe_name}
                  </h2>
                  <button
                    onClick={() => removeFavorite(favorite.place_id)}
                    aria-label="Remove favorite"
                    className="shrink-0"
                  >
                    <Heart size={20} className="fill-red-500 text-red-500" />
                  </button>
                </div>
                <p className="text-sm text-muted">{favorite.cafe_address}</p>
                <p className="text-xs text-muted mt-1">
                  Favorited {new Date(favorite.created_at).toLocaleDateString()}
                </p>

                {(notes[favorite.place_id] || vibes[favorite.place_id]) && (
                  <div className="mt-3 p-3 rounded-xl bg-crema/60 dark:bg-crema border border-line space-y-2 text-xs">
                    {(notes[favorite.place_id]?.noise_level || vibes[favorite.place_id]?.noise_level) && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted">
                          <Volume2 size={13} className="text-coffee" /> Noise
                        </span>
                        <span className="text-muted">
                          {notes[favorite.place_id]?.noise_level || vibes[favorite.place_id]?.noise_level}
                          {notes[favorite.place_id]?.noise_level && " (your note)"}
                        </span>
                      </div>
                    )}
                    {(notes[favorite.place_id]?.wifi || vibes[favorite.place_id]?.wifi) && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted">
                          <Wifi size={13} className="text-coffee" /> Wifi
                        </span>
                        <span className="text-muted">
                          {notes[favorite.place_id]?.wifi || vibes[favorite.place_id]?.wifi}
                          {notes[favorite.place_id]?.wifi && " (your note)"}
                        </span>
                      </div>
                    )}
                    {(notes[favorite.place_id]?.outlets || vibes[favorite.place_id]?.outlets) && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted">
                          <Plug size={13} className="text-coffee" /> Outlets
                        </span>
                        <span className="text-muted">
                          {notes[favorite.place_id]?.outlets || vibes[favorite.place_id]?.outlets}
                          {notes[favorite.place_id]?.outlets && " (your note)"}
                        </span>
                      </div>
                    )}
                    {(notes[favorite.place_id]?.good_for_studying || vibes[favorite.place_id]?.good_for_studying) && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted">
                          <BookOpen size={13} className="text-coffee" /> Studying
                        </span>
                        <span className="text-muted">
                          {notes[favorite.place_id]?.good_for_studying || vibes[favorite.place_id]?.good_for_studying}
                          {notes[favorite.place_id]?.good_for_studying && " (your note)"}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {notes[favorite.place_id]?.personal_note && (
                  <p className="mt-2 text-xs italic text-muted">
                    Your note: {notes[favorite.place_id].personal_note}
                  </p>
                )}

                {editingNote === favorite.place_id ? (
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
                        onClick={() => saveNote(favorite)}
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
                    onClick={() => startEditingNote(favorite)}
                    className="mt-2 text-sm text-coffee underline block"
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