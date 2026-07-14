export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GOOGLE_PLACES_API_KEY is not set" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const originLat = searchParams.get("originLat");
  const originLng = searchParams.get("originLng");
  const destLat = searchParams.get("destLat");
  const destLng = searchParams.get("destLng");

  if (!originLat || !originLng || !destLat || !destLng) {
    return Response.json({ error: "Missing origin/destination coordinates" }, { status: 400 });
  }

  const modes = ["WALK", "DRIVE", "TRANSIT"] as const;

  const results = await Promise.all(
    modes.map(async (mode) => {
      try {
        const response = await fetch(
          "https://routes.googleapis.com/directions/v2:computeRoutes",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
            },
            body: JSON.stringify({
              origin: {
                location: { latLng: { latitude: parseFloat(originLat), longitude: parseFloat(originLng) } },
              },
              destination: {
                location: { latLng: { latitude: parseFloat(destLat), longitude: parseFloat(destLng) } },
              },
              travelMode: mode,
            }),
          }
        );

        if (!response.ok) {
          return { mode, error: true };
        }

        const data = await response.json();
        const route = data.routes?.[0];

        if (!route) {
          return { mode, error: true };
        }

        const durationSeconds = parseInt(route.duration?.replace("s", "") || "0");
        const distanceMeters = route.distanceMeters || 0;

        return {
          mode,
          error: false,
          durationMinutes: Math.round(durationSeconds / 60),
          distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
        };
      } catch {
        return { mode, error: true };
      }
    })
  );

  return Response.json({ results });
}