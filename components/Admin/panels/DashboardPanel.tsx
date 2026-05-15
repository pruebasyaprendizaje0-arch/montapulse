import React from 'react';
import { 
    Users, Building2, Activity, Coins, TrendingUp, ShieldCheck, 
    Lock, CheckCircle, ArrowUpRight, Zap
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useAuthContext } from '../../../context/AuthContext';
import { SubscriptionPlan } from '../../../types';

interface DashboardPanelProps {
    stats: {
        users: number;
        businesses: number;
        totalEvents: number;
        estimatedMonthlyRevenue: number;
        proUsers: number;
        eliteUsers: number;
        admins: number;
    };
    appConfig: {
        maintenanceMode: boolean;
    };
    setActiveTab: (tab: any) => void;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({ stats, appConfig, setActiveTab }) => {
    const { allUsers, businesses, posts } = useData();
    const { isSuperUser, toggleSuperUser } = useAuthContext();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Super User Toggle */}
            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-[2rem] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isSuperUser ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                        <Zap className={`w-5 h-5 ${isSuperUser ? 'text-black' : 'text-slate-400'}`} />
                    </div>
                    <div>
                        <p className="text-sm font-black text-white uppercase tracking-wider">Modo Super User</p>
                        <p className="text-[10px] text-slate-500">Acceso completo a gestión de pueblos y localidades</p>
                    </div>
                </div>
                <button
                    onClick={toggleSuperUser}
                    className={`px-6 py-3 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${
                        isSuperUser 
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-400' 
                            : 'bg-white/10 text-slate-400 hover:bg-white/20 border border-white/10'
                    }`}
                >
                    {isSuperUser ? 'Activo' : 'Activar'}
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Usuarios" value={stats.users} icon={Users} color="text-sky-400" bg="bg-sky-400/10" />
                <StatCard label="Negocios" value={stats.businesses} icon={Building2} color="text-amber-400" bg="bg-amber-400/10" />
                <StatCard label="Eventos" value={stats.totalEvents} icon={Activity} color="text-rose-400" bg="bg-rose-400/10" />
                <StatCard label="Ingresos Est." value={`$${stats.estimatedMonthlyRevenue}`} icon={Coins} color="text-emerald-400" bg="bg-emerald-400/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                    <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        Actividad Reciente
                    </h4>
                    <div className="space-y-4">
                        {allUsers.slice(-5).reverse().map((u, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30 overflow-hidden">
                                        <img src={u.avatarUrl} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white">{u.name} {u.surname}</p>
                                        <p className="text-[10px] text-slate-500">Se unió como {u.role}</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-slate-600" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-neutral-900/50 border border-white/5 rounded-[2.5rem] p-8">
                    <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-sky-500" />
                        Estado de Moderación
                    </h4>
                    <div className="space-y-4">
                        <div className={`p-6 border rounded-3xl ${appConfig.maintenanceMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                            <div className={`flex items-center gap-3 mb-2 ${appConfig.maintenanceMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {appConfig.maintenanceMode ? <Lock className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                <span className="text-xs font-black uppercase">
                                    {appConfig.maintenanceMode ? 'Modo Mantenimiento' : 'Sistema Online'}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                {appConfig.maintenanceMode ? 'Solo administradores tienen acceso completo.' : 'No se han detectado problemas en las últimas 24 horas.'}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
                            <button onClick={() => setActiveTab('moderation')} className="p-4 bg-black/40 hover:bg-black/60 rounded-2xl border border-white/5 text-center transition-all group">
                                <p className="text-sm font-black text-white group-hover:text-orange-500">{posts.length}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-black">Posts</p>
                            </button>
                            <button onClick={() => setActiveTab('businesses')} className="p-4 bg-black/40 hover:bg-black/60 rounded-2xl border border-white/5 text-center transition-all group">
                                <p className="text-sm font-black text-white group-hover:text-orange-500">{businesses.filter(b => !b.isVerified).length}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-black">Verificar</p>
                            </button>
                            <button onClick={() => setActiveTab('masterData')} className="p-4 bg-black/40 hover:bg-black/60 rounded-2xl border border-white/5 text-center transition-all group">
                                <Activity className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                                <p className="text-[9px] text-slate-500 uppercase font-black">Datos</p>
                            </button>
                            <button onClick={() => setActiveTab('users')} className="p-4 bg-black/40 hover:bg-black/60 rounded-2xl border border-white/5 text-center transition-all group">
                                <Users className="w-4 h-4 text-sky-500 mx-auto mb-1" />
                                <p className="text-[9px] text-slate-500 uppercase font-black">Usuarios</p>
                            </button>
                            <button onClick={() => setActiveTab('ai')} className="p-4 bg-black/40 hover:bg-black/60 rounded-2xl border border-white/5 text-center transition-all group">
                                <Lock className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                                <p className="text-[9px] text-slate-500 uppercase font-black">Sistema</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string, value: any, icon: any, color: string, bg: string }> = ({ label, value, icon: Icon, color, bg }) => (
    <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-[2.5rem] hover:bg-neutral-900/80 transition-all group">
        <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center mb-5 border border-white/5 transition-transform group-hover:scale-110`}>
            <Icon className="w-6 h-6" />
        </div>
        <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{label}</p>
    </div>
);
