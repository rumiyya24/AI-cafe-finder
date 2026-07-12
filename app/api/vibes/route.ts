import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("vibe_checks")
    .select("*");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ vibes: data });
}