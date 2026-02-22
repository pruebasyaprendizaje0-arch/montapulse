
import React, { useMemo } from 'react';
import {
    ChevronLeft, Compass, Store, UserCircle, Mail, ArrowRight,
    LogOut, CheckCircle, MapPin, Calendar, Plus, Edit3, Trash2,
    Users, Star, ChevronRight
} from 'lucide-react';
import { LoginScreen } from '../../components/LoginScreen';
import {
    UserProfile, Vibe, SubscriptionPlan, Business,
    MontanitaEvent, Sector
} from '../../types';
import { getBusinessById, updateUser } from '../../services/firestoreService';
import { PLAN_LIMITS } from '../../constants';
import { useNavigate } from 'react-router-dom';

import { useAuthContext } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';

export const Host: React.FC = () => {
    const { user, setUser, authUser, logout } = useAuthContext();
    const {
        events,
        eventsWithLiveCounts,
        businesses,
        showLogin,
        setShowLogin,
        regForm,
        setRegForm,
        bizForm,
        rsvpStatus,
        handleRegister: onRegister,
        handleOpenNewEventWizard: onOpenNewEventWizard,
        handleEditEvent: onEditEvent,
        handleDeleteEvent: onDeleteEvent,
        setShowBusinessEdit,
        setEditingBusinessId,
        handleCheckEmailBlur: onCheckEmailBlur,
        showBusinessReg,
        setShowBusinessReg,
        setNewEvent,
        handleGenerateAIEvent
    } = useData();

    const { showToast, showConfirm } = useToast();

    const onEditBusiness = (id: string) => {
        setEditingBusinessId(id);
        setShowBusinessEdit(true);
    };

    const onOpenBusinessReg = () => {
        setShowBusinessReg(true);
    };

    const onLogout = () => logout();
    const navigate = useNavigate();

    // Derived State
    const userBusiness = useMemo(() => {
        if (!user?.businessId) return null;
        return businesses.find(b => b.id === user.businessId);
    }, [user, businesses]);

    const myEvents = useMemo(() => {
        if (!user?.businessId) return [];
        return events.filter(e => e.businessId === user.businessId);
    }, [events, user]);

    const dashboardMetrics = useMemo(() => {
        const views = myEvents.reduce((acc, curr) => acc + (curr.viewCount || 0), 0);
        const rsvps = myEvents.reduce((acc, curr) => acc + (curr.interestedCount || 0), 0);
        return { views, rsvps };
    }, [myEvents]);

    const currentMonthEventsCount = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return myEvents.filter(e => new Date(e.startAt) >= startOfMonth).length;
    }, [myEvents]);

    // View: Login / Registration
    if (!user) {
        if (showLogin) {
            return (
                <div className="relative h-full w-full">
                    <button
                        onClick={() => setShowLogin(false)}
                        className="absolute top-4 left-4 z-50 p-2 bg-slate-800/80 rounded-full text-white hover:bg-slate-700 backdrop-blur-sm"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <LoginScreen />
                </div>
            );
        }

        return (
            <div className="p-6 pt-24 flex flex-col gap-8 animate-in slide-in-from-bottom duration-500 h-full overflow-y-auto pb-32 no-scrollbar">
                <div className="space-y-2 text-center">
                    <h1 className="text-5xl font-black tracking-tighter leading-tight text-white">ÚNETE AL <span className="text-rose-500">PULSO.</span></h1>
                    <p className="text-slate-400 font-medium">Crea tu perfil y empieza a vibrar con Montañita.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setRegForm({ ...regForm, role: 'visitor' })}
                        className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all duration-300 ${regForm.role === 'visitor' ? 'bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/10' : 'bg-slate-800/40 border-slate-700 text-slate-500'}`}
                    >
                        <Compass className={`w-8 h-8 ${regForm.role === 'visitor' ? 'text-rose-500' : ''}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Soy Visitante</span>
                    </button>
                    <button
                        onClick={() => setRegForm({ ...regForm, role: 'host' })}
                        className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all duration-300 ${regForm.role === 'host' ? 'bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-slate-800/40 border-slate-700 text-slate-500'}`}
                    >
                        <Store className={`w-8 h-8 ${regForm.role === 'host' ? 'text-indigo-500' : ''}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Soy Negocio</span>
                    </button>
                </div>

                <button
                    onClick={() => setShowLogin(true)}
                    className="w-full py-4 text-slate-400 font-bold hover:text-white transition-colors flex items-center justify-center gap-2 group"
                >
                    <span>¿Ya tienes cuenta?</span>
                    <span className="text-sky-400 group-hover:underline decoration-2 underline-offset-4">Iniciar Sesión</span>
                </button>

                <form onSubmit={onRegister} className="space-y-5 bg-slate-800/30 p-8 rounded-[2.5rem] border border-slate-700 backdrop-blur-xl">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tu Nombre</label>
                        <div className="relative">
                            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                required
                                type="text"
                                placeholder="Ej. Juan Montañita"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl pl-12 pr-5 py-4 focus:border-rose-500 outline-none font-bold text-white transition-all shadow-inner"
                                value={regForm.name}
                                onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                required
                                type="email"
                                placeholder="hola@playa.com"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl pl-12 pr-5 py-4 focus:border-rose-500 outline-none font-bold text-white transition-all shadow-inner"
                                value={regForm.email}
                                onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                                onBlur={onCheckEmailBlur}
                            />
                        </div>
                    </div>

                    {regForm.role === 'visitor' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tu Vibra Favorita</label>
                            <select
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-4 focus:border-rose-500 outline-none font-bold text-white appearance-none cursor-pointer"
                                value={regForm.vibe}
                                onChange={e => setRegForm({ ...regForm, vibe: e.target.value as Vibe })}
                            >
                                {Object.values(Vibe).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`w-full py-5 active:scale-95 transition-all text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl mt-4 ${regForm.role === 'host' ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}
                    >
                        {regForm.role === 'host' ? 'SIGUIENTE: DATOS NEGOCIO' : 'REGISTRARME AHORA'}
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </form>
            </div>
        );
    }

    // View: Visitor / Admin Profile
    if (user.role === 'visitor' || user.role === 'admin') {
        return (
            <div className="p-6 pt-6 flex flex-col gap-6 animate-in fade-in duration-300 h-full overflow-y-auto pb-24 no-scrollbar">
                <div className="flex items-center justify-between">
                    <h1 className="text-4xl font-black tracking-tighter text-white">PERFIL</h1>
                    <button onClick={onLogout} className="p-3 bg-slate-800 rounded-2xl border border-slate-700 text-slate-400 hover:text-rose-500 transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 border border-slate-700 space-y-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 blur-[80px] rounded-full"></div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-20 h-20 rounded-[2rem] overflow-hidden ring-4 ring-rose-500/20 shadow-xl">
                            <img src={user.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">{user.name}</h3>
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg">
                                {user.preferredVibe}
                            </span>
                        </div>
                    </div>
                </div>

                {user.role === 'admin' && (
                    <button
                        onClick={() => navigate('/admin-users')}
                        className="bg-emerald-500/10 border-2 border-emerald-500/30 p-8 rounded-[2.5rem] flex items-center justify-between gap-4 w-full text-left active:scale-95 transition-transform"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">Gestionar Usuarios</h3>
                                <p className="text-slate-400 text-sm mt-1">Administra roles y planes Premium.</p>
                            </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-emerald-500" />
                    </button>
                )}

                <div className="bg-indigo-500/10 border-2 border-dashed border-indigo-500/30 p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-4">
                    <Store className="w-12 h-12 text-indigo-400" />
                    <div>
                        <h3 className="text-xl font-black text-white">¿Te cambiaste al bando business?</h3>
                        <p className="text-slate-400 text-sm mt-1">Registra tu local para empezar a publicar eventos.</p>
                    </div>
                    <button
                        onClick={async () => {
                            if (user && user.businessId) {
                                const biz = await getBusinessById(user.businessId);
                                if (biz) {
                                    const confirmed = await showConfirm(
                                        `Ya tienes el negocio "${biz.name}" registrado.\n\n¿Deseas abrir tu panel de control?`,
                                        "Negocio Registrado"
                                    );
                                    if (confirmed) {
                                        try {
                                            await updateUser(user.id, { role: 'host' });
                                            setUser({ ...user, role: 'host' });
                                        } catch (e) {
                                            console.error("Error switching to host", e);
                                        }
                                    }
                                }
                                return;
                            }
                            onOpenBusinessReg();
                        }}
                        className="w-full py-4 bg-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        REGISTRAR MI NEGOCIO
                    </button>
                </div>
            </div>
        );
    }

    // View: Host Dashboard
    return (
        <div className="p-6 pt-20 flex flex-col gap-6 h-full overflow-y-auto pb-24 no-scrollbar bg-[#020617]">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-white tracking-tight">Host Hub</h1>
                    <span className="text-xs text-slate-500 font-medium">Dashboard Control • Spondylus</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/calendar')}
                        className="p-2.5 bg-slate-900 rounded-xl border border-white/5 text-slate-400 relative hover:text-white transition-colors"
                    >
                        <span className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full ring-2 ring-slate-900"></span>
                        <Calendar className="w-5 h-5" />
                    </button>
                    <button onClick={onLogout} className="p-2.5 bg-slate-900 rounded-xl border border-white/5 text-slate-400">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Profile Header Block */}
            <div className="flex items-center gap-4 py-4">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-slate-800 p-1 bg-slate-900 shadow-xl overflow-hidden">
                        <img
                            src={userBusiness?.imageUrl || bizForm?.imageUrl || user?.avatarUrl || "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=400"}
                            className="w-full h-full object-cover rounded-full"
                            alt="Business Profile"
                        />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-sky-500 p-1.5 rounded-full ring-4 ring-[#020617]">
                        <CheckCircle className="w-3 h-3 text-white fill-current" />
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        {userBusiness?.name || bizForm?.name || user?.name || "Mi Negocio"}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                            Sector: {userBusiness?.sector || bizForm?.sector || 'No definido'}, Spondylus
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/plans')}
                        className={`mt-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${user?.plan === SubscriptionPlan.PREMIUM
                            ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                            : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            }`}
                    >
                        {user?.plan === SubscriptionPlan.PREMIUM ? (
                            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> PREMIUM HOST</span>
                        ) : 'BASIC PLAN'}
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 p-4 rounded-[2rem] border border-white/5 space-y-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visualizaciones</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{dashboardMetrics.views}</span>
                        <span className="text-xs font-bold text-emerald-500">+12%</span>
                    </div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-[2rem] border border-white/5 space-y-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interesados</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{dashboardMetrics.rsvps}</span>
                        <span className="text-xs font-bold text-emerald-500">+5%</span>
                    </div>
                </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => {
                        if (userBusiness?.id) onEditBusiness(userBusiness.id);
                    }}
                    className="p-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-colors group"
                >
                    <div className="p-3 bg-indigo-500 rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
                        <Store className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-black text-indigo-300 uppercase tracking-wide">Editar Perfil</span>
                </button>

                <button
                    onClick={() => {
                        // Check limits
                        const plan = user?.plan || SubscriptionPlan.BASIC;
                        const limit = PLAN_LIMITS[plan] || 2;
                        if (currentMonthEventsCount >= limit) {
                            showToast(`Has alcanzado el límite de tu plan ${plan} (${limit} eventos por mes). Mejora a Premium.`, "warning");
                            navigate('/plans');
                            return;
                        }
                        onOpenNewEventWizard();
                    }}
                    className="p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-colors group"
                >
                    <div className="p-3 bg-emerald-500 rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                        <Plus className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-black text-emerald-300 uppercase tracking-wide">Crear Evento</span>
                </button>
            </div>

            {/* Active Events List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-white">Próximos Eventos</h3>
                    <span className="text-xs font-bold text-slate-500">{currentMonthEventsCount} / {PLAN_LIMITS[user?.plan || SubscriptionPlan.BASIC]} este mes</span>
                </div>

                {myEvents.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                        <p className="text-slate-500 text-sm font-medium">No tienes eventos activos</p>
                        <button
                            onClick={onOpenNewEventWizard}
                            className="mt-4 text-sky-400 text-xs font-black uppercase tracking-widest hover:underline"
                        >
                            Crear mi primer evento
                        </button>
                    </div>
                ) : (
                    myEvents.map(event => (
                        <div key={event.id} className="bg-slate-900 border border-white/5 p-4 rounded-[2rem] flex gap-4 group">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 relative">
                                <img src={event.imageUrl} className="w-full h-full object-cover" />
                                {event.isPremium && <div className="absolute top-1 right-1 bg-amber-500 p-1 rounded-full"><Star className="w-2 h-2 text-black fill-current" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white truncate">{event.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(event.startAt).toLocaleDateString()}</span>
                                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                    <span>{new Date(event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-3">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                        <Users className="w-3 h-3" />
                                        {eventsWithLiveCounts.find(e => e.id === event.id)?.interestedCount ?? event.interestedCount ?? 0} Going
                                    </div>
                                    <div className="flex ml-auto gap-2">
                                        <button onClick={() => onEditEvent(event)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Edit3 className="w-4 h-4" /></button>
                                        <button onClick={() => onDeleteEvent(event.id)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
