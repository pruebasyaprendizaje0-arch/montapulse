
import { GoogleGenAI } from "@google/genai";
import { MontanitaEvent, Sector } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getSmartRecommendations(events: MontanitaEvent[], userInterest: string): Promise<{ text: string, sources: any[] }> {
  const eventList = events.map(e => `${e.title} at ${e.sector} (${e.vibe} vibe)`).join(", ");
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User is interested in: "${userInterest}". 
      Context: Today in Montañita, Ecuador. 
      Local Events: ${eventList}. 
      Task: Suggest the top 2 events based on their interest AND real-time context like weather or swell if relevant. 
      Tone: Beachy, professional, concise.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    return {
      text: response.text || "Couldn't generate recommendations right now.",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      text: "The ocean is a bit choppy for AI right now. Try again later!",
      sources: []
    };
  }
}

export async function generateEventDescription(title: string, sector: Sector): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a captivating 20-word description for an event called "${title}" located in the "${sector}" area of Montañita, Ecuador.`,
    });
    return response.text || "Epic vibes incoming!";
  } catch (error) {
    return "Something amazing is happening!";
  }
}
