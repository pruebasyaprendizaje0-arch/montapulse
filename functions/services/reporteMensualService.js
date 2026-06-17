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
 * Generates a clean, corporate HTML layout showing performance metrics for the business
 */
export const generateReportHtml = (nombreNegocio, metricas) => {
  // Generate table rows dynamically from the metrics object
  const tableRowsHtml = Object.entries(metricas).map(([key, value]) => {
    // Format metric names nicely (e.g. capitalize first letter of each word)
    const formattedKey = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
      
    return `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; font-weight: 500; font-family: 'Inter', sans-serif;">
          ${formattedKey}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 700; text-align: right; font-family: 'Inter', sans-serif;">
          ${typeof value === 'number' ? value.toLocaleString('es-EC') : value}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte Mensual de Rendimiento - Ubícame.info</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" max-width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; border-collapse: collapse; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
              <!-- Header -->
              <tr>
                <td style="background-color: #0f172a; padding: 32px 40px; text-align: left; border-radius: 16px 16px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; font-family: 'Inter', sans-serif;">
                    Ubícame.info <span style="color: #10b981; font-weight: 500;">Socios</span>
                  </h1>
                  <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px; font-family: 'Inter', sans-serif;">
                    Reporte de Rendimiento Comercial
                  </p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px; background-color: #ffffff;">
                  <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 600; margin-bottom: 8px; font-family: 'Inter', sans-serif;">
                    Estimado/a de ${nombreNegocio},
                  </h2>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px; font-family: 'Inter', sans-serif;">
                    A continuación, te presentamos el reporte consolidado de actividad y rendimiento de tu establecimiento en la plataforma **Ubícame.info** correspondiente al último mes.
                  </p>

                  <!-- Metrics Table -->
                  <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 32px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <thead>
                       <tr style="background-color: #f1f5f9;">
                        <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; font-family: 'Inter', sans-serif;">
                          Métrica de Rendimiento
                        </th>
                        <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; font-family: 'Inter', sans-serif;">
                          Total Mensual
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      ${tableRowsHtml}
                    </tbody>
                  </table>

                  <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px; font-family: 'Inter', sans-serif;">
                    Estas métricas reflejan el interés y la interacción directa de turistas y locales buscando servicios y experiencias en la costa. Si adjuntamos un archivo en formato PDF, podrás encontrar el desglose diario en el archivo anexo de este correo.
                  </p>

                  <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
                    <p style="color: #334155; font-size: 13px; font-weight: 500; margin: 0; line-height: 1.5; font-family: 'Inter', sans-serif;">
                      💡 <strong>Tip de Crecimiento:</strong> Mantener tus ofertas (Pulsos) y horarios actualizados duplica la tasa de conversión en clics de dirección física.
                    </p>
                  </div>

                  <!-- Footer / Support info -->
                  <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0; font-family: 'Inter', sans-serif;">
                    Si tienes dudas sobre tus estadísticas o deseas mejorar tu plan comercial, escríbenos a nuestro canal de socios.
                  </p>
                </td>
              </tr>
              <!-- Footer border -->
              <tr>
                <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 16px 16px; text-align: center;">
                  <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5; font-family: 'Inter', sans-serif;">
                    Este es un correo automático enviado a los aliados comerciales de Ubícame.info.<br/>
                    © 2026 Ubícame.info. Todos los derechos reservados.
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
 * Sends a monthly B2B performance report to a business ally.
 * 
 * @param {string} email - Recipient email
 * @param {string} nombreNegocio - Name of the business partner
 * @param {Object} metricas - Object containing metrics (e.g. { visitas_al_perfil: 120, clics_en_como_llegar: 45 })
 * @param {Buffer} [pdfBuffer] - Optional PDF buffer for detailed report attachment
 * @returns {Promise<Object>} - Response object from Resend API
 */
export async function enviarReporteMensualNegocio(email, nombreNegocio, metricas, pdfBuffer = null) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado en las variables de entorno.');
  }

  if (!email || !nombreNegocio || !metricas) {
    throw new Error('Parámetros inválidos. Se requiere email, nombreNegocio y metricas.');
  }

  console.log(`[Reporte B2B] Preparando reporte mensual para: ${nombreNegocio} (${email})`);

  const htmlContent = generateReportHtml(nombreNegocio, metricas);
  const attachments = [];

  if (pdfBuffer) {
    // Sanitize filename to prevent directory traversal or invalid characters
    const sanitizedName = nombreNegocio.replace(/[^a-zA-Z0-9]/g, '_');
    attachments.push({
      filename: `Reporte_Mensual_${sanitizedName}.pdf`,
      content: pdfBuffer,
    });
    console.log(`[Reporte B2B] Adjuntando reporte PDF de rendimiento para ${nombreNegocio}`);
  }

  try {
    const data = await getResendClient().emails.send({
      from: 'socios@ubicame.info',
      to: email,
      subject: `📊 Reporte Mensual de Rendimiento - ${nombreNegocio}`,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined
    });

    if (data.error) {
      console.error('[Reporte B2B] Error de Resend API:', data.error);
      return { success: false, error: data.error };
    }

    console.log(`[Reporte B2B] Reporte enviado con éxito a ${email} (ID: ${data.data?.id})`);
    return { success: true, data: data.data };
  } catch (error) {
    console.error('[Reporte B2B] Error crítico en enviarReporteMensualNegocio:', error.message);
    return { success: false, message: error.message };
  }
}
