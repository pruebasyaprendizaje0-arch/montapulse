export interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface SendEmailResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: any;
}

/**
 * Sends an email using the backend Resend integration route.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResponse> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errData.message || `Error del servidor: ${response.status}`,
        error: errData.error || errData
      };
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error in sendEmail service:', error);
    return {
      success: false,
      message: error.message || 'Error de red al intentar enviar el correo.',
    };
  }
}
