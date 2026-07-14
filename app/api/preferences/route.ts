import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ preferences: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { preferred_noise, preferred_wifi, preferred_studying } = body;

  const { data, error } = await supabase
    .from("user_preferences")
    .update({
      preferred_noise,
      preferred_wifi,
      preferred_studying,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ preferences: data });
}