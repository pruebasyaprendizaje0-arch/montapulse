import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { isSuperAdmin } from '../services/authService';

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
    <div className="border-b border-white/10 last:border-0 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left transition-all hover:bg-white/5 px-6"
      >
        <span className="text-sm sm:text-base font-bold text-white drop-shadow-sm">{title}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-orange-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 py-4' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 text-xs sm:text-sm text-slate-200 font-medium leading-relaxed drop-shadow-sm">
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
    const { paymentDetails, allUsers, setActiveView } = useData();

    // Enlace directo al WhatsApp del Superadmin (obtenido de la configuración de pagos o perfil del superadmin)
    const superAdminWhatsAppUrl = useMemo(() => {
        let rawPhone = paymentDetails?.whatsappNumber;
        if (!rawPhone || !rawPhone.trim() || rawPhone === '593980000000') {
            const superAdminUser = allUsers.find(u => 
                (u.email && isSuperAdmin(u.email)) || u.role === 'admin'
            );
            if (superAdminUser?.whatsapp) rawPhone = superAdminUser.whatsapp;
            else if (superAdminUser?.phone) rawPhone = superAdminUser.phone;
        }
        
        let digits = (rawPhone || '593996147857').replace(/\D/g, '');
        if (digits.startsWith('0') && digits.length === 10) {
            digits = '593' + digits.slice(1);
        } else if (digits.length === 9 && digits.startsWith('9')) {
            digits = '593' + digits;
        }

        const text = encodeURIComponent('Hola! Me gustaría ponerme en contacto con el administrador de la aplicación web.');
        return `https://wa.me/${digits || '593996147857'}?text=${text}`;
    }, [paymentDetails, allUsers]);

    const handleOpenWhatsApp = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(superAdminWhatsAppUrl, '_blank', 'noopener,noreferrer');
    };

    const handleGoToExplore = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setActiveView('explore');
        navigate('/explore');
    };

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

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const rafRef = useRef<number>(0);
    const targetTimeRef = useRef<number>(0);
    const velocityRef = useRef<number>(0);     // velocidad actual del resorte
    const scrollSamplesRef = useRef<number[]>([]); // muestras para suavizar input

    // RAF loop con spring physics — da sensación fluida y con inercia
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.addEventListener('loadedmetadata', () => video.pause());

        // Constantes del resorte: ajústalas para más/menos rebote
        const STIFFNESS = 0.12;  // cuánto "jala" hacia el objetivo (↑ = más rápido)
        const DAMPING   = 0.78;  // cuánto frena la velocidad (↑ = menos rebote)
        const MIN_DELTA = 0.001; // umbral mínimo de movimiento

        const loop = () => {
            rafRef.current = requestAnimationFrame(loop);
            if (!video.duration || isNaN(video.duration) || video.duration <= 0) return;

            const delta = targetTimeRef.current - video.currentTime;
            // Fuerza proporcional a la distancia (ley de Hooke)
            velocityRef.current = (velocityRef.current + delta * STIFFNESS) * DAMPING;

            if (Math.abs(velocityRef.current) > MIN_DELTA || Math.abs(delta) > MIN_DELTA) {
                const next = video.currentTime + velocityRef.current;
                video.currentTime = Math.max(0, Math.min(video.duration - 0.05, next));
            }
        };
        rafRef.current = requestAnimationFrame(loop);

        return () => { cancelAnimationFrame(rafRef.current); };
    }, []);

    // Handler de scroll con promedio móvil de 4 muestras para eliminar micro-saltos
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
        const raw = Math.min(1, Math.max(0, el.scrollTop / maxScroll));

        // Promedio móvil para suavizar el input
        const samples = scrollSamplesRef.current;
        samples.push(raw);
        if (samples.length > 4) samples.shift();
        const smoothed = samples.reduce((a, b) => a + b, 0) / samples.length;

        const video = videoRef.current;
        if (video && video.duration && !isNaN(video.duration)) {
            targetTimeRef.current = smoothed * (video.duration - 0.1);
        }
    };

    return (
        <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="relative flex flex-col h-full overflow-y-auto no-scrollbar bg-slate-950"
        >
            {/* Full-Page Background Video driven by Scroll */}
            <div className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none bg-black">
                <video 
                    ref={videoRef}
                    muted 
                    playsInline
                    preload="auto"
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100vw',
                        height: '56.25vw',
                        minHeight: '100vh',
                        minWidth: '177.78vh',
                    }}
                >
                    <source 
                        src="/maryplaya.mp4" 
                        type="video/mp4" 
                    />
                </video>
                {/* Overlay optimizado para alto contraste y máxima legibilidad */}
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px]" />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-slate-950/95" />
            </div>

            {/* Hero Section */}
            <div className="relative pt-6 sm:pt-10 pb-8 sm:pb-12 z-10">
                <div className="max-w-4xl mx-auto px-5 sm:px-8">
                    {/* Top Bar Controls */}
                    <div className="flex items-center justify-between gap-3 mb-6">
                        <button 
                            type="button" 
                            onClick={() => {
                                setActiveView('home');
                                navigate('/');
                            }} 
                            className="px-3.5 py-2 bg-black/50 hover:bg-black/70 backdrop-blur-xl border border-white/20 rounded-2xl text-xs font-bold text-slate-200 hover:text-white transition-all active:scale-95 shadow-lg flex items-center gap-1.5 cursor-pointer"
                            aria-label="Volver al Inicio"
                        >
                            <ChevronLeft className="w-4 h-4 text-orange-400" />
                            <span>Inicio</span>
                        </button>

                        {isSuperUser && (
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        <button 
                                            onClick={handleSave} 
                                            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 border border-emerald-400/20 rounded-2xl transition-all active:scale-95 shadow-lg flex items-center gap-1.5 text-white font-bold text-xs"
                                            title="Guardar Cambios"
                                        >
                                            <Save className="w-4 h-4" />
                                            <span>Guardar</span>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditForm(historyContent);
                                                setIsEditing(false);
                                            }} 
                                            className="p-2 bg-rose-500 hover:bg-rose-600 border border-rose-400/20 rounded-2xl transition-all active:scale-95 shadow-lg text-white"
                                            title="Cancelar Edición"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => setIsEditing(true)} 
                                        className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 border border-orange-400/20 rounded-2xl transition-all active:scale-95 shadow-lg flex items-center gap-1.5 text-white font-bold text-xs"
                                        title="Editar Contenido"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        <span>Editar</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="px-3 py-1 bg-orange-500/25 border border-orange-500/40 rounded-full shadow-lg backdrop-blur-md">
                                <span className="text-[10px] sm:text-xs font-black text-orange-300 uppercase tracking-[0.2em]">Bienvenido a MontaPulse</span>
                            </div>
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                        </div>
                        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white leading-[0.95] tracking-tighter mb-4 sm:mb-6 drop-shadow-xl">
                            CONECTANDO EL <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400">PULSO</span> DE NUESTRA <br/>
                            COMUNIDAD
                        </h1>
                        {isEditing ? (
                            <div className="w-full max-w-xl space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-orange-500">Subtítulo de Portada</label>
                                <textarea
                                    value={editForm.heroSubtitle}
                                    onChange={(e) => setEditForm({ ...editForm, heroSubtitle: e.target.value })}
                                    className="w-full bg-black/70 backdrop-blur-xl border border-orange-500/40 rounded-2xl p-4 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-base font-medium shadow-2xl"
                                />
                            </div>
                        ) : (
                            <p className="text-sm sm:text-base md:text-lg text-slate-100 max-w-xl leading-relaxed font-semibold drop-shadow-md">
                                {formatText(historyContent.heroSubtitle)}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Sections */}
            <div className="relative z-10 px-6 py-20 flex flex-col gap-32 max-w-5xl mx-auto w-full">
                
                {/* La Ruta del Spondylus */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="flex flex-col gap-6">
                        <div className="w-16 h-16 bg-orange-500/20 rounded-3xl flex items-center justify-center border border-orange-500/30 shadow-lg">
                            <MapPin className="w-8 h-8 text-orange-400" />
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tight leading-none uppercase drop-shadow-md">La Ruta del<br/><span className="text-orange-500">Spondylus</span></h2>
                        {isEditing ? (
                            <div className="space-y-4 w-full">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-orange-500">Cita / Lema</label>
                                    <textarea
                                        value={editForm.spondylusQuote}
                                        onChange={(e) => setEditForm({ ...editForm, spondylusQuote: e.target.value })}
                                        className="w-full bg-black/70 backdrop-blur-xl border border-orange-500/40 rounded-2xl p-4 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all duration-300 resize-y min-h-[80px] text-lg italic"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-orange-500">Descripción de la Ruta</label>
                                    <textarea
                                        value={editForm.spondylusDescription}
                                        onChange={(e) => setEditForm({ ...editForm, spondylusDescription: e.target.value })}
                                        className="w-full bg-black/70 backdrop-blur-xl border border-orange-500/40 rounded-2xl p-4 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all duration-300 resize-y min-h-[120px] text-base"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-lg md:text-xl text-amber-200 leading-relaxed italic border-l-4 border-orange-500 pl-6 drop-shadow font-medium bg-black/30 py-3 rounded-r-2xl">
                                    "{formatText(historyContent.spondylusQuote)}"
                                </p>
                                <p className="text-base md:text-lg text-slate-100 leading-relaxed font-medium drop-shadow-sm">
                                    {formatText(historyContent.spondylusDescription)}
                                </p>
                            </>
                        )}
                    </div>
                    <div className="relative aspect-square rounded-[3rem] overflow-hidden border border-white/20 group shadow-2xl">
                        <img 
                            src="https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90"
                            alt="Coastal Life"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    </div>
                </section>

                {/* Conceptos: Pulsos & Vibes */}
                <section className="flex flex-col gap-12">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-3 uppercase drop-shadow-md">PULSOS & VIBES</h2>
                        <p className="text-xs sm:text-sm text-orange-400 font-black tracking-[0.4em] uppercase">El Lenguaje de la Conexión</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group bg-slate-950/85 backdrop-blur-xl border border-orange-500/30 p-8 sm:p-10 rounded-[3rem] transition-all hover:bg-slate-900/95 hover:border-orange-500/60 shadow-2xl">
                            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 group-hover:rotate-12 transition-transform">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-4 drop-shadow-sm">¿Qué es un Pulso?</h3>
                            {isEditing ? (
                                <div className="space-y-2 mt-4">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-orange-500">¿Qué es un Pulso?</label>
                                    <textarea
                                        value={editForm.pulsoText}
                                        onChange={(e) => setEditForm({ ...editForm, pulsoText: e.target.value })}
                                        className="w-full bg-black/70 backdrop-blur-xl border border-orange-500/40 rounded-2xl p-4 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-sm"
                                    />
                                </div>
                            ) : (
                                <p className="text-slate-100 text-sm sm:text-base leading-relaxed font-medium drop-shadow-sm">
                                    {formatText(historyContent.pulsoText)}
                                </p>
                            )}
                        </div>
                        
                        <div className="group bg-slate-950/85 backdrop-blur-xl border border-amber-500/30 p-8 sm:p-10 rounded-[3rem] transition-all hover:bg-slate-900/95 hover:border-amber-500/60 shadow-2xl">
                            <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/30 group-hover:-rotate-12 transition-transform">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-4 drop-shadow-sm">¿Qué es un Vibe?</h3>
                            {isEditing ? (
                                <div className="space-y-2 mt-4">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-amber-500">¿Qué es un Vibe?</label>
                                    <textarea
                                        value={editForm.vibeText}
                                        onChange={(e) => setEditForm({ ...editForm, vibeText: e.target.value })}
                                        className="w-full bg-black/70 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-sm"
                                    />
                                </div>
                            ) : (
                                <p className="text-slate-100 text-sm sm:text-base leading-relaxed font-medium drop-shadow-sm">
                                    {formatText(historyContent.vibeText)}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Métricas y Toma de Decisiones */}
                <section className="bg-slate-950/85 backdrop-blur-xl rounded-[3rem] sm:rounded-[4rem] p-8 sm:p-12 border border-white/15 relative overflow-hidden group shadow-2xl">
                    <div className="absolute -top-20 -right-20 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BarChart3 className="w-80 h-80 text-white" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                        <div className="flex-1 flex flex-col gap-6">
                            <h2 className="text-3xl sm:text-4xl font-black text-white leading-[0.95] drop-shadow-md">MÉTRICAS QUE<br/><span className="text-orange-500">POTENCIAN</span> TU DÍA</h2>
                            {isEditing ? (
                                <div className="space-y-2 w-full mt-4">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-orange-500">Descripción de Métricas</label>
                                    <textarea
                                        value={editForm.metricsText}
                                        onChange={(e) => setEditForm({ ...editForm, metricsText: e.target.value })}
                                        className="w-full bg-black/70 backdrop-blur-xl border border-orange-500/40 rounded-2xl p-4 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-sm"
                                    />
                                </div>
                            ) : (
                                <p className="text-slate-100 text-sm sm:text-base leading-relaxed font-medium drop-shadow-sm">
                                    {formatText(historyContent.metricsText)}
                                </p>
                            )}
                            <div className="flex items-center gap-8 mt-4">
                                <div className="flex flex-col">
                                    <span className="text-4xl font-black text-white drop-shadow">92%</span>
                                    <span className="text-xs text-amber-400 uppercase font-black tracking-widest mt-1">Satisfacción</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-4xl font-black text-white drop-shadow">0.5s</span>
                                    <span className="text-xs text-amber-400 uppercase font-black tracking-widest mt-1">Latencia Real</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-1/3 bg-black/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/15 shadow-2xl">
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full`} style={{ width: `${40 + (i * 20)}%` }} />
                                    </div>
                                ))}
                                <p className="text-xs text-center text-slate-200 font-black uppercase mt-4 tracking-wider">Decisiones Basadas en Datos</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="flex flex-col gap-10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <HelpCircle className="w-6 h-6 text-orange-500" />
                            <h2 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-sm">Preguntas Frecuentes</h2>
                        </div>
                        <p className="text-slate-200 text-sm sm:text-base font-medium drop-shadow-sm">Todo lo que necesitas saber sobre nuestra plataforma.</p>
                    </div>
                    <div className="bg-slate-950/85 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3rem] border border-white/15 divide-y divide-white/10 shadow-2xl overflow-hidden p-2">
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
                        <h2 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-sm">Tutorial Rápido</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { step: "01", title: "Busca", desc: "Abre el mapa y visualiza los Pulsos activos en tiempo real." },
                            { step: "02", title: "Siente", desc: "Filtra por Vibes (Party, Food, Chill) según tu estado de ánimo." },
                            { step: "03", title: "Conecta", desc: "Entra al perfil del negocio para ver ofertas y detalles exclusivos." },
                            { step: "04", title: "Vive", desc: "Sigue la ruta y disfruta de la mejor experiencia del día." }
                        ].map((item, i) => (
                            <div key={i} className="bg-slate-950/85 backdrop-blur-xl border border-white/15 p-6 rounded-3xl flex flex-col gap-4 hover:bg-slate-900/90 hover:border-orange-500/40 transition-all shadow-xl group">
                                <span className="text-4xl font-black text-orange-400 group-hover:text-orange-300 transition-colors">{item.step}</span>
                                <h4 className="font-black text-white text-lg uppercase tracking-tight drop-shadow-sm">{item.title}</h4>
                                <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed drop-shadow-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Asesoría a Negocios */}
                <section className="relative rounded-[3.5rem] sm:rounded-[4rem] bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 p-8 sm:p-12 overflow-hidden shadow-3xl group border border-indigo-400/30">
                    <div className="absolute top-0 right-0 p-12 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                        <Activity className="w-64 h-64 text-white" />
                    </div>
                    <div className="relative z-10 flex flex-col gap-8 max-w-2xl">
                        <h2 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter drop-shadow-md">TRANSFORMA<br/>TU NEGOCIO</h2>
                        {isEditing ? (
                            <div className="space-y-2 w-full">
                                <label className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Asesoría Estratégica</label>
                                <textarea
                                    value={editForm.businessCoachingText}
                                    onChange={(e) => setEditForm({ ...editForm, businessCoachingText: e.target.value })}
                                    className="w-full bg-black/70 backdrop-blur-xl border border-indigo-300/40 rounded-2xl p-4 text-white focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-base"
                                />
                            </div>
                        ) : (
                            <p className="text-base sm:text-lg text-indigo-50 leading-relaxed font-semibold drop-shadow-sm">
                                {formatText(historyContent.businessCoachingText)}
                            </p>
                        )}
                        <button onClick={() => navigate('/plans')} className="w-fit px-8 py-5 bg-white text-indigo-900 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-2xl flex items-center gap-3 cursor-pointer">
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
                            <h2 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-sm">La Mano Invisible</h2>
                        </div>
                        <p className="text-slate-200 text-sm font-medium">Nuestro compromiso social con la red de Montañita.</p>
                    </div>
                    <div className="bg-slate-950/85 backdrop-blur-xl border border-pink-500/30 p-8 sm:p-12 rounded-[3.5rem] flex flex-col md:flex-row gap-12 items-center shadow-2xl">
                        <div className="w-20 h-20 bg-pink-500 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-pink-500/30 animate-pulse">
                            <Heart className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-sm">Crecimiento en Unidad</h3>
                            {isEditing ? (
                                <div className="space-y-2 w-full mt-4">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-pink-500">Crecimiento en Unidad</label>
                                    <textarea
                                        value={editForm.manoInvisibleText}
                                        onChange={(e) => setEditForm({ ...editForm, manoInvisibleText: e.target.value })}
                                        className="w-full bg-black/70 backdrop-blur-xl border border-pink-500/40 rounded-2xl p-4 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-base"
                                    />
                                </div>
                            ) : (
                                <p className="text-base text-slate-100 font-medium leading-relaxed drop-shadow-sm">
                                    {formatText(historyContent.manoInvisibleText)}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Primero Lo Nuestro */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    <div className="bg-slate-950/85 backdrop-blur-xl border border-white/15 p-8 sm:p-10 rounded-[3rem] flex flex-col gap-6 hover:border-amber-500/40 transition-colors shadow-2xl">
                        <div className="flex items-center gap-3">
                            <Star className="w-6 h-6 text-amber-400" />
                            <h3 className="text-2xl font-black text-white uppercase drop-shadow-sm">Primero Lo Nuestro</h3>
                        </div>
                        {isEditing ? (
                            <div className="space-y-2 mt-4">
                                <label className="text-[10px] uppercase font-black tracking-widest text-amber-500">Primero Lo Nuestro</label>
                                <textarea
                                    value={editForm.primeroLoNuestroText}
                                    onChange={(e) => setEditForm({ ...editForm, primeroLoNuestroText: e.target.value })}
                                    className="w-full bg-black/70 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-sm"
                                />
                            </div>
                        ) : (
                            <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed drop-shadow-sm">
                                {formatText(historyContent.primeroLoNuestroText)}
                            </p>
                        )}
                    </div>
                    <div className="bg-emerald-950/70 backdrop-blur-xl border border-emerald-500/30 p-8 sm:p-10 rounded-[3rem] flex flex-col gap-6 hover:border-emerald-500/50 transition-colors relative overflow-hidden group shadow-2xl">
                        <div className="flex items-center gap-3 relative z-10">
                            <Droplets className="w-6 h-6 text-emerald-400" />
                            <h3 className="text-2xl font-black text-white uppercase drop-shadow-sm">Proyecto Playa</h3>
                        </div>
                        {isEditing ? (
                            <div className="space-y-2 relative z-10 mt-4">
                                <label className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Proyecto Playa</label>
                                <textarea
                                    value={editForm.proyectoPlayaText}
                                    onChange={(e) => setEditForm({ ...editForm, proyectoPlayaText: e.target.value })}
                                    className="w-full bg-black/70 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-4 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all duration-300 resize-y min-h-[100px] text-sm"
                                />
                            </div>
                        ) : (
                            <p className="text-sm sm:text-base text-emerald-100 font-medium leading-relaxed relative z-10 drop-shadow-sm">
                                {formatText(historyContent.proyectoPlayaText)}
                            </p>
                        )}
                        <div className="absolute bottom-0 right-0 p-4 opacity-10 group-hover:opacity-15 transition-opacity">
                            <Droplets className="w-32 h-32 text-emerald-400" />
                        </div>
                    </div>
                </section>

                {/* Guías Turísticas del Corredor */}
                <section className="space-y-6">
                    <div className="text-center max-w-2xl mx-auto">
                        <span className="text-[10px] sm:text-xs font-black text-orange-400 uppercase tracking-[0.3em] flex items-center justify-center gap-1.5 mb-2">
                            <Sparkles className="w-3.5 h-3.5" /> Exploración Local
                        </span>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Guías Oficiales del Corredor</h2>
                        <p className="text-slate-200 text-xs sm:text-sm mt-1 font-medium">Conoce a fondo los sectores e hitos más emblemáticos de Santa Elena.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { title: 'Ruta del Spondylus', desc: 'Manglaralto, Montañita y Olón', url: '/ruta-del-spondylus', badge: 'Corredor Completo' },
                            { title: 'La Punta de Montañita', desc: 'Surf de clase mundial y relax frente al mar', url: '/guia/la-punta-montanita', badge: 'Montañita' },
                            { title: 'Barrio El Tigrillo', desc: 'Cabañas, naturaleza y tranquilidad', url: '/guia/el-tigrillo-montanita', badge: 'Montañita' },
                            { title: 'Santuario de Olón', desc: 'Mirador del acantilado y atardeceres', url: '/guia/santuario-olon', badge: 'Olón' },
                            { title: 'Terminal y Buses CLP', desc: 'Horarios y frecuencias de transporte', url: '/guia/terminal-clp-montanita', badge: 'Transporte' }
                        ].map((g, i) => (
                            <div
                                key={i}
                                onClick={() => navigate(g.url)}
                                className="p-6 bg-slate-950/85 backdrop-blur-xl hover:bg-slate-900 border border-white/15 hover:border-orange-500/40 rounded-[2rem] transition-all cursor-pointer group flex flex-col justify-between space-y-4 shadow-xl"
                            >
                                <div>
                                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest bg-orange-500/15 px-2.5 py-1 rounded-full border border-orange-500/30">
                                        {g.badge}
                                    </span>
                                    <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors mt-3 drop-shadow-sm">
                                        {g.title}
                                    </h3>
                                    <p className="text-slate-200 text-xs sm:text-sm mt-1 leading-relaxed font-medium">
                                        {g.desc}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold pt-2">
                                    <span>Leer Guía</span>
                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>


                {/* Footer CTA */}
                <section className="text-center py-20 border-t border-white/10">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-amber-500 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(249,115,22,0.3)] mx-auto mb-10 rotate-6 hover:rotate-0 transition-transform">
                        <Activity className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase drop-shadow-md">ÚNETE AL PULSO</h2>
                    <p className="text-slate-300 text-sm sm:text-base font-bold tracking-[0.4em] uppercase mb-12">Montañita Te Espera</p>
                    <button type="button" onClick={handleGoToExplore} className="px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-orange-500 hover:text-white transition-all active:scale-95 shadow-2xl flex items-center gap-3 mx-auto cursor-pointer">
                        Comenzar la Experiencia
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </section>

            </div>
            
            {/* Botón Flotante Central: "¿Cómo te sientes hoy?" */}
            <div className="fixed bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2 z-[2500] pointer-events-auto animate-in fade-in slide-in-from-bottom-6 duration-500">
                <button
                    type="button"
                    onClick={handleGoToExplore}
                    className="group relative flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white rounded-full font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_12px_35px_rgba(249,115,22,0.45)] hover:shadow-[0_16px_45px_rgba(249,115,22,0.7)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 backdrop-blur-xl cursor-pointer max-w-[calc(100vw-90px)] sm:max-w-none"
                >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white/20" />
                    </div>
                    <span className="drop-shadow-sm whitespace-nowrap font-black truncate">
                        ¿Cómo te sientes hoy?
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform shrink-0" />
                    
                    <span className="absolute inset-0 rounded-full bg-orange-500 -z-10 animate-ping opacity-25" />
                </button>
            </div>

            {/* Botón Flotante de WhatsApp */}
            <a 
                href={superAdminWhatsAppUrl}
                onClick={handleOpenWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-24 right-3 sm:bottom-8 sm:right-8 z-[3000] w-12 h-12 sm:w-14 sm:h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(37,211,102,0.4)] hover:shadow-[0_12px_35px_rgba(37,211,102,0.6)] hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer pointer-events-auto"
                title="Contactar al Administrador por WhatsApp"
                aria-label="Contactar al Administrador por WhatsApp"
            >
                <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 fill-current">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.452L0 24zm6.59-4.846c1.6.95 3.498 1.45 5.419 1.451 5.524 0 10.018-4.494 10.022-10.02.002-2.678-1.04-5.197-2.937-7.097-1.9-1.9-4.42-2.946-7.1-2.947-5.522 0-10.016 4.494-10.02 10.02-.001 1.93.504 3.818 1.465 5.424l-.993 3.626 3.715-.975zm11.583-7.73c-.322-.16-.1.21-.322-.16-.322-.16-1.9-1.397-2.193-1.503-.292-.107-.505-.16-.716.16-.21.32-.816.98-.998 1.194-.183.214-.366.24-.688.08-.323-.16-1.364-.502-2.596-1.6c-.96-.856-1.607-1.912-1.795-2.23-.188-.32-.02-.493.14-.653.146-.143.32-.373.48-.56.16-.188.213-.32.32-.533.107-.213.054-.4-.027-.56-.08-.16-.716-1.727-.98-2.368-.258-.622-.52-.538-.716-.548-.184-.01-.395-.01-.606-.01-.21 0-.553.08-.843.393-.29.313-1.107 1.082-1.107 2.64 0 1.557 1.134 3.064 1.293 3.277.16.213 2.23 3.402 5.4 4.766.753.325 1.342.52 1.802.666.756.24 1.444.207 1.987.126.607-.09 1.867-.763 2.13-1.5.264-.737.264-1.37.185-1.503-.08-.133-.293-.213-.615-.373z"/>
                </svg>
            </a>
            
            {/* Navigation Spacer */}
            <div className="h-32 flex-shrink-0" />
        </div>
    );
};
