export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "GOOGLE_PLACES_API_KEY is not set" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!query || query.trim().length === 0) {
    return Response.json(
      { error: "Missing search query (expected ?q=...)" },
      { status: 400 }
    );
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.photos",
      },
     body: JSON.stringify({
        textQuery: query,
        includedType: "cafe",
       ...(lat && lng
          ? (() => {
              // locationRestriction (not bias) genuinely excludes far results --
              // bias alone only affects ranking preference, confirmed as
              // insufficient earlier when the same issue showed up for
              // Baku-specific search
              const latNum = parseFloat(lat);
              const lngNum = parseFloat(lng);
              const radiusKm = 5;
              const deltaLat = radiusKm / 111;
              const deltaLng = radiusKm / (111 * Math.cos((latNum * Math.PI) / 180));

              return {
                locationRestriction: {
                  rectangle: {
                    low: { latitude: latNum - deltaLat, longitude: lngNum - deltaLng },
                    high: { latitude: latNum + deltaLat, longitude: lngNum + deltaLng },
                  },
                },
              };
            })()
          : {}),
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    return Response.json(
      { error: "Google Places API request failed", details: errorBody },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json(data);
}