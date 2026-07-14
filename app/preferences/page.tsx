"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Settings2, Check } from "lucide-react";

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
    <main className="min-h-screen px-6 py-16 bg-background">
      <div className="max-w-md mx-auto">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-espresso">
          <ArrowLeft size={15} /> Back to search
        </Link>

        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-espresso mt-4">
          <Settings2 size={26} className="text-coffee" />
          Your Preferences
        </h1>
        <p className="mt-2 text-sm text-muted">
          Set what you generally look for -- checked cafes will show a match
          percentage based on these. Leave as &quot;any&quot; for attributes
          you don&apos;t care about.
        </p>

        {loading ? (
          <p className="mt-8 text-muted">Loading...</p>
        ) : (
          <div className="mt-8 space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Noise level</label>
              <select
                value={prefs.preferred_noise}
                onChange={(e) => setPrefs((p) => ({ ...p, preferred_noise: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-line bg-white dark:bg-crema"
              >
                <option value="any">Any</option>
                <option value="quiet">Quiet</option>
                <option value="moderate">Moderate</option>
                <option value="loud">Loud</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Wifi</label>
              <select
                value={prefs.preferred_wifi}
                onChange={(e) => setPrefs((p) => ({ ...p, preferred_wifi: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-line bg-white dark:bg-crema"
              >
                <option value="any">Any</option>
                <option value="yes">Needed</option>
                <option value="no">Not important</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Good for studying</label>
              <select
                value={prefs.preferred_studying}
                onChange={(e) => setPrefs((p) => ({ ...p, preferred_studying: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-line bg-white dark:bg-crema"
              >
                <option value="any">Any</option>
                <option value="yes">Important</option>
                <option value="no">Not important</option>
              </select>
            </div>

            <button
              onClick={savePrefs}
              className="px-4 py-2 rounded-lg bg-coffee text-white text-sm hover:bg-espresso transition-colors"
            >
              Save
            </button>

            {saved && (
              <p className="flex items-center gap-1.5 text-sm text-green">
                <Check size={15} /> Saved!
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}