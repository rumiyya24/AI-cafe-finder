import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ favorites: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { place_id, cafe_name, cafe_address } = body;

  if (!place_id || !cafe_name) {
    return Response.json(
      { error: "place_id and cafe_name are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("favorites")
    .insert({ place_id, cafe_name, cafe_address })
    .select()
    .single();

  if (error) {
    // Postgres unique constraint violation -- already favorited
    if (error.code === "23505") {
      return Response.json(
        { error: "This cafe is already favorited" },
        { status: 409 }
      );
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ favorite: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id");

  if (!placeId) {
    return Response.json(
      { error: "Missing place_id query parameter" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("place_id", placeId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}