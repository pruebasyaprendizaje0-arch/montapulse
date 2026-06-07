import { Resend } from 'resend';

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

/**
 * Formats a date object/timestamp/string into a readable format for Ecuador
 */
const formatEventDate = (date) => {
  if (!date) return 'Por confirmar';
  if (date.toDate && typeof date.toDate === 'function') {
    return date.toDate().toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' });
  }
  const d = new Date(date);
  return isNaN(d.getTime()) ? date : d.toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' });
};

/**
 * Generates the HTML template for the weekly newsletter
 * Uses vibrant Montañita colors (pink #ff007f and cyan)
 */
export const generateNewsletterHtml = (userName, events) => {
  const eventCardsHtml = events.map(event => `
    <div style="background-color: #1e1b29; border: 1px solid #ff007f40; border-radius: 16px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 15px rgba(255, 0, 127, 0.15); max-width: 100%;">
      ${event.imageUrl ? `<img src="${event.imageUrl}" alt="${event.title || event.name}" style="width: 100%; height: 200px; object-fit: cover;" />` : ''}
      <div style="padding: 20px;">
        <h3 style="color: #00f0ff; margin-top: 0; margin-bottom: 10px; font-size: 18px; font-weight: bold; font-family: 'Outfit', 'Inter', sans-serif;">
          ${event.title || event.name || 'Evento Especial'}
        </h3>
        <p style="color: #e2e8f0; font-size: 14px; margin-bottom: 15px; line-height: 1.5; font-family: 'Inter', sans-serif;">
          ${event.description || 'No te pierdas de esta increíble experiencia en la costa.'}
        </p>
        <div style="border-top: 1px solid #ffffff10; padding-top: 12px; font-size: 12px; color: #a0aec0; font-family: 'Inter', sans-serif;">
          <div style="margin-bottom: 4px;">📍 <strong>Lugar:</strong> ${event.sector || event.locality || 'Montañita'}</div>
          <div>⏰ <strong>Hora:</strong> ${formatEventDate(event.startAt || event.date)}</div>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Pulse - MontaPulse</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Inter:wght@400;600&display=swap');
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0d0b14; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d0b14; padding: 20px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" max-width="600" style="max-width: 600px; width: 100%; background-color: #0d0b14; border-collapse: collapse;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #ff007f 0%, #7928ca 100%); padding: 40px 20px; text-align: center; border-radius: 24px 24px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 32px; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    MONTAPULSE
                  </h1>
                  <p style="color: #00f0ff; margin: 8px 0 0 0; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase;">
                    Weekly Pulse
                  </p>
                </td>
              </tr>
              <!-- Greeting -->
              <tr>
                <td style="padding: 30px 20px; background-color: #0d0b14;">
                  <h2 style="color: #ffffff; font-family: 'Outfit', sans-serif; margin-top: 0; font-size: 22px;">
                    ¡Hola, ${userName || 'Pulser'}! 👋
                  </h2>
                  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 30px; font-family: 'Inter', sans-serif;">
                    Te traemos la vibrante energía y los mejores eventos de esta semana en Montañita y la costa ecuatoriana. ¡Prepárate para vivir experiencias inolvidables!
                  </p>
                  
                  <!-- Events List -->
                  ${eventCardsHtml}
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin-top: 40px; margin-bottom: 20px;">
                    <a href="https://www.ubicame.info" target="_blank" style="background: linear-gradient(90deg, #ff007f 0%, #00f0ff 100%); color: #000000; text-decoration: none; padding: 16px 36px; border-radius: 50px; font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 2px; display: inline-block; box-shadow: 0 4px 20px rgba(255, 0, 127, 0.4);">
                      Explorar en Ubícame.info
                    </a>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 20px; text-align: center; border-top: 1px solid #ffffff05; background-color: #0d0b14;">
                  <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5; font-family: 'Inter', sans-serif;">
                    Estás recibiendo este correo porque estás registrado en MontaPulse.<br/>
                    © 2026 MontaPulse. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/**
 * Sends a weekly pulse newsletter to a list of users with Montañita events.
 * Uses resend.batch.send to send up to 100 emails per request.
 * 
 * @param {Array} usuarios - List of user objects (each having email and name)
 * @param {Array} eventos - List of event objects to feature
 * @returns {Promise<Object>} - Object with success, sent count, and responses/errors
 */
export async function enviarPulseSemanal(usuarios, eventos) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado en las variables de entorno.');
  }

  if (!usuarios || usuarios.length === 0) {
    return { success: true, message: 'No hay usuarios en la lista para enviar.', sentCount: 0 };
  }

  if (!eventos || eventos.length === 0) {
    return { success: true, message: 'No hay eventos disponibles para el newsletter.', sentCount: 0 };
  }

  const batchSize = 100;
  const batches = [];
  
  // Divide users into chunks of 100
  for (let i = 0; i < usuarios.length; i += batchSize) {
    batches.push(usuarios.slice(i, i + batchSize));
  }

  const results = [];
  let totalSent = 0;

  console.log(`[Newsletter] Iniciando envío de Pulse Semanal. Destinatarios totales: ${usuarios.length}. Lotes totales: ${batches.length}`);

  for (let j = 0; j < batches.length; j++) {
    const currentBatch = batches[j];
    
    // Construct the email objects for Resend batch send
    const emailObjects = currentBatch.map(user => {
      const emailHtml = generateNewsletterHtml(user.name || user.displayName, eventos);
      
      return {
        from: 'MontaPulse <onboarding@resend.dev>', // Default testing domain
        to: user.email,
        subject: '⚡ ¡Tu Pulse Semanal de Montañita ya está aquí!',
        html: emailHtml
      };
    });

    try {
      console.log(`[Newsletter] Enviando lote ${j + 1}/${batches.length} con ${currentBatch.length} correos...`);
      const response = await resend.batch.send(emailObjects);
      
      if (response.error) {
        console.error(`[Newsletter] Error en lote ${j + 1}:`, response.error);
        results.push({ batch: j + 1, success: false, error: response.error });
      } else {
        totalSent += currentBatch.length;
        results.push({ batch: j + 1, success: true, data: response.data });
      }
    } catch (error) {
      console.error(`[Newsletter] Error crítico en lote ${j + 1}:`, error.message);
      results.push({ batch: j + 1, success: false, error: error.message });
    }
  }

  return {
    success: totalSent > 0,
    sentCount: totalSent,
    batchesCount: batches.length,
    results
  };
}
