
import { GoogleGenAI } from "@google/genai";
import { MontanitaEvent, Sector, Business } from "../types.ts";

export interface PlannerSection {
  category: string;
  title: string;
  emoji: string;
  businessName?: string;
  recommendation: string;
  isPremium?: boolean;
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export async function getSmartRecommendations(events: MontanitaEvent[], userInterest: string): Promise<{ text: string, sources: any[] }> {
  const eventList = events.map(e => `${e.title} at ${e.sector} (${e.vibe} vibe)`).join(", ");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
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
      model: 'gemini-1.5-flash',
      contents: `Create a captivating 20-word description for an event called "${title}" located in the "${sector}" area of Montañita, Ecuador.`,
    });
    return response.text || "Epic vibes incoming!";
  } catch (error) {
    return "Something amazing is happening!";
  }
}

export async function getPlannerRecommendations(businesses: Business[], locality: string): Promise<PlannerSection[]> {
  const bizList = businesses.map(b => `${b.name} (${b.category} in ${b.sector})`).join(", ");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Context: Local planner for ${locality}, Ecuador. 
      Available Businesses: ${bizList}. 
      Task: Create a 4-part daily itinerary (Morning, Afternoon, Evening, Night). 
      Format: Return ONLY a JSON array of objects with keys: category, title, emoji, businessName, recommendation, isPremium.
      Example: [{"category": "Morning", "title": "Breakfast", "emoji": "☕", "businessName": "Example Cafe", "recommendation": "Great coffee", "isPremium": false}]`,
    });

    const text = response.text || "[]";
    const cleanText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Planner AI Error:", error);
    return [];
  }
}

export async function getRecommendationForUser(events: MontanitaEvent[], userAnswer: string): Promise<PlannerSection[]> {
  const eventList = events.map(e => `${e.title} (${e.vibe} vibe in ${e.sector} sector)`).join(", ");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `User Answer: "${userAnswer}". 
      Context: Recommend the BEST single event from this specific list: ${eventList}.
      Task: Return the recommendation in the same JSON format as a daily itinerary section.
      Format: Return ONLY a JSON array with ONE object containing keys: category, title, emoji, businessName, recommendation, isPremium.
      Rule: Set "category" to "RECOMENDACIÓN", and "isPremium" to true.`,
    });

    const text = response.text || "[]";
    const cleanText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Recommendation AI Error:", error);
    return [];
  }
}
