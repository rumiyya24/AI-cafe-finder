"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Preferences = {
  preferred_noise: string;
  preferred_wifi: string;
  preferred_studying: string;
};

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences>({
    preferred_noise: "any",
    preferred_wifi: "any",
    preferred_studying: "any",
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) {
          setPrefs({
            preferred_noise: data.preferences.preferred_noise,
            preferred_wifi: data.preferences.preferred_wifi,
            preferred_studying: data.preferences.preferred_studying,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function savePrefs() {
    setSaved(false);
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaved(true);
  }

  return (
    <main className="min-h-screen px-6 py-16 bg-white dark:bg-neutral-950">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-sm text-neutral-500 underline">
          ← Back to search
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mt-4">
          Your Preferences
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Set what you generally look for -- checked cafes will show a match
          percentage based on these. Leave as &quot;any&quot; for attributes
          you don&apos;t care about.
        </p>

        {loading ? (
          <p className="mt-8 text-neutral-500">Loading...</p>
        ) : (
          <div className="mt-8 space-y-4">
            <div>
              <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                Noise level
              </label>
              <select
                value={prefs.preferred_noise}
                onChange={(e) => setPrefs((p) => ({ ...p, preferred_noise: e.target.value }))}
                className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
              >
                <option value="any">Any</option>
                <option value="quiet">Quiet</option>
                <option value="moderate">Moderate</option>
                <option value="loud">Loud</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                Wifi
              </label>
              <select
                value={prefs.preferred_wifi}
                onChange={(e) => setPrefs((p) => ({ ...p, preferred_wifi: e.target.value }))}
                className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
              >
                <option value="any">Any</option>
                <option value="yes">Needed</option>
                <option value="no">Not important</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                Good for studying
              </label>
              <select
                value={prefs.preferred_studying}
                onChange={(e) => setPrefs((p) => ({ ...p, preferred_studying: e.target.value }))}
                className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
              >
                <option value="any">Any</option>
                <option value="yes">Important</option>
                <option value="no">Not important</option>
              </select>
            </div>

            <button
              onClick={savePrefs}
              className="px-4 py-2 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm"
            >
              Save
            </button>

            {saved && (
              <p className="text-sm text-green-600 dark:text-green-500">Saved!</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}