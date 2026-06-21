
import { MontanitaEvent, Sector, Business, UserProfile, SubscriptionPlan } from "../types";

export interface PlannerSection {
  category: string;
  title: string;
  emoji: string;
  businessName?: string;
  recommendation: string;
  isPremium?: boolean;
  businessId?: string;
}

const OPENROUTER_URL = '/api/ai/openrouter';

async function callOpenRouter(messages: { role: string; content: string }[], jsonMode?: boolean): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      jsonMode,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter Proxy error: ${response.status} - ${err}`);
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
  
  const bizList = localBusinesses.map(b => `ID:${b.id}|${b.name} (${b.category} in ${b.sector} sector, ${b.plan === SubscriptionPlan.EXPERT || b.plan === SubscriptionPlan.ELITE ? 'Premium' : ''} ${b.isReference ? 'Landmark' : ''})`).join(", ");
  const otherBizList = otherBusinesses.filter(b => b.plan === SubscriptionPlan.EXPERT || b.plan === SubscriptionPlan.ELITE).slice(0, 10).map(b => `ID:${b.id}|${b.name} in ${b.locality}`).join(", ");
  
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
    b.plan === SubscriptionPlan.EXPERT || b.plan === SubscriptionPlan.ELITE || b.isReference
  ).map(b => `ID:${b.id}|${b.name} (${b.category} in ${b.sector} sector, ${b.plan === SubscriptionPlan.EXPERT || b.plan === SubscriptionPlan.ELITE ? 'Premium' : ''} ${b.isReference ? 'Landmark/Reference' : ''})`).join(", ");

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

export type MarketingQueryType = 'social_media' | 'lightning_offer' | 'keywords' | 'thematic_ideas' | 'customer_preferences' | 'seo_geo';

export async function getMarketingRecommendations(
  business: Business,
  metrics: { monthlyViews: number, totalClicks: number, impactCount: number, followers: number },
  queryType: MarketingQueryType
): Promise<{ text: string }> {
  
  let taskDescription = "";
  
  switch (queryType) {
    case 'social_media':
      taskDescription = "Redacta un texto atractivo y persuasivo para una publicación en redes sociales (Instagram/Facebook) promocionando este negocio. Usa emojis y un tono invitador.";
      break;
    case 'lightning_offer':
      taskDescription = "Sugiere 3 ideas creativas para 'ofertas relámpago' (promociones por tiempo limitado) que este negocio podría lanzar hoy para atraer más clientes, basándote en su categoría.";
      break;
    case 'keywords':
      taskDescription = "Proporciona una lista de 10 palabras clave (keywords) y hashtags altamente relevantes que este negocio debería usar en su marketing digital para mejorar su visibilidad local en Montañita.";
      break;
    case 'thematic_ideas':
      taskDescription = "Sugiere 2 ideas para días o semanas temáticas (ej. 'Martes de Tacos', 'Semana del Surfista') que el negocio podría organizar para crear un evento recurrente o promoción especial.";
      break;
    case 'customer_preferences':
      taskDescription = "Analiza las métricas actuales del negocio y sugiere qué tipo de contenido, productos o servicios podrían gustarle más a sus clientes actuales para aumentar el 'engagement'.";
      break;
    case 'seo_geo':
      taskDescription = "Proporciona una estrategia de posicionamiento web (SEO) y búsqueda geográfica (GEO) para este negocio. Incluye recomendaciones de palabras clave locales por intención de búsqueda y consejos específicos para destacar en búsquedas basadas en mapas (como Google Maps, Apple Maps y ubicame.info).";
      break;
  }

  const systemPrompt = `Eres un asistente experto en marketing digital para negocios locales en Montañita, Ecuador.
Tu objetivo es proporcionar consejos de marketing accionables, creativos y basados en datos.
Responde de manera concisa, profesional pero con un tono amigable y playero (vibe Montañita).
NO uses formato markdown complejo, solo texto claro, listas con guiones y emojis.`;

  const userPrompt = `
Información del Negocio:
- Nombre: ${business.name}
- Categoría: ${business.category}
- Sector: ${business.sector}
- Descripción: ${business.description || 'No especificada'}

Métricas Actuales en la App:
- Vistas este mes: ${metrics.monthlyViews}
- Clicks totales en eventos: ${metrics.totalClicks}
- Nivel de interés (Impacto): ${metrics.impactCount}
- Seguidores: ${metrics.followers}

Tarea: ${taskDescription}
`;

  try {
    const text = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return {
      text: text || "No se pudo generar la recomendación en este momento.",
    };
  } catch (error) {
    console.error("Marketing AI Error:", error);
    return {
      text: "Hubo un problema al consultar la IA. Por favor, intenta de nuevo más tarde.",
    };
  }
}
