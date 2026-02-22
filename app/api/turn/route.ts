import { NextResponse } from "next/server";

export async function POST() {
    const apiKey = process.env.METERED_API_KEY;

    if (!apiKey) {
        console.error("METERED_API_KEY is not defined");
        return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    try {
        const response = await fetch(
            `https://openrelay.metered.ca/api/v1/turn/credentials?apiKey=${apiKey}`,
            { method: "POST" }
        );

        if (!response.ok) {
            throw new Error(`Metered API error: ${response.statusText}`);
        }

        const iceServers = await response.json();

        return NextResponse.json({ iceServers });
    } catch (error) {
        console.error("Failed to fetch TURN credentials:", error);
        return NextResponse.json(
            { error: "Failed to fetch credentials" },
            { status: 500 }
        );
    }
}

// Support GET for easier testing if needed, though instruction implies POST is standard for Metered creds
export async function GET() {
    return POST();
}
