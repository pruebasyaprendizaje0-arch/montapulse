import { BusinessCategory, Sector } from '../types';

const OPENROUTER_URL = '/api/ai/openrouter';

export interface ProspectSuggestion {
  name: string;
  category: BusinessCategory;
  sector: Sector;
  locality: string;
  description: string;
  contact: string;
  aiPitch: string;
  estimatedPlan: 'Pro' | 'Elite' | 'Expert';
}

export async function generateProspects(
  category: BusinessCategory,
  locality: string,
  focus?: string,
  model: string = 'google/gemini-2.5-flash'
): Promise<ProspectSuggestion[]> {
  const sectorsList = Object.values(Sector).join(', ');
  
  const systemPrompt = `Eres un experto agente de desarrollo comercial de MontaPulse, la plataforma interactiva y app líder de turismo y eventos de la costa de Ecuador (Montañita, Olón, Manglaralto, Ayangue, Puerto López, etc.).
Tu objetivo es sugerir prospectos (negocios potenciales reales o hiper-realistas) para que se unan a nuestra plataforma.
Responde de manera concisa y estrictamente en formato JSON, sin markdown, explicaciones ni preámbulos.`;

  const userPrompt = `Genera exactamente 3 prospectos de negocios reales o altamente realistas en la localidad de "${locality}" de la categoría "${category}".
  
${focus ? `Foco o detalles específicos proporcionados por el administrador: "${focus}"` : ''}

Por cada prospecto debes proponer:
1. Nombre del negocio.
2. Categoría (debe ser exactamente: "${category}").
3. Sector: Debe ser exactamente uno de los siguientes valores válidos de sector: ${sectorsList}. (Elige el que sea geográficamente más adecuado para el negocio en esa localidad. Por ejemplo, en Montañita los sectores típicos son Centro, Playa, Montaña; para Olón o Ayangue suele ser Centro, Playa, Norte, Sur, etc.).
4. Descripción/Propuesta de valor: Una breve descripción (máximo 25 palabras) de qué ofrece el negocio y por qué encajaría bien en MontaPulse.
5. Canal de contacto recomendado (por ejemplo, "Instagram: @nombre", "WhatsApp: +593...", o un correo).
6. Mensaje de Venta Personalizado (Pitch de Ventas): Un mensaje de aproximación muy atractivo y amigable (máximo 70 palabras), con un tono fresco, playero pero profesional (vibe de Montañita/costa). Debe presentarse en español y explicar al dueño del negocio los beneficios de publicar sus eventos (Pulsos) y promociones en nuestro mapa interactivo de MontaPulse para atraer a cientos de turistas que usan la app diariamente.
7. Plan sugerido: Uno de los siguientes valores: 'Pro', 'Elite', 'Expert'.

Devuelve ÚNICAMENTE un array JSON que contenga objetos con las siguientes llaves exactas: "name", "category", "sector", "locality", "description", "contact", "aiPitch", "estimatedPlan".
IMPORTANTE: Devuelve la respuesta en formato JSON plano y limpio. No envuelvas el JSON en marcas de código de markdown de triple comilla (como \`\`\`json).`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        jsonMode: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter Proxy error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    // Clean up any markdown blocks just in case the model ignored instructions
    const cleanContent = rawContent.replace(/```json|```/g, '').trim();
    if (!cleanContent) {
      throw new Error('El modelo devolvió una respuesta vacía');
    }

    const prospects = JSON.parse(cleanContent) as ProspectSuggestion[];
    
    // Sanitize sectors to match exact enum values
    const validSectors = Object.values(Sector) as string[];
    return prospects.map(p => {
      // Find matching sector or default to Sector.CENTRO
      let matchingSector = Sector.CENTRO;
      const matched = validSectors.find(s => s.toLowerCase() === p.sector?.toString().toLowerCase());
      if (matched) {
        matchingSector = matched as Sector;
      }
      
      return {
        ...p,
        sector: matchingSector,
        locality: p.locality || locality,
        category: p.category || category
      };
    });
  } catch (error) {
    console.error('Error al generar prospectos con IA:', error);
    throw error;
  }
}

export async function generateCustomPitch(
  leadName: string,
  category: string,
  locality: string,
  notes?: string,
  instructions?: string,
  model: string = 'google/gemini-2.5-flash'
): Promise<string> {
  const systemPrompt = `Eres un experto redactor comercial y agente de desarrollo de negocios para MontaPulse, la app líder de turismo y eventos de la costa ecuatoriana.
Tu objetivo es redactar un mensaje de ventas persuasivo y atractivo para convencer a un negocio local de unirse a nuestra plataforma.`;

  const userPrompt = `Redacta un mensaje de aproximación comercial de máximo 75 palabras para el negocio "${leadName}" (Categoría: "${category}", Localidad: "${locality}").
${notes ? `Notas especiales del negocio: "${notes}"` : ''}
${instructions ? `Instrucciones del administrador: "${instructions}"` : ''}

El tono debe ser muy amigable, fresco, playero pero sumamente profesional. Destaca el beneficio clave de publicar sus eventos y ofertas en el mapa interactivo de MontaPulse para que cientos de turistas y locales los encuentren en tiempo real. Responde ÚNICAMENTE con el cuerpo del mensaje, sin introducciones ni comentarios adicionales.`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 'No se pudo generar el pitch de ventas.';
  } catch (error) {
    console.error('Error al generar pitch personalizado:', error);
    throw error;
  }
}

