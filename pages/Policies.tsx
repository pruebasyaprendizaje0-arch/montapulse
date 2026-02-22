import React from 'react';
import { Shield, Lock, FileText, ChevronLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Policies: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-900 text-white overflow-y-auto pb-32">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all active:scale-90"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                <h1 className="text-xl font-black uppercase tracking-widest bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
                    Políticas
                </h1>
                <div className="w-11" />
            </div>

            <div className="p-8 max-w-2xl mx-auto space-y-12">
                {/* Intro */}
                <div className="text-center space-y-4">
                    <div className="inline-flex p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 mb-2">
                        <Shield className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">Tu Seguridad es lo Primero</h2>
                    <p className="text-slate-400 leading-relaxed">
                        En Spondylus Pulse nos comprometemos a mantener una comunidad segura y transparente para todos los amantes de la ruta.
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                    <section className="bg-slate-800/40 rounded-[2rem] p-8 border border-white/5">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-sky-500/10 rounded-2xl">
                                <FileText className="w-6 h-6 text-sky-400" />
                            </div>
                            <h3 className="text-xl font-black font-sans">Términos del Servicio</h3>
                        </div>
                        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                            <p>
                                1. **Uso de la Plataforma**: Spondylus Pulse es una herramienta para descubrir y publicar eventos. No nos responsabilizamos por la cancelación o cambios en los mismos.
                            </p>
                            <p>
                                2. **Comportamiento**: Se prohíbe el contenido ofensivo, fraudulento o que atente contra la integridad de otros usuarios.
                            </p>
                            <p>
                                3. **Cuentas de Negocio**: Los hosts son responsables de la veracidad de la información y de los eventos publicados.
                            </p>
                        </div>
                    </section>

                    <section className="bg-slate-800/40 rounded-[2rem] p-8 border border-white/5">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                <Lock className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-black">Privacidad de Datos</h3>
                        </div>
                        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                            <p>
                                1. **Información Recopilada**: Recopilamos datos básicos (nombre, correo) y preferencias de usuario para personalizar tu experiencia.
                            </p>
                            <p>
                                2. **Ubicación**: El acceso a tu GPS se usa exclusivamente para mejorar la navegación en el mapa y nunca se comparte con terceros sin tu consentimiento.
                            </p>
                            <p>
                                3. **Tus Derechos**: Puedes solicitar la eliminación definitiva de tu cuenta y datos asociados en cualquier momento desde el perfil.
                            </p>
                        </div>
                    </section>
                </div>

                {/* Contact Support */}
                <div className="pt-8 text-center">
                    <p className="text-slate-500 text-xs uppercase font-black tracking-widest mb-6">¿Tienes dudas?</p>
                    <a
                        href="mailto:soporte@montapulse.com"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5"
                    >
                        Contactar Soporte
                        <ArrowRight className="w-4 h-4 text-black" />
                    </a>
                </div>
            </div>
        </div>
    );
};
