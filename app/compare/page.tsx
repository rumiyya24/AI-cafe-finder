"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type CafeCompareData = {
  id: string;
  name: string;
  address: string;
  vibe: {
    noise_level: string;
    wifi: string;
    outlets: string;
    good_for_studying: string;
    data_source?: string;
  } | null;
  error: boolean;
};

function CompareContent() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);

  const [cafes, setCafes] = useState<CafeCompareData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(
      ids.map(async (id) => {
        try {
          const [placeRes, vibeRes] = await Promise.all([
            fetch(`/api/places/${id}`),
            fetch(`/api/places/${id}/vibe`),
          ]);
          const placeData = await placeRes.json();
          const vibeData = await vibeRes.json();

          return {
            id,
            name: placeData.displayName?.text || "Unknown cafe",
            address: placeData.formattedAddress || "",
            vibe: vibeRes.ok
              ? {
                  noise_level: vibeData.noise_level,
                  wifi: vibeData.wifi,
                  outlets: vibeData.outlets,
                  good_for_studying: vibeData.good_for_studying,
                  data_source: vibeData.data_source,
                }
              : null,
            error: !placeRes.ok,
          };
        } catch {
          return { id, name: "Failed to load", address: "", vibe: null, error: true };
        }
      })
    ).then((results) => {
      setCafes(results);
      setLoading(false);
    });
  }, [ids.join(",")]);

  if (ids.length < 2) {
    return (
      <p className="text-center text-neutral-500 mt-8">
        Select at least 2 cafes to compare from the search page.
      </p>
    );
  }

  if (loading) {
    return <p className="text-center text-neutral-500 mt-8">Loading comparison...</p>;
  }

  const rows: { label: string; key: keyof NonNullable<CafeCompareData["vibe"]> }[] = [
    { label: "Noise", key: "noise_level" },
    { label: "Wifi", key: "wifi" },
    { label: "Outlets", key: "outlets" },
    { label: "Good for studying", key: "good_for_studying" },
  ];

  return (
    <div className="overflow-x-auto mt-8">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b border-neutral-200 dark:border-neutral-800"></th>
            {cafes.map((cafe) => (
              <th
                key={cafe.id}
                className="text-left p-2 border-b border-neutral-200 dark:border-neutral-800 font-semibold"
              >
                {cafe.name}
                {cafe.error && (
                  <p className="text-xs text-red-500 font-normal">Failed to load</p>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
              Address
            </td>
            {cafes.map((cafe) => (
              <td
                key={cafe.id}
                className="p-2 border-b border-neutral-200 dark:border-neutral-800"
              >
                {cafe.address || "-"}
              </td>
            ))}
          </tr>
          {rows.map(({ label, key }) => (
            <tr key={key}>
              <td className="p-2 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                {label}
              </td>
              {cafes.map((cafe) => (
                <td
                  key={cafe.id}
                  className="p-2 border-b border-neutral-200 dark:border-neutral-800"
                >
                  {cafe.vibe ? cafe.vibe[key] : "not checked"}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="p-2 text-neutral-500">Source</td>
            {cafes.map((cafe) => (
              <td key={cafe.id} className="p-2 text-xs text-neutral-400">
                {cafe.vibe?.data_source === "ai_estimate"
                  ? "AI estimate (no reviews)"
                  : cafe.vibe
                  ? "Reviews"
                  : "-"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function ComparePage() {
  return (
    <main className="min-h-screen px-6 py-16 bg-white dark:bg-neutral-950">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-neutral-500 underline">
          ← Back to search
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mt-4">
          Compare cafes
        </h1>

        <Suspense fallback={<p className="text-center text-neutral-500 mt-8">Loading...</p>}>
          <CompareContent />
        </Suspense>
      </div>
    </main>
  );
}