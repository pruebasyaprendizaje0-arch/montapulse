import React, { useState, useMemo, useEffect } from 'react';
import { 
    ChevronLeft, Clock, Trash2, Calendar, MapPin, Zap, Sparkles, 
    BarChart3, HelpCircle, BookOpen, Activity, Users, Heart, 
    Star, Droplets, ChevronDown, ChevronUp, Search, Info, MessageCircle, ArrowRight,
    Edit3, Save, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { getAppSettings, updateAppSettings } from '../services/firestoreService';

const formatText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, idx) => {
        if (idx % 2 === 1) {
            return <strong key={idx} className="font-bold text-white">{part}</strong>;
        }
        return part;
    });
};

const AccordionItem: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left transition-all hover:bg-white/5 px-4"
      >
        <span className="text-sm font-bold text-slate-200">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 py-4' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 text-xs text-slate-400 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

export const History: React.FC = () => {
    const navigate = useNavigate();
    const { user, isSuperUser } = useAuthContext();
    const { showToast } = useToast();
    const { paymentDetails } = useData();

    const [historyContent, setHistoryContent] = useState({
        heroSubtitle: 'Tu guía definitiva en la Ruta del Spondylus. Mucho más que una aplicación, somos el latido digital de Montañita y su gente.',
        spondylusQuote: 'Recorrer la ruta es una travesía, pero entender su alma requiere una brújula local que conozca cada secreto.',
        spondylusDescription: 'Montañita es el epicentro vibrante de la costa ecuatoriana. MontaPulse nace de la necesidad de conectar a los viajeros con la esencia real del pueblo, permitiéndoles descubrir no solo dónde estar, sino **cuándo** estar ahí para vivir la experiencia perfecta.',
        pulsoText: 'Un Pulso es la captura instantánea de la energía de un lugar. Es lo que está ocurriendo **AHORA**. No es un anuncio estático; es la vida misma de Montañita fluyendo en tiempo real a través de tu pantalla.',
        vibeText: 'El Vibe es la atmósfera que buscas. ¿Prefieres un atardecer chill, una fiesta electrónica o una cena romántica? Las Vibes filtran el mapa para que encuentres exactamente la sintonía que tu cuerpo pide hoy.',
        metricsText: 'Nuestra tecnología analiza miles de puntos de datos en tiempo real. Para los negocios, esto significa entender mejor a su audiencia; para ti, significa la seguridad de que el lugar al que vas tiene exactamente el ambiente que esperas.',
        businessCoachingText: 'No solo te ofrecemos visibilidad, te brindamos asesoría estratégica basada en el comportamiento real de tus clientes. Optimiza tus horarios, tus ofertas y tu impacto digital con nosotros.',
        manoInvisibleText: 'El concepto es simple: **si tú creces, nosotros crecemos**. La "Mano Invisible" representa nuestra red de apoyo mutuo donde impulsamos proyectos colectivos, facilitamos el trueque de servicios y nos aseguramos de que nadie en la comunidad se quede atrás.',
        primeroLoNuestroText: 'Dedicado exclusivamente al apoyo de artesanos, agricultores locales y negocios comunales. Queremos que el mundo vea la maestría de nuestra gente y la calidad de nuestra tierra directamente, sin intermediarios.',
        proyectoPlayaText: 'Nuestro compromiso ambiental. Una parte de cada suscripción se reinvierte en la conservación de nuestras playas, programas de reciclaje y educación ambiental para asegurar que el paraíso siga siendo paraíso.'
    });
    const [editForm, setEditForm] = useState(historyContent);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const data = await getAppSettings('history_info');
            if (data) {
                setHistoryContent(data as any);
                setEditForm(data as any);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        try {
            await updateAppSettings('history_info', editForm);
            setHistoryContent(editForm);
            setIsEditing(false);
            showToast('Contenido de Nosotros actualizado correctamente', 'success');
        } catch (error) {
            console.error('Error updating history info:', error);
            showToast('Error al actualizar la información', 'error');
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar bg-[#020617] scroll-smooth">
            {/* Hero Section */}
            <div className="relative h-[70vh] flex-shrink-0 flex items-end">
                <img 
                    src="https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=2000" 
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                    alt="Montañita Sunset Surfer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
                
                <div className="absolute top-6 left-6 z-10">
                    <button onClick={() => navigate('/explore')} className="p-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-2xl group">
                        <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>

                {isSuperUser && (
                    <div className="absolute top-6 right-6 z-10 flex gap-2">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={handleSave} 
                                    className="p-3 bg-emerald-500 hover:bg-emerald-600 border border-emerald-400/20 rounded-2xl transition-all active:scale-95 shadow-2xl flex items-center gap-2 text-white font-bold text-sm"
                                    title="Guardar Cambios"
                                >
                                    <Save className="w-5 h-5" />
                                    <span className="hidden md:inline">Guardar</span>
                                </button>
                                <button 
                                    onClick={() => {
                                        setEditForm(historyContent);
                                        setIsEditing(false);
                                    }} 
                                    className="p-3 bg-rose-500 hover:bg-rose-600 border border-rose-400/20 rounded-2xl transition-all active:scale-95 shadow-2xl text-white"
                                    title="Cancelar Edición"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="p-3 bg-orange-500 hover:bg-orange-600 border border-orange-400/20 rounded-2xl transition-all active:scale-95 shadow-2xl flex items-center gap-2 text-white font-bold text-sm"
                                title="Editar Contenido"
                            >
                                <Edit3 className="w-5 h-5" />
                                <span className="hidden md:inline">Editar Nosotros</span>
                            </button>
                        )}
                    </div>
                )}

                <div className="relative z-10 px-8 pb-16 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Bienvenido a MontaPulse</span>
                        </div>
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter mb-6">
                        CONECTANDO EL <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">PULSO</span> DE NUESTRA <br/>
                        COMUNIDAD
                    </h1>
                    {isEditing ? (
                        <div className="w-full max-w-xl space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-orange-500">Subtítulo de Portada</label>
                            <textarea
                                value={editForm.heroSubtitle}
                                onChange={(e) => setEditForm({ ...editForm, heroSubtitle: e.target.value })}
                                className="w-full bg-black/50 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-4 text-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-base font-medium"
                            />
                        </div>
                    ) : (
                        <p className="text-base md:text-lg text-slate-300 max-w-xl leading-relaxed font-medium">
                            {formatText(historyContent.heroSubtitle)}
                        </p>
                    )}
                </div>
            </div>

            {/* Main Content Sections */}
            <div className="px-6 py-20 flex flex-col gap-32 max-w-5xl mx-auto w-full">
                
                {/* La Ruta del Spondylus */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="flex flex-col gap-6">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-3xl flex items-center justify-center border border-orange-500/20">
                            <MapPin className="w-8 h-8 text-orange-500" />
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tight leading-none uppercase">La Ruta del<br/><span className="text-orange-500">Spondylus</span></h2>
                        {isEditing ? (
                            <div className="space-y-4 w-full">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-orange-500">Cita / Lema</label>
                                    <textarea
                                        value={editForm.spondylusQuote}
                                        onChange={(e) => setEditForm({ ...editForm, spondylusQuote: e.target.value })}
                                        className="w-full bg-black/50 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-4 text-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all duration-300 resize-y min-h-[80px] text-lg italic"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-orange-500">Descripción de la Ruta</label>
                                    <textarea
                                        value={editForm.spondylusDescription}
                                        onChange={(e) => setEditForm({ ...editForm, spondylusDescription: e.target.value })}
                                        className="w-full bg-black/50 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-4 text-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all duration-300 resize-y min-h-[120px] text-base"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-lg text-slate-400 leading-relaxed italic border-l-2 border-orange-500/30 pl-6">
                                    "{formatText(historyContent.spondylusQuote)}"
                                </p>
                                <p className="text-base text-slate-300 leading-relaxed">
                                    {formatText(historyContent.spondylusDescription)}
                                </p>
                            </>
                        )}
                    </div>
                    <div className="relative aspect-square rounded-[3rem] overflow-hidden border border-white/10 group shadow-2xl">
                        <img 
                            src="https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80"
                            alt="Coastal Life"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                </section>

                {/* Conceptos: Pulsos & Vibes */}
                <section className="flex flex-col gap-12">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-4 uppercase">PULSOS & VIBES</h2>
                        <p className="text-xs text-orange-500 font-black tracking-[0.4em] uppercase">El Lenguaje de la Conexión</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-10 rounded-[3rem] transition-all hover:bg-orange-500/[0.15] hover:border-orange-500/40">
                            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 group-hover:rotate-12 transition-transform">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-4">¿Qué es un Pulso?</h3>
                            {isEditing ? (
                                <div className="space-y-2 mt-4">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-orange-500">¿Qué es un Pulso?</label>
                                    <textarea
                                        value={editForm.pulsoText}
                                        onChange={(e) => setEditForm({ ...editForm, pulsoText: e.target.value })}
                                        className="w-full bg-black/50 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-4 text-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-sm"
                                    />
                                </div>
                            ) : (
                                <p className="text-slate-400 leading-relaxed">
                                    {formatText(historyContent.pulsoText)}
                                </p>
                            )}
                        </div>
                        
                        <div className="group bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-10 rounded-[3rem] transition-all hover:bg-amber-500/[0.15] hover:border-amber-500/40">
                            <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20 group-hover:-rotate-12 transition-transform">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-4">¿Qué es un Vibe?</h3>
                            {isEditing ? (
                                <div className="space-y-2 mt-4">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-amber-500">¿Qué es un Vibe?</label>
                                    <textarea
                                        value={editForm.vibeText}
                                        onChange={(e) => setEditForm({ ...editForm, vibeText: e.target.value })}
                                        className="w-full bg-black/50 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-sm"
                                    />
                                </div>
                            ) : (
                                <p className="text-slate-400 leading-relaxed">
                                    {formatText(historyContent.vibeText)}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Métricas y Toma de Decisiones */}
                <section className="bg-slate-900/40 rounded-[4rem] p-12 border border-white/5 relative overflow-hidden group">
                    <div className="absolute -top-20 -right-20 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BarChart3 className="w-80 h-80 text-white" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                        <div className="flex-1 flex flex-col gap-6">
                            <h2 className="text-4xl font-black text-white leading-[0.9]">MÉTRICAS QUE<br/><span className="text-orange-500">POTENCIAN</span> TU DÍA</h2>
                            {isEditing ? (
                                <div className="space-y-2 w-full mt-4">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-orange-500">Descripción de Métricas</label>
                                    <textarea
                                        value={editForm.metricsText}
                                        onChange={(e) => setEditForm({ ...editForm, metricsText: e.target.value })}
                                        className="w-full bg-black/50 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-4 text-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-sm"
                                    />
                                </div>
                            ) : (
                                <p className="text-slate-400 leading-relaxed">
                                    {formatText(historyContent.metricsText)}
                                </p>
                            )}
                            <div className="flex items-center gap-8 mt-4">
                                <div className="flex flex-col">
                                    <span className="text-4xl font-black text-white">92%</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Satisfacción</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-4xl font-black text-white">0.5s</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Latencia Real</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-1/3 bg-black/40 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-inner">
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className={`h-full bg-orange-500 rounded-full`} style={{ width: `${40 + (i * 20)}%` }} />
                                    </div>
                                ))}
                                <p className="text-[10px] text-center text-slate-500 font-bold uppercase mt-4">Decisiones Basadas en Datos</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="flex flex-col gap-10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <HelpCircle className="w-6 h-6 text-orange-500" />
                            <h2 className="text-3xl font-black text-white tracking-tight uppercase">Preguntas Frecuentes</h2>
                        </div>
                        <p className="text-slate-500 text-sm">Todo lo que necesitas saber sobre nuestra plataforma.</p>
                    </div>
                    <div className="bg-slate-900/20 rounded-[3rem] border border-white/5 divide-y divide-white/5">
                        <AccordionItem title="¿Cómo garantiza MontaPulse que los eventos son reales?">
                            Cada Pulso es verificado por el sistema a través de geolocalización y validación de negocios certificados. Solo los afiliados autorizados pueden emitir Pulsos oficiales.
                        </AccordionItem>
                        <AccordionItem title="¿Qué costo tiene para los usuarios finales?">
                            MontaPulse es 100% gratuita para los exploradores. Nuestra misión es democratizar el acceso a la información y potenciar el turismo local.
                        </AccordionItem>
                        <AccordionItem title="¿Puedo usar la app en otras ciudades?">
                            Actualmente nuestro foco principal es Montañita y la Ruta del Spondylus, pero estamos en fase de expansión hacia otros puntos estratégicos de la costa.
                        </AccordionItem>
                        <AccordionItem title="¿Cómo me afilio como negocio?">
                            Puedes registrar tu negocio directamente desde la web app. Una vez validado, tendrás acceso a tu panel de administración y herramientas de marketing.
                        </AccordionItem>
                    </div>
                </section>

                {/* Tutorial Interactivo */}
                <section className="flex flex-col gap-10">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-orange-500" />
                        <h2 className="text-3xl font-black text-white tracking-tight uppercase">Tutorial Rápido</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { step: "01", title: "Busca", desc: "Abre el mapa y visualiza los Pulsos activos en tiempo real." },
                            { step: "02", title: "Siente", desc: "Filtra por Vibes (Party, Food, Chill) según tu estado de ánimo." },
                            { step: "03", title: "Conecta", desc: "Entra al perfil del negocio para ver ofertas y detalles exclusivos." },
                            { step: "04", title: "Vive", desc: "Sigue la ruta y disfruta de la mejor experiencia del día." }
                        ].map((item, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col gap-4 hover:bg-orange-500/5 transition-colors group">
                                <span className="text-4xl font-black text-orange-500/20 group-hover:text-orange-500 transition-colors">{item.step}</span>
                                <h4 className="font-black text-white text-lg uppercase tracking-tight">{item.title}</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Asesoría a Negocios */}
                <section className="relative rounded-[4rem] bg-indigo-600 p-12 overflow-hidden shadow-3xl group">
                    <div className="absolute top-0 right-0 p-12 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                        <Activity className="w-64 h-64 text-white" />
                    </div>
                    <div className="relative z-10 flex flex-col gap-8 max-w-2xl">
                        <h2 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter">TRANSFORMA<br/>TU NEGOCIO</h2>
                        {isEditing ? (
                            <div className="space-y-2 w-full">
                                <label className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Asesoría Estratégica</label>
                                <textarea
                                    value={editForm.businessCoachingText}
                                    onChange={(e) => setEditForm({ ...editForm, businessCoachingText: e.target.value })}
                                    className="w-full bg-black/50 backdrop-blur-xl border border-indigo-300/30 rounded-2xl p-4 text-slate-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-base"
                                />
                            </div>
                        ) : (
                            <p className="text-lg text-indigo-100 leading-relaxed font-medium">
                                {formatText(historyContent.businessCoachingText)}
                            </p>
                        )}
                        <button onClick={() => navigate('/plans')} className="w-fit px-8 py-5 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-2xl flex items-center gap-3">
                            Convertirme en Afiliado
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </section>

                {/* La Mano Invisible (Comunidad) */}
                <section className="flex flex-col gap-10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <Users className="w-6 h-6 text-pink-500" />
                            <h2 className="text-3xl font-black text-white tracking-tight uppercase">La Mano Invisible</h2>
                        </div>
                        <p className="text-slate-500 text-sm">Nuestro compromiso social con la red de Montañita.</p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-500/20 to-transparent border border-pink-500/20 p-12 rounded-[4rem] flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-20 h-20 bg-pink-500 rounded-3xl flex items-center justify-center flex-shrink-0 animate-pulse">
                            <Heart className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Crecimiento en Unidad</h3>
                            {isEditing ? (
                                <div className="space-y-2 w-full mt-4">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-pink-500">Crecimiento en Unidad</label>
                                    <textarea
                                        value={editForm.manoInvisibleText}
                                        onChange={(e) => setEditForm({ ...editForm, manoInvisibleText: e.target.value })}
                                        className="w-full bg-black/50 backdrop-blur-xl border border-pink-500/30 rounded-2xl p-4 text-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-base"
                                    />
                                </div>
                            ) : (
                                <p className="text-base text-slate-300 leading-relaxed">
                                    {formatText(historyContent.manoInvisibleText)}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Primero Lo Nuestro */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    <div className="bg-slate-900 border border-white/5 p-10 rounded-[3rem] flex flex-col gap-6 hover:border-amber-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <Star className="w-6 h-6 text-amber-500" />
                            <h3 className="text-2xl font-black text-white uppercase">Primero Lo Nuestro</h3>
                        </div>
                        {isEditing ? (
                            <div className="space-y-2 mt-4">
                                <label className="text-[10px] uppercase font-black tracking-widest text-amber-500">Primero Lo Nuestro</label>
                                <textarea
                                    value={editForm.primeroLoNuestroText}
                                    onChange={(e) => setEditForm({ ...editForm, primeroLoNuestroText: e.target.value })}
                                    className="w-full bg-black/50 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-sm"
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 leading-relaxed">
                                {formatText(historyContent.primeroLoNuestroText)}
                            </p>
                        )}
                    </div>
                    <div className="bg-emerald-950/40 border border-emerald-500/10 p-10 rounded-[3rem] flex flex-col gap-6 hover:border-emerald-500/30 transition-colors relative overflow-hidden group">
                        <div className="flex items-center gap-3 relative z-10">
                            <Droplets className="w-6 h-6 text-emerald-400" />
                            <h3 className="text-2xl font-black text-white uppercase">Proyecto Playa</h3>
                        </div>
                        {isEditing ? (
                            <div className="space-y-2 relative z-10 mt-4">
                                <label className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Proyecto Playa</label>
                                <textarea
                                    value={editForm.proyectoPlayaText}
                                    onChange={(e) => setEditForm({ ...editForm, proyectoPlayaText: e.target.value })}
                                    className="w-full bg-black/50 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-sm"
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 leading-relaxed relative z-10">
                                {formatText(historyContent.proyectoPlayaText)}
                            </p>
                        )}
                        <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Droplets className="w-32 h-32 text-emerald-400" />
                        </div>
                    </div>
                </section>


                {/* Footer CTA */}
                <section className="text-center py-20 border-t border-white/5">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-amber-500 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(249,115,22,0.3)] mx-auto mb-10 rotate-6 hover:rotate-0 transition-transform">
                        <Activity className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">ÚNETE AL PULSO</h2>
                    <p className="text-slate-500 text-sm font-bold tracking-[0.5em] uppercase mb-12">Montañita Te Espera</p>
                    <button onClick={() => navigate('/explore')} className="px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-orange-500 hover:text-white transition-all active:scale-95 shadow-2xl flex items-center gap-3 mx-auto">
                        Comenzar la Experiencia
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </section>

            </div>
            
            {/* Botón Flotante de WhatsApp */}
            <a 
                href={`https://wa.me/${(paymentDetails?.whatsappNumber || '593996147857').replace(/\D/g, '')}?text=${encodeURIComponent('Hola! Me gustaría ponerme en contacto con el equipo de MontaPulse.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-24 right-6 sm:bottom-8 sm:right-8 z-[1000] w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(37,211,102,0.3)] hover:shadow-[0_10px_35px_rgba(37,211,102,0.5)] hover:scale-110 active:scale-95 transition-all duration-300"
                title="Contactar por WhatsApp"
            >
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.452L0 24zm6.59-4.846c1.6.95 3.498 1.45 5.419 1.451 5.524 0 10.018-4.494 10.022-10.02.002-2.678-1.04-5.197-2.937-7.097-1.9-1.9-4.42-2.946-7.1-2.947-5.522 0-10.016 4.494-10.02 10.02-.001 1.93.504 3.818 1.465 5.424l-.993 3.626 3.715-.975zm11.583-7.73c-.322-.16-.1.21-.322-.16-.322-.16-1.9-1.397-2.193-1.503-.292-.107-.505-.16-.716.16-.21.32-.816.98-.998 1.194-.183.214-.366.24-.688.08-.323-.16-1.364-.502-2.596-1.6c-.96-.856-1.607-1.912-1.795-2.23-.188-.32-.02-.493.14-.653.146-.143.32-.373.48-.56.16-.188.213-.32.32-.533.107-.213.054-.4-.027-.56-.08-.16-.716-1.727-.98-2.368-.258-.622-.52-.538-.716-.548-.184-.01-.395-.01-.606-.01-.21 0-.553.08-.843.393-.29.313-1.107 1.082-1.107 2.64 0 1.557 1.134 3.064 1.293 3.277.16.213 2.23 3.402 5.4 4.766.753.325 1.342.52 1.802.666.756.24 1.444.207 1.987.126.607-.09 1.867-.763 2.13-1.5.264-.737.264-1.37.185-1.503-.08-.133-.293-.213-.615-.373z"/>
                </svg>
            </a>
            
            {/* Navigation Spacer */}
            <div className="h-32 flex-shrink-0" />
        </div>
    );
};
