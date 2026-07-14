"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Volume2, Wifi, Plug, BookOpen, Scale } from "lucide-react";

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
      <p className="text-center text-muted mt-8">
        Select at least 2 cafes to compare from the search page.
      </p>
    );
  }

  if (loading) {
    return <p className="text-center text-muted mt-8">Loading comparison...</p>;
  }

  const rows: { label: string; key: keyof NonNullable<CafeCompareData["vibe"]>; icon: typeof Volume2 }[] = [
    { label: "Noise", key: "noise_level", icon: Volume2 },
    { label: "Wifi", key: "wifi", icon: Wifi },
    { label: "Outlets", key: "outlets", icon: Plug },
    { label: "Good for studying", key: "good_for_studying", icon: BookOpen },
  ];

  return (
    <div className="overflow-x-auto mt-8 rounded-2xl border border-line">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-crema/60 dark:bg-crema">
            <th className="text-left p-3 border-b border-line"></th>
            {cafes.map((cafe) => (
              <th key={cafe.id} className="text-left p-3 border-b border-line font-bold text-espresso">
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
            <td className="p-3 text-muted border-b border-line">Address</td>
            {cafes.map((cafe) => (
              <td key={cafe.id} className="p-3 border-b border-line text-muted">
                {cafe.address || "-"}
              </td>
            ))}
          </tr>
          {rows.map(({ label, key, icon: Icon }) => (
            <tr key={key}>
              <td className="p-3 text-muted border-b border-line">
                <span className="flex items-center gap-1.5">
                  <Icon size={14} className="text-coffee" />
                  {label}
                </span>
              </td>
              {cafes.map((cafe) => (
                <td key={cafe.id} className="p-3 border-b border-line text-muted">
                  {cafe.vibe ? cafe.vibe[key] : "not checked"}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="p-3 text-muted">Source</td>
            {cafes.map((cafe) => (
              <td key={cafe.id} className="p-3 text-xs text-muted">
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
    <main className="min-h-screen px-6 py-16 bg-background">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-espresso">
          <ArrowLeft size={15} /> Back to search
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-espresso mt-4">
          <Scale size={26} className="text-coffee" />
          Compare cafes
        </h1>

        <Suspense fallback={<p className="text-center text-muted mt-8">Loading...</p>}>
          <CompareContent />
        </Suspense>
      </div>
    </main>
  );
}