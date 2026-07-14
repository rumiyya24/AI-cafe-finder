export type EffectiveVibe = {
  noise_level: string;
  wifi: string;
  good_for_studying: string;
};

export type VibeData = {
  noise_level: string;
  wifi: string;
  good_for_studying: string;
};

export type Note = {
  noise_level?: string;
  wifi?: string;
  good_for_studying?: string;
};

export type Preferences = {
  preferred_noise: string;
  preferred_wifi: string;
  preferred_studying: string;
};

export type MatchScore = {
  matched: number;
  total: number;
  percent: number;
};

export function computeEffectiveVibe(vibe: VibeData | null, note: Note | undefined): EffectiveVibe | null {
  if (!vibe) return null;
  return {
    noise_level: note?.noise_level || vibe.noise_level,
    wifi: note?.wifi || vibe.wifi,
    good_for_studying: note?.good_for_studying || vibe.good_for_studying,
  };
}

export function computeMatchScore(
  effective: EffectiveVibe | null,
  preferences: Preferences | null
): MatchScore | null {
  if (!preferences || !effective) return null;

  const checks: boolean[] = [];
  if (preferences.preferred_noise !== "any") {
    checks.push(effective.noise_level === preferences.preferred_noise);
  }
  if (preferences.preferred_wifi !== "any") {
    checks.push(effective.wifi === preferences.preferred_wifi);
  }
  if (preferences.preferred_studying !== "any") {
    checks.push(effective.good_for_studying === preferences.preferred_studying);
  }

  if (checks.length === 0) return null;

  const matched = checks.filter(Boolean).length;
  return {
    matched,
    total: checks.length,
    percent: Math.round((matched / checks.length) * 100),
  };
}