import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("cafe_notes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ notes: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    place_id,
    cafe_name,
    noise_level,
    wifi,
    outlets,
    good_for_studying,
    personal_note,
  } = body;

  if (!place_id || !cafe_name) {
    return Response.json(
      { error: "place_id and cafe_name are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("cafe_notes")
    .upsert(
      {
        place_id,
        cafe_name,
        noise_level: noise_level || null,
        wifi: wifi || null,
        outlets: outlets || null,
        good_for_studying: good_for_studying || null,
        personal_note: personal_note || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "place_id" }
    )
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ note: data });
}