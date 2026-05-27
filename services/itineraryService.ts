import { MontanitaEvent, Vibe } from "../types";

export interface ItineraryItem {
    time: string;
    activity: string;
    location: string;
    vibe: Vibe;
    description: string;
}

export const generateItinerary = async (
    preferredVibe: Vibe,
    events: MontanitaEvent[],
    userName: string
): Promise<string> => {
    try {
        const prompt = `
            You are a local Montañita expert guide. Create a personalized 24-hour itinerary for ${userName}.
            Their preferred vibe is: ${preferredVibe}.
            
            Current available events:
            ${JSON.stringify(events.slice(0, 10).map(e => ({ title: e.title, vibe: e.vibe, start: e.startAt, loc: e.sector })))}

            Rules:
            1. Focus on their preferred vibe, but suggest a mix of local chill and party.
            2. Mention specific events from the provided list if they match.
            3. Use a vibrant, local, and slightly "surfer/party" tone.
            4. Keep it concise but exciting.
            5. Output in Markdown format with emoji.
            
            Format:
            # Your Pulse Itinerary: [Title]
            ## Morning: [Activity]
            ...
            ## Afternoon: [Activity]
            ...
            ## Night: [Activity]
            ...
        `;

        const response = await fetch('/api/ai/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            throw new Error(`Gemini Proxy error: ${response.status}`);
        }

        const data = await response.json();
        return data.text || "I couldn't feel the pulse for your itinerary right now. Try again later!";
    } catch (error) {
        console.error("Error generating itinerary:", error);
        return "I couldn't feel the pulse for your itinerary right now. Try again later!";
    }
};
