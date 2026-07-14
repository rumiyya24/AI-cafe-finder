import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id");

  if (!placeId) {
    return Response.json({ error: "Missing place_id" }, { status: 400 });
  }

  const { data: target, error: targetError } = await supabase
    .from("vibe_checks")
    .select("*")
    .eq("place_id", placeId)
    .single();

  if (targetError || !target) {
    return Response.json({ similar: [] });
  }

  const { data: allChecked, error: allError } = await supabase
    .from("vibe_checks")
    .select("*")
    .neq("place_id", placeId);

  if (allError || !allChecked) {
    return Response.json({ similar: [] });
  }

  const scored = allChecked
    .map((cafe) => {
      let score = 0;
      let comparable = 0;

      if (target.noise_level !== "unknown" && cafe.noise_level !== "unknown") {
        comparable++;
        if (cafe.noise_level === target.noise_level) score++;
      }
      if (target.wifi !== "unknown" && cafe.wifi !== "unknown") {
        comparable++;
        if (cafe.wifi === target.wifi) score++;
      }
      if (target.outlets !== "unknown" && cafe.outlets !== "unknown") {
        comparable++;
        if (cafe.outlets === target.outlets) score++;
      }
      if (target.good_for_studying !== "unknown" && cafe.good_for_studying !== "unknown") {
        comparable++;
        if (cafe.good_for_studying === target.good_for_studying) score++;
      }

      return { cafe, score, comparable };
    })
   // Data is sparser than expected -- most checked cafes only have 1-2
    // genuinely known attributes (reviews often don't mention specifics
    // even when they exist). Lowered from >=2 to >=1 comparable, but the
    // UI always shows the raw matched/comparable fraction so a 1/1 match
    // reads as weaker evidence than a 3/4 match, not hidden equivalence.
    .filter((s) => s.comparable >= 1 && s.score / s.comparable >= 0.5)
    .sort((a, b) => b.score / b.comparable - a.score / a.comparable)
    .slice(0, 3);

  return Response.json({
    similar: scored.map((s) => ({
      place_id: s.cafe.place_id,
      noise_level: s.cafe.noise_level,
      wifi: s.cafe.wifi,
      outlets: s.cafe.outlets,
      good_for_studying: s.cafe.good_for_studying,
      matched: s.score,
      comparable: s.comparable,
    })),
  });
}