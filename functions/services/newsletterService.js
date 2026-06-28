import { Resend } from 'resend';

// Lazily initialize Resend client to avoid ESM environment variable hoisting issues
let resend;
const getResendClient = () => {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
  }
  return resend;
};

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
 * Uses premium, high-impact design matching the "ubicame.info" brand
 */
export const generateNewsletterHtml = (userName, events, communityPosts = [], reminders = []) => {
  // 1. Generate Event Cards HTML
  const eventCardsHtml = events.map(event => `
    <div style="background: #181524; border: 1px solid #ff007f30; border-radius: 20px; overflow: hidden; margin-bottom: 28px; box-shadow: 0 8px 30px rgba(255, 0, 127, 0.08); transition: transform 0.2s ease;">
      ${event.imageUrl ? `
        <div style="position: relative;">
          <img src="${event.imageUrl}" alt="${event.title || event.name}" style="width: 100%; height: 220px; object-fit: cover; display: block;" />
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(24, 21, 36, 1), rgba(24, 21, 36, 0)); height: 60px;"></div>
        </div>
      ` : ''}
      <div style="padding: 24px; position: relative;">
        <span style="background: rgba(255, 0, 127, 0.1); border: 1px solid #ff007f50; color: #ff007f; padding: 4px 12px; border-radius: 30px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 12px; font-family: 'Outfit', sans-serif;">
          ${event.category || 'Destacado'}
        </span>
        <h3 style="color: #00f0ff; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 800; font-family: 'Outfit', 'Inter', sans-serif; letter-spacing: -0.5px; line-height: 1.3;">
          ${event.title || event.name || 'Evento Especial'}
        </h3>
        <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 20px; line-height: 1.6; font-family: 'Inter', sans-serif;">
          ${event.description || 'Disfruta de esta experiencia espectacular en la costa ecuatoriana.'}
        </p>
        <div style="border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 16px; font-size: 13px; color: #94a3b8; font-family: 'Inter', sans-serif;">
          <div style="margin-bottom: 8px; display: flex; align-items: center;">
            <span style="margin-right: 8px;">📍</span> <strong>Ubicación:</strong> &nbsp;${event.sector || event.locality || 'Montañita'}
          </div>
          <div style="display: flex; align-items: center;">
            <span style="margin-right: 8px;">⏰</span> <strong>Horario:</strong> &nbsp;${formatEventDate(event.startAt || event.date)}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // 2. Generate Community Posts HTML (Defaults if none queried)
  const finalCommunityPosts = communityPosts.length > 0 ? communityPosts : [
    {
      authorName: 'Comunidad Surf Olón',
      content: '¡Buenas olas reportadas para este fin de semana en Olón! Se prevé oleaje constante ideal para intermedios.'
    },
    {
      authorName: 'Montañita Clima',
      content: 'Cielo parcialmente nublado con atardeceres despejados. ¡Momento perfecto para fotografía en la punta!'
    }
  ];

  const communityHtml = finalCommunityPosts.map(post => `
    <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; padding: 18px; margin-bottom: 16px;">
      <h4 style="color: #ffffff; margin: 0 0 6px 0; font-size: 14px; font-weight: bold; font-family: 'Outfit', sans-serif;">
        📢 ${post.authorName || 'Usuario de Ubícame'}
      </h4>
      <p style="color: #94a3b8; margin: 0; font-size: 13px; line-height: 1.5; font-family: 'Inter', sans-serif;">
        "${post.content}"
      </p>
    </div>
  `).join('');

  // 3. Generate Quick Reminders HTML
  const finalReminders = reminders.length > 0 ? reminders : [
    '🌅 Apoya a los comercios locales usando **Ubícame.info** para verificar horarios oficiales.',
    '🌊 Recuerda respetar las señales de bandera en la playa antes de ingresar al mar.',
    '♻️ Mantengamos nuestras playas limpias: lleva contigo cualquier residuo al retirarte.'
  ];

  const remindersHtml = finalReminders.map(reminder => `
    <li style="margin-bottom: 10px; color: #cbd5e1; font-size: 13px; line-height: 1.5; font-family: 'Inter', sans-serif;">
      ${reminder}
    </li>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Pulse - MontaPulse</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Inter:wght@400;500;600&display=swap');
        body {
          margin: 0; padding: 0; background-color: #09070f; font-family: 'Inter', sans-serif;
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #09070f; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #09070f; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 600px; background-color: #09070f; border-collapse: collapse;">
              
              <!-- Premium Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #ff007f 0%, #7928ca 50%, #00f0ff 100%); padding: 48px 30px; text-align: center; border-radius: 28px 28px 0 0; box-shadow: 0 10px 30px rgba(255, 0, 127, 0.2);">
                  <h1 style="color: #ffffff; margin: 0; font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 36px; letter-spacing: 3px; text-shadow: 0 4px 15px rgba(0,0,0,0.4);">
                    MONTAPULSE
                  </h1>
                  <p style="color: #ffffff; margin: 8px 0 0 0; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; opacity: 0.95;">
                    Weekly Pulse
                  </p>
                </td>
              </tr>

              <!-- Main Content Body -->
              <tr>
                <td style="padding: 40px 30px; background-color: #0f0d16; border-left: 1px solid #ffffff05; border-right: 1px solid #ffffff05;">
                  <h2 style="color: #ffffff; font-family: 'Outfit', sans-serif; margin-top: 0; margin-bottom: 12px; font-size: 24px; font-weight: 700;">
                    ¡Hola, ${userName || 'Pulser'}! 👋
                  </h2>
                  <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 32px; font-family: 'Inter', sans-serif;">
                    Te traemos la vibrante energía y la cartelera oficial de eventos para este fin de semana en Montañita, Olón y la costa de Santa Elena. ¡No te quedes fuera!
                  </p>
                  
                  <!-- Events Section -->
                  <h3 style="color: #ffffff; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: bold; margin-bottom: 20px; border-left: 4px solid #ff007f; padding-left: 12px; letter-spacing: 0.5px;">
                    🔥 Eventos Destacados de la Semana
                  </h3>
                  ${eventCardsHtml}
                  
                  <!-- Community Highlights Section -->
                  <h3 style="color: #ffffff; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: bold; margin-top: 40px; margin-bottom: 20px; border-left: 4px solid #00f0ff; padding-left: 12px; letter-spacing: 0.5px;">
                    💬 Ecos de la Comunidad
                  </h3>
                  ${communityHtml}
                  
                  <!-- Quick Reminders Section -->
                  <h3 style="color: #ffffff; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: bold; margin-top: 40px; margin-bottom: 20px; border-left: 4px solid #7928ca; padding-left: 12px; letter-spacing: 0.5px;">
                    💡 Recordatorios Rápidos
                  </h3>
                  <ul style="padding-left: 20px; margin: 0 0 36px 0;">
                    ${remindersHtml}
                  </ul>

                  <!-- Main CTA -->
                  <div style="text-align: center; margin-top: 40px; margin-bottom: 10px;">
                    <a href="https://www.ubicame.info" target="_blank" style="background: linear-gradient(90deg, #ff007f 0%, #00f0ff 100%); color: #09070f; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 15px; text-transform: uppercase; letter-spacing: 2px; display: inline-block; box-shadow: 0 8px 25px rgba(255, 0, 127, 0.35);">
                      Ver Cartelera Completa
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px 20px; text-align: center; border-top: 1px solid #ffffff05; background-color: #09070f; border-radius: 0 0 28px 28px;">
                  <p style="color: #4a455a; font-size: 11px; margin: 0 0 8px 0; line-height: 1.5; font-family: 'Inter', sans-serif;">
                    Recibes este correo porque te suscribiste a las alertas de MontaPulse.
                  </p>
                  <p style="color: #4a455a; font-size: 11px; margin: 0; line-height: 1.5; font-family: 'Inter', sans-serif;">
                    © 2026 MontaPulse / Ubícame.info. Todos los derechos reservados.
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
 * @param {Array} [communityPosts] - Optional recent community posts
 * @returns {Promise<Object>} - Object with success, sent count, and responses/errors
 */
export async function enviarPulseSemanal(usuarios, eventos, communityPosts = []) {
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
      const emailHtml = generateNewsletterHtml(user.name || user.displayName, eventos, communityPosts);
      
      return {
        from: 'MontaPulse <boletin@ubicame.info>',
        to: user.email,
        subject: '⚡ ¡Tu Pulse Semanal de Montañita ya está aquí!',
        html: emailHtml
      };
    });

    try {
      console.log(`[Newsletter] Enviando lote ${j + 1}/${batches.length} con ${currentBatch.length} correos...`);
      const response = await getResendClient().batch.send(emailObjects);
      
      if (response.error) {
        console.error(`[Newsletter] Error de Resend en lote ${j + 1}:`, response.error);
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
