
import { MontanitaEvent, Sector, Business, UserProfile } from "../types.ts";

export interface PlannerSection {
  category: string;
  title: string;
  emoji: string;
  businessName?: string;
  recommendation: string;
  isPremium?: boolean;
  businessId?: string;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(messages: { role: string; content: string }[], jsonMode?: boolean): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Montapulse',
    },
    body: JSON.stringify({
      model: 'minimax/minimax-m2.5:free',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function getSmartRecommendations(events: MontanitaEvent[], userInterest: string): Promise<{ text: string, sources: any[] }> {
  const eventList = events.map(e => `${e.title} at ${e.sector} (${e.vibe} vibe)`).join(", ");

  try {
    const text = await callOpenRouter([
      { role: 'user', content: `User is interested in: "${userInterest}". 
      Context: Today in Montañita, Ecuador. 
      Local Events: ${eventList}. 
      Task: Suggest the top 2 events based on their interest AND real-time context like weather or swell if relevant. 
      Tone: Beachy, professional, concise.` },
    ]);

    return {
      text: text || "Couldn't generate recommendations right now.",
      sources: []
    };
  } catch (error) {
    console.error("AI Error:", error);
    return {
      text: "The ocean is a bit choppy for AI right now. Try again later!",
      sources: []
    };
  }
}

export async function generateEventDescription(title: string, sector: Sector): Promise<string> {
  try {
    const text = await callOpenRouter([
      { role: 'user', content: `Create a captivating 20-word description for an event called "${title}" located in the "${sector}" area of Montañita, Ecuador.` },
    ]);
    return text || "Epic vibes incoming!";
  } catch (error) {
    return "Something amazing is happening!";
  }
}

export async function getPlannerRecommendations(user: UserProfile | null, businesses: Business[], locality: string): Promise<PlannerSection[]> {
  const localBusinesses = businesses.filter(b => b.locality === locality);
  const otherBusinesses = businesses.filter(b => b.locality !== locality);
  
  const bizList = localBusinesses.map(b => `ID:${b.id}|${b.name} (${b.category} in ${b.sector} sector, ${b.plan === 'Expert' || b.plan === 'Premium' ? 'Premium' : ''} ${b.isReference ? 'Landmark' : ''})`).join(", ");
  const otherBizList = otherBusinesses.filter(b => b.plan === 'Expert' || b.plan === 'Premium').slice(0, 10).map(b => `ID:${b.id}|${b.name} in ${b.locality}`).join(", ");
  
  const userVibe = user?.preferredVibe || "General";

  try {
    const text = await callOpenRouter([
      { role: 'system', content: 'You are a JSON-only response generator. Return ONLY valid JSON, no markdown, no explanation.' },
      { role: 'user', content: `Context: Local 24-hour planner for a visitor in ${locality}, Ecuador. 
      User Style/Mood: ${userVibe}.
      
      Available Local Options (Prioritize these): ${bizList}. 
      Alternative Options in nearby Towns: ${otherBizList}.
      
      Task: Create a personalized 24-hour itinerary (Morning, Midday, Afternoon, Night). 
      Rules:
      1. Align the plan with the user's style: ${userVibe}.
      2. Include at least ONE Landmark (Reference point) in ${locality}.
      3. Prioritize Premium/Expert businesses in ${locality}.
      4. Suggest ONE high-quality alternative in a nearby town if it fits the user's style better than local options for a specific time slot.
      
      Return ONLY a JSON array of objects with keys: category, title, emoji, businessName, recommendation, isPremium, businessId.
      IMPORTANT: For businessName, use the EXACT name from the list above and set businessId to the EXACT ID (the part after "ID:" and before "|"). If no business matches, set businessId to null.` },
    ], true);

    const cleanText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Planner AI Error:", error);
    return [];
  }
}

export async function getRecommendationForUser(events: MontanitaEvent[], businesses: Business[], userAnswer: string): Promise<PlannerSection[]> {
  const eventList = events.map(e => `${e.title} (${e.vibe} vibe in ${e.sector} sector)`).join(", ");
  
  const relevantBusinesses = businesses.filter(b => 
    b.plan === 'Expert' || b.plan === 'Premium' || b.isReference
  ).map(b => `ID:${b.id}|${b.name} (${b.category} in ${b.sector} sector, ${b.plan === 'Expert' || b.plan === 'Premium' ? 'Premium' : ''} ${b.isReference ? 'Landmark/Reference' : ''})`).join(", ");

  try {
    const text = await callOpenRouter([
      { role: 'system', content: 'You are a JSON-only response generator. Return ONLY valid JSON, no markdown, no explanation.' },
      { role: 'user', content: `User Answer: "${userAnswer}". 
      Context: We are in Montañita, Ecuador. 
      Today's Pulse (Events): ${eventList}.
      Featured Businesses & Landmarks (with IDs): ${relevantBusinesses}.
      
      Task: Recommend the BEST options (1-3) based on the user's query.
      Prioritization Rules:
      1. Priority 1: Events happening today (Today's Pulse).
      2. Priority 2: Premium/Expert businesses that match the query.
      3. Priority 3: Landmarks or Reference Points (Puntos de referencia).
      
      Return ONLY a JSON array of objects with keys: category, title, emoji, businessName, recommendation, isPremium, businessId.
      Rule: Set "category" to "RECOMENDACIÓN". Use "isPremium" true for Expert/Premium businesses.
      IMPORTANT: For businessName, use the EXACT name from the list above and set businessId to the EXACT ID (the part after "ID:" and before "|"). If no business matches, set businessId to null.` },
    ], true);

    const cleanText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Recommendation AI Error:", error);
    return [];
  }
}
