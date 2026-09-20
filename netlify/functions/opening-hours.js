exports.handler = async function handler() {
    const apiKey = process.env.GOOGLE_API_KEY;
    const placeId = "ChIJ69-5-08RrjsR656yW4p3P2M";

    if (!apiKey) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "GOOGLE_API_KEY is not configured" })
        };
    }

    const query = new URLSearchParams({
        place_id: placeId,
        fields: "opening_hours",
        key: apiKey
    });

    try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${query}`);
        const data = await response.json();

        if (!response.ok || data.status !== "OK") {
            return {
                statusCode: 502,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    error: "Google Places request failed",
                    googleStatus: data.status || "HTTP_ERROR",
                    details: data.error_message || "Google returned no additional details"
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=300"
            },
            body: JSON.stringify({
                openNow: data.result?.opening_hours?.open_now ?? false
            })
        };
    } catch {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Opening-hours service failed" })
        };
    }
};
