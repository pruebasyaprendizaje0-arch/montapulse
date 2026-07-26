/**
 * googleApiService.ts - Conector API de Google Apps Script (Web App)
 * Migrado a TypeScript para soporte e integración nativa en Montapulse.
 */

const GAS_WEBAPP_URL = "https://script.google.com/macros/s/xxxxxxxxx/exec";
const DEFAULT_TIMEOUT = 10000;

interface FetchOptions extends RequestInit {
  timeout?: number;
  params?: Record<string, string>;
}

interface ApiResponse<T> {
  status: number;
  success: boolean;
  data: T;
}

export interface Contacto {
  id?: string;
  tenant_id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  tipo_usuario?: string;
  estado?: string;
  fecha_registro?: string;
}

export interface ReadingResponse {
  success: boolean;
  lectura_id: string;
  consumo_m3: number;
  foto_drive_url: string;
  anomalia: boolean;
  google_task_id?: string;
}

export interface AlertResponse {
  success: boolean;
  response_code: number;
}

async function fetchWithRetry<T>(url: string, options: FetchOptions = {}, retries = 2, delay = 1000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);
  
  const fetchOptions: RequestInit = {
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      ...options.headers,
    }
  };

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error: Status ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();
    
    if (result.status && (result.status < 200 || result.status >= 300)) {
      throw new Error((result.data as any)?.error || `Error en Backend (Status ${result.status})`);
    }

    return result.data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.warn("⚠️ Petición cancelada por Timeout.");
    }

    if (retries > 0) {
      console.warn(`🔄 Reintentando en ${delay}ms... (${retries} restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry<T>(url, options, retries - 1, delay * 1.5);
    }
    
    throw error;
  }
}

export const googleApiService = {
  /**
   * Obtiene los contactos filtrados por tenant.
   */
  async getContacts(tenantId: string): Promise<Contacto[]> {
    if (!tenantId) throw new Error("Falta el parámetro 'tenantId'");
    
    const params = new URLSearchParams({
      action: "getContacts",
      tenant_id: tenantId
    });
    
    return fetchWithRetry<Contacto[]>(`${GAS_WEBAPP_URL}?${params.toString()}`, {
      method: "GET"
    });
  },

  /**
   * Registra una lectura de agua en la base de datos de Sheets.
   */
  async addReadingWithPhoto(
    tenantId: string, 
    { socio_id, lectura_actual, fotoFile }: { socio_id: string; lectura_actual: number; fotoFile?: File | Blob | null }
  ): Promise<ReadingResponse> {
    if (!tenantId || !socio_id || isNaN(lectura_actual)) {
      throw new Error("Parámetros del formulario inválidos.");
    }

    let fotoBase64 = "";
    let fotoNombre = "";

    if (fotoFile) {
      fotoNombre = (fotoFile as File).name || "archivo.png";
      fotoBase64 = await convertFileToBase64(fotoFile);
    }

    return fetchWithRetry<ReadingResponse>(GAS_WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addReadingWithPhoto",
        tenant_id: tenantId,
        socio_id: socio_id,
        lectura_actual: lectura_actual,
        foto_base64: fotoBase64,
        foto_nombre: fotoNombre
      })
    });
  },

  /**
   * Envía una alerta HTTP POST a un webhook de Google Chat.
   */
  async sendAlertWebhook(tenantId: string, webhookUrl: string, mensaje: string): Promise<AlertResponse> {
    if (!tenantId || !webhookUrl || !mensaje) {
      throw new Error("Faltan parámetros obligatorios.");
    }

    return fetchWithRetry<AlertResponse>(GAS_WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "sendAlertWebhook",
        tenant_id: tenantId,
        webhook_url: webhookUrl,
        mensaje: mensaje
      })
    });
  }
};

function convertFileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
