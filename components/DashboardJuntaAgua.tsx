import React, { useState, useEffect, useRef } from 'react';
import { googleApiService, Contacto } from '../services/googleApiService';

interface Metrics {
  consumoTotal: number;
  facturasEmitidas: number;
  tareasPendientes: number;
}

export default function DashboardJuntaAgua() {
  const [tenantId, setTenantId] = useState<string>('junta_agua');
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Formulario de lectura de agua
  const [socioId, setSocioId] = useState<string>('');
  const [lecturaActual, setLecturaActual] = useState<string>('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formMessage, setFormMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulario de alertas (Google Chat Webhook)
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertLoading, setAlertLoading] = useState<boolean>(false);
  const [alertStatus, setAlertStatus] = useState<string>('');

  // Métricas Simuladas
  const [metrics, setMetrics] = useState<Metrics>({
    consumoTotal: 125,
    facturasEmitidas: 12,
    tareasPendientes: 3
  });

  useEffect(() => {
    let isMounted = true;
    
    // Limpieza inmediata para evitar parpadeos visuales cross-tenant
    setContacts([]);
    setError('');
    setLoading(true);

    const loadData = async () => {
      try {
        const data = await googleApiService.getContacts(tenantId);
        if (isMounted) {
          setContacts(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Error al obtener los datos del Tenant.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [tenantId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setFotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearPhoto = () => {
    setFotoFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReadingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socioId || !lecturaActual) {
      setFormMessage({ type: 'error', text: 'Favor completar los campos obligatorios.' });
      return;
    }

    setFormLoading(true);
    setFormMessage({ type: 'info', text: 'Registrando lectura en Google Sheets y cargando foto en Google Drive...' });

    try {
      const result = await googleApiService.addReadingWithPhoto(tenantId, {
        socio_id: socioId,
        lectura_actual: parseFloat(lecturaActual),
        fotoFile: fotoFile
      });

      setMetrics(prev => ({
        ...prev,
        consumoTotal: prev.consumoTotal + result.consumo_m3,
        tareasPendientes: result.anomalia ? prev.tareasPendientes + 1 : prev.tareasPendientes
      }));

      setFormMessage({
        type: 'success',
        text: `¡Lectura guardada! Consumo: ${result.consumo_m3} m³.${result.anomalia ? ' ⚠️ Anomalía detectada: Tarea de inspección creada en Google Tasks.' : ''}`
      });

      setSocioId('');
      setLecturaActual('');
      clearPhoto();
    } catch (err: any) {
      setFormMessage({ type: 'error', text: `Error: ${err.message || err}` });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl || !alertMessage) return;

    setAlertLoading(true);
    setAlertStatus('Enviando payload a Google Chat...');

    try {
      await googleApiService.sendAlertWebhook(tenantId, webhookUrl, alertMessage);
      setAlertStatus('¡Alerta enviada correctamente al espacio de Google Chat!');
      setAlertMessage('');
    } catch (err: any) {
      setAlertStatus(`Error al enviar: ${err.message || err}`);
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center bg-slate-800 rounded-2xl p-6 mb-8 border border-slate-700 shadow-xl gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Junta de Agua - Dashboard ERP/CRM
          </h1>
          <p className="text-sm text-slate-400 mt-1">Ecosistema operativo multi-tenant 100% gratuito en la nube</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-700">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Proyecto Activo:</label>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="bg-transparent text-blue-400 font-bold outline-none cursor-pointer text-sm"
          >
            <option value="junta_agua" className="bg-slate-800 text-slate-100">Junta de Agua</option>
            <option value="montapulse" className="bg-slate-800 text-slate-100">Montapulse</option>
            <option value="trueque" className="bg-slate-800 text-slate-100">Trueque</option>
          </select>
        </div>
      </header>

      {/* Grid de Métricas */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-colors">
          <span className="text-3xl mb-2 block">💧</span>
          <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">Consumo Total Registrado</h3>
          <p className="text-3xl font-black text-white mt-1">{metrics.consumoTotal} <span className="text-lg font-normal text-slate-400">m³</span></p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors"></div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <span className="text-3xl mb-2 block">💵</span>
          <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">Facturas Emitidas</h3>
          <p className="text-3xl font-black text-white mt-1">{metrics.facturasEmitidas} <span className="text-lg font-normal text-slate-400">cobrables</span></p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors"></div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-colors">
          <span className="text-3xl mb-2 block">📋</span>
          <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">Tareas de Inspección</h3>
          <p className="text-3xl font-black text-white mt-1">{metrics.tareasPendientes} <span className="text-lg font-normal text-slate-400">pendientes</span></p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-amber-500/10 transition-colors"></div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario de Registro de Lectura */}
        <section className="lg:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-1">Registrar Nueva Lectura</h2>
          <p className="text-xs text-slate-400 mb-6">Guarda mediciones y genera recordatorios automáticos de vencimiento en Calendar.</p>

          <form onSubmit={handleReadingSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-2">Socio / Contacto ID *</label>
                <input
                  type="text"
                  placeholder="Ej. C001"
                  value={socioId}
                  onChange={(e) => setSocioId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 outline-none focus:border-blue-500 transition-colors text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-2">Lectura del Medidor (m³) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej. 1342.1"
                  value={lecturaActual}
                  onChange={(e) => setLecturaActual(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 outline-none focus:border-blue-500 transition-colors text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-2 font-mono">Foto de Medidor en Terreno</label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  previewUrl ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                }`}
              >
                {!previewUrl ? (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl mb-2">📷</span>
                    <p className="text-xs text-slate-400 mb-3">Arrastra la fotografía del medidor aquí o</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 text-xs px-4 py-2 rounded-lg font-medium transition-all"
                    >
                      Buscar Imagen
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <img src={previewUrl} alt="Medidor cargado" className="max-h-40 rounded-lg object-contain border border-slate-700 shadow-md" />
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                    >
                      Quitar Imagen
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {formMessage.text && (
              <div className={`p-4 rounded-xl text-xs font-medium ${
                formMessage.type === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                formMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {formMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={formLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-blue-500/10 transition-all text-sm disabled:bg-slate-700 disabled:text-slate-400"
            >
              {formLoading ? 'Registrando Lectura...' : 'Guardar y Procesar en Google Cloud'}
            </button>
          </form>
        </section>

        {/* Panel Lateral */}
        <section className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-1">Alertas Google Chat</h2>
            <p className="text-xs text-slate-400 mb-6">Envía emergencias de roturas o incidencias críticas directo a tu canal de Google Chat.</p>

            <form onSubmit={handleSendAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-2">Webhook URL de Google Chat *</label>
                <input
                  type="url"
                  placeholder="https://chat.googleapis.com/v1/spaces/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 outline-none focus:border-emerald-500 transition-colors text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-2 font-mono">Detalles de la Alerta / Falla</label>
                <textarea
                  placeholder="Fuga de agua masiva en la calle principal..."
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 outline-none focus:border-emerald-500 transition-colors text-sm h-28 resize-none"
                  required
                />
              </div>

              {alertStatus && (
                <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-center text-slate-300">
                  {alertStatus}
                </div>
              )}

              <button
                type="submit"
                disabled={alertLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all text-sm disabled:bg-slate-700"
              >
                {alertLoading ? 'Enviando Alerta...' : 'Enviar Alerta a Sala de Chat'}
              </button>
            </form>
          </div>
        </section>

      </main>
    </div>
  );
}
