
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const OPENROUTER_URL = '/api/ai/openrouter';

const SYSTEM_PROMPT = `Eres un experto planificador de viajes local para Montañita, Ecuador y pueblos cercanos (Olón, Manglaralto, Ayangue, Puerto López, etc.).

Tu rol es ayudar a los visitantes a crear planes de 24 horas, recomendar actividades, restaurantes, bares, lugares para surfear, hospedajes y experiencias únicas.

Reglas:
1. Siempre da respuestas útiles y prácticas con nombres reales de lugares si los conoces
2. Sé conciso pero informativo
3. Usa emojis para hacer la respuesta más visual
4. Responde en español a menos que el usuario hable en otro idioma
5. Incluye horarios aproximados y consejos locales
6. Si no estás seguro de algo, sé honesto pero da tu mejor recomendación
7. Prioriza experiencias auténticas y locales sobre turísticas genéricas`;


export async function sendChatMessage(messages: ChatMessage[], model?: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter Proxy API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No pude generar una respuesta. Intenta de nuevo.';
}

export async function sendChatMessageStream(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  model?: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter Proxy API error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No stream reader available');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const content = json.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      } catch {
        // skip malformed lines
      }
    }
  }
}

