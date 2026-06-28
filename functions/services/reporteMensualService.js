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
 * Generates a clean, modern, high-converting HTML report showing monthly performance metrics.
 */
export const generateReportHtml = (nombreNegocio, metricas) => {
  const formatNum = (val) => (typeof val === 'number' ? val.toLocaleString('es-EC') : val);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte Mensual de Rendimiento - Ubícame.info</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        body {
          margin: 0; padding: 0; background-color: #0b0f19; font-family: 'Inter', sans-serif;
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 600px; background-color: #0f172a; border-collapse: collapse; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
              
              <!-- Premium Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: left;">
                  <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <h1 style="color: #ffffff; margin: 0; font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 24px; letter-spacing: -0.5px;">
                          Ubícame.info <span style="font-weight: 400; color: #a7f3d0;">Socios</span>
                        </h1>
                        <p style="color: #d1fae5; margin: 4px 0 0 0; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; font-family: 'Inter', sans-serif;">
                          Reporte Mensual de Rendimiento
                        </p>
                      </td>
                      <td align="right" style="font-size: 28px;">
                        📊
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 40px 30px; background-color: #0f172a;">
                  <h2 style="color: #ffffff; margin-top: 0; font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 12px;">
                    Estimado/a de ${nombreNegocio},
                  </h2>
                  <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 30px; font-family: 'Inter', sans-serif;">
                    Te presentamos el informe detallado de interacciones y visitas de tu establecimiento en la plataforma **Ubícame.info** durante el último mes.
                  </p>

                  <!-- Modern Dashboard Grid (Table style for email compatibility) -->
                  <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                    <tr>
                      <td width="48%" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 16px; margin-bottom: 15px; vertical-align: top;">
                        <div style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Visitas al Perfil</div>
                        <div style="font-size: 28px; color: #10b981; font-weight: 800; font-family: 'Outfit', sans-serif;">
                          ${formatNum(metricas.visitas_al_perfil || 0)}
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Visitas únicas registradas</div>
                      </td>
                      <td width="4%"></td>
                      <td width="48%" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 16px; margin-bottom: 15px; vertical-align: top;">
                        <div style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Nuevos Seguidores</div>
                        <div style="font-size: 28px; color: #60a5fa; font-weight: 800; font-family: 'Outfit', sans-serif;">
                          +${formatNum(metricas.nuevos_seguidores || 0)}
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Usuarios interesados</div>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="3" height="16"></td>
                    </tr>
                    <tr>
                      <td width="48%" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 16px; vertical-align: top;">
                        <div style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Clics en Eventos</div>
                        <div style="font-size: 28px; color: #fbbf24; font-weight: 800; font-family: 'Outfit', sans-serif;">
                          ${formatNum(metricas.clicks_totales_eventos || 0)}
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Clics en tus publicaciones</div>
                      </td>
                      <td></td>
                      <td width="48%" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 16px; vertical-align: top;">
                        <div style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Vistas de la App</div>
                        <div style="font-size: 28px; color: #c084fc; font-weight: 800; font-family: 'Outfit', sans-serif;">
                          ${formatNum(metricas.vistas_generales_app || 0)}
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Interacciones totales</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Helpful Tip -->
                  <div style="background: rgba(16, 185, 129, 0.05); border-left: 4px solid #10b981; padding: 18px; border-radius: 4px 16px 16px 4px; margin-bottom: 30px;">
                    <p style="color: #e2e8f0; font-size: 13px; font-weight: 500; margin: 0; line-height: 1.5; font-family: 'Inter', sans-serif;">
                      💡 <strong>Tip Comercial:</strong> Las empresas que publican al menos un Evento o Pulso cada semana obtienen hasta un <strong>120% más de clics</strong> en sus botones de contacto directo y cómo llegar.
                    </p>
                  </div>

                  <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0; font-family: 'Inter', sans-serif;">
                    Si deseas ampliar tus campañas o tienes dudas sobre las estadísticas de tu negocio, escríbenos directamente a través del chat de soporte de tu pasaporte en Ubícame.info.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 30px; background-color: #0b0f19; border-top: 1px solid rgba(255, 255, 255, 0.03); text-align: center;">
                  <p style="color: #475569; font-size: 11px; margin: 0; line-height: 1.5; font-family: 'Inter', sans-serif;">
                    Este correo se envía automáticamente a los establecimientos registrados en la red comercial de Ubícame.info.<br/>
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
 * @param {Object} metricas - Object containing metrics
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
      console.error('[Reporte B2B] Error devuelto por la API de Resend:', data.error);
      return { success: false, error: data.error };
    }

    console.log(`[Reporte B2B] Reporte enviado con éxito a ${email} (ID: ${data.data?.id})`);
    return { success: true, data: data.data };
  } catch (error) {
    console.error('[Reporte B2B] Error crítico en enviarReporteMensualNegocio:', error.message);
    return { success: false, message: error.message };
  }
}
