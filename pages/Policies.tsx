import React from 'react';
import { Shield, Lock, FileText, ChevronLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Policies: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-y-auto pb-32 selection:bg-orange-500/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <div className="sticky top-0 z-50 bg-slate-950/60 backdrop-blur-2xl border-b border-white/5 p-6 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-slate-900 border border-white/5 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 group mb-0"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-sm font-black uppercase tracking-[0.3em] bg-gradient-to-r from-orange-400 to-amber-600 bg-clip-text text-transparent">
                        Políticas y Privacidad
                    </h1>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">v2.0 • Última actualización: Marzo 2024</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all active:scale-95 group text-slate-400 hover:text-white"
                        title="Imprimir Políticas"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                    </button>
                    <div className="w-11" />
                </div>
            </div>

            <div className="p-8 max-w-3xl mx-auto space-y-16 relative z-10">
                {/* Intro */}
                <div className="text-center space-y-6 pt-8">
                    <div className="inline-flex p-6 bg-gradient-to-tr from-orange-500/20 to-amber-500/20 rounded-[2.5rem] border border-orange-500/20 mb-2 relative group">
                        <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Shield className="w-10 h-10 text-orange-400 relative z-10" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-4xl font-black tracking-tight leading-tight">Tu Seguridad es <br/><span className="text-orange-500">Nuestra Prioridad</span></h2>
                        <p className="text-slate-400 leading-relaxed text-lg max-w-xl mx-auto">
                            En Montapulse trabajamos para crear un entorno seguro, transparente y profesional para la comunidad de la Ruta del Spondylus.
                        </p>
                    </div>
                </div>

                {/* Sections Grid */}
                <div className="grid gap-8">
                    {/* SECTION 1: TERMS */}
                    <section className="group bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 hover:border-orange-500/20 transition-all duration-500 shadow-2xl">
                        <div className="flex items-center gap-5 mb-8">
                            <div className="p-4 bg-orange-500/10 rounded-[1.5rem] group-hover:rotate-12 transition-transform duration-500">
                                <FileText className="w-7 h-7 text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">Términos del Servicio</h3>
                                <p className="text-xs text-orange-500/60 font-mono uppercase tracking-widest mt-1 underline decoration-orange-500/30 underline-offset-4">Acuerdo de Uso de la Plataforma</p>
                            </div>
                        </div>
                        <div className="space-y-6 text-slate-300 leading-relaxed">
                            <div className="space-y-3">
                                <h4 className="text-white font-bold flex items-center gap-2">
                                    <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                    1. Requisitos de Acceso
                                </h4>
                                <p className="text-sm pl-3 border-l border-white/10">
                                    Para utilizar Montapulse, debes tener al menos 18 años o la mayoría de edad legal en tu jurisdicción. Al registrarte, garantizas que la información proporcionada es veraz, completa y actualizada en todo momento.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-white font-bold flex items-center gap-2">
                                    <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                    2. Responsabilidades del Negocio
                                </h4>
                                <p className="text-sm pl-3 border-l border-white/10">
                                    Los establecimientos registrados son responsables de la validez de los descuentos, horarios y servicios publicados. Montapulse actúa únicamente como vitrina publicitaria y no garantiza la ejecución de las ofertas por parte de terceros.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-white font-bold flex items-center gap-2">
                                    <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                    3. Suscripciones y Pagos
                                </h4>
                                <p className="text-sm pl-3 border-l border-white/10">
                                    Los planes Basic y Premium otorgan beneficios visuales y funcionales específicos. Las suscripciones son de renovación mensual. En caso de impago, el perfil será degradado automáticamente al plan gratuito transcurrido el periodo de gracia de 5 días.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-white font-bold flex items-center gap-2">
                                    <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                    4. Conducta Prohibida
                                </h4>
                                <p className="text-sm pl-3 border-l border-white/10">
                                    Queda estrictamente prohibido: publicar contenido falso, ofensivo o ilegal; realizar acciones de scraping o ingeniería inversa; y el uso de la plataforma para fines distintos al descubrimiento turístico y comercial autorizado.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: PRIVACY */}
                    <section className="group bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 hover:border-amber-500/20 transition-all duration-500 shadow-2xl">
                        <div className="flex items-center gap-5 mb-8">
                            <div className="p-4 bg-amber-500/10 rounded-[1.5rem] group-hover:-rotate-12 transition-transform duration-500 font-sans">
                                <Lock className="w-7 h-7 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">Política de Privacidad</h3>
                                <p className="text-xs text-amber-500/60 font-mono uppercase tracking-widest mt-1 underline decoration-amber-500/30 underline-offset-4 font-sans">Gestión de Datos y Seguridad</p>
                            </div>
                        </div>
                        <div className="space-y-6 text-slate-300 leading-relaxed font-sans">
                            <div className="space-y-3 font-sans">
                                <h4 className="text-white font-bold flex items-center gap-2 font-sans">
                                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                    1. Recolección de Información
                                </h4>
                                <p className="text-sm pl-3 border-l border-white/10 font-sans">
                                    Recolectamos datos de perfil (nombre, email), datos transaccionales, y datos de uso de la plataforma. La geolocalización se solicita exclusivamente para la funcionalidad del mapa en tiempo real y no se utiliza para rastreo secundario.
                                </p>
                            </div>

                            <div className="space-y-3 font-sans">
                                <h4 className="text-white font-bold flex items-center gap-2 font-sans">
                                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                    2. Uso de los Datos
                                </h4>
                                <p className="text-sm pl-3 border-l border-white/10 font-sans">
                                    Tus datos se utilizan para: personalizar tu experiencia, mejorar la seguridad de la cuenta, y si lo autorizas, enviarte notificaciones sobre eventos relevantes en tu zona. Nunca venderemos tu información personal a terceros.
                                </p>
                            </div>

                            <div className="space-y-3 font-sans">
                                <h4 className="text-white font-bold flex items-center gap-2 font-sans">
                                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                    3. Derechos ARCO
                                </h4>
                                <p className="text-sm pl-3 border-l border-white/10 font-sans">
                                    Como usuario, tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales. Puedes solicitar la eliminación definitiva de tu cuenta y datos asociados contactando a nuestro soporte técnico.
                                </p>
                            </div>

                            <div className="space-y-3 font-sans">
                                <h4 className="text-white font-bold flex items-center gap-2 font-sans">
                                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                    4. Cookies y Terceros
                                </h4>
                                <p className="text-sm pl-3 border-l border-white/10 font-sans">
                                    Utilizamos servicios de terceros como Google Maps (para geolocalización) y Firebase (para autenticación y base de datos). Estos servicios pueden utilizar cookies técnicas para el funcionamiento básico de la app y para mantener tu sesión activa.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: LEGAL */}
                    <section className="bg-gradient-to-br from-slate-900/60 to-slate-950/60 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 shadow-inner">
                        <div className="flex items-center gap-5 mb-8">
                            <div className="p-4 bg-blue-500/10 rounded-[1.5rem]">
                                <Shield className="w-7 h-7 text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-black tracking-tight">Descargo de Responsabilidad</h3>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed italic border-l-2 border-blue-500/30 pl-4 py-2">
                            "Montapulse no garantiza que la plataforma esté libre de errores o interrupciones. El uso de la información y la asistencia a eventos publicados es bajo el propio riesgo del usuario. No seremos responsables por pérdidas directas o indirectas derivadas del uso de la aplicación."
                        </p>
                    </section>
                </div>

                {/* Contact Support */}
                <div className="pt-12 text-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-8">¿Necesitas asistencia legal o técnica?</p>
                    <a
                        href="mailto:soporte@montapulse.com"
                        className="inline-flex items-center gap-4 px-10 py-5 bg-white text-black font-black rounded-[2rem] hover:bg-orange-500 hover:text-white transition-all duration-300 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.05)] group"
                    >
                        Contactar Soporte Legal
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                </div>
            </div>
        </div>
    );
};

