export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GOOGLE_PLACES_API_KEY is not set" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const photoName = searchParams.get("name");

  if (!photoName) {
    return Response.json({ error: "Missing photo name" }, { status: 400 });
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&skipHttpRedirect=true`,
    {
      headers: { "X-Goog-Api-Key": apiKey },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    return Response.json(
      { error: "Failed to fetch photo", details: errorBody },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json({ photoUri: data.photoUri });
}