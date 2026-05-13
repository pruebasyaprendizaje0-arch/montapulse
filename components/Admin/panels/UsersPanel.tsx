import React, { useState, useMemo } from 'react';
import { 
    Search, Users, Coins, Crown, ShieldCheck, Mail, Activity, 
    ShieldAlert, Trash2, ChevronRight, CheckCircle, MoreHorizontal as MoreHorizontalIcon 
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { SubscriptionPlan, UserProfile } from '../../../types';
import { updateUser, createNotification, togglePulsePass } from '../../../services/firestoreService';

interface UsersPanelProps {
    stats: {
        users: number;
        proUsers: number;
        eliteUsers: number;
        admins: number;
    };
}

export const UsersPanel: React.FC<UsersPanelProps> = ({ stats }) => {
    const { allUsers } = useData();
    const { showToast, showConfirm } = useToast();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [menuOpenUserId, setMenuOpenUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => {
            const searchStr = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                u.name?.toLowerCase().includes(searchStr) || 
                u.email?.toLowerCase().includes(searchStr);
            
            const matchesRole = filterRole === 'all' || u.role === filterRole;
            const matchesPlan = filterPlan === 'all' || u.plan === filterPlan;
            
            return matchesSearch && matchesRole && matchesPlan;
        });
    }, [allUsers, searchQuery, filterRole, filterPlan]);

    const handleSendNotification = async (user: UserProfile) => {
        const message = window.prompt(`Escribe el mensaje para ${user.name}:`, "Hola! Tienes un mensaje de administración.");
        if (message && message.trim()) {
            try {
                await createNotification({
                    userId: user.id,
                    title: "Mensaje de Administración",
                    body: message,
                    type: 'system',
                    priority: 'normal',
                    metadata: { fromAdmin: true }
                });
                showToast("Notificación enviada", "success");
            } catch (error) {
                showToast("Error al enviar notificación", "error");
            }
        }
    };

    const handleToggleBan = async (user: UserProfile) => {
        const isBanning = !user.isBanned;
        const actionLabel = isBanning ? "BANEAR" : "DESBANEAR";
        if (await showConfirm(`¿Estás seguro de que deseas ${actionLabel} a ${user.name}?`, `${actionLabel} USUARIO`)) {
            await updateUser(user.id, { isBanned: isBanning });
            showToast(`Usuario ${isBanning ? 'baneado' : 'desbaneado'}`, isBanning ? "warning" : "success");
        }
    };

    const handleAddPoints = async (userId: string, currentPoints: number) => {
        const amount = window.prompt("¿Cuántos puntos deseas añadir/quitar? (Usa - para quitar)", "50");
        if (amount && !isNaN(parseInt(amount))) {
            const newPoints = Math.max(0, (currentPoints || 0) + parseInt(amount));
            await updateUser(userId, { points: newPoints });
            showToast(`Puntos actualizados a ${newPoints}`, "success");
        }
    };

    const handleResetAllPoints = async () => {
        if (await showConfirm("¿ESTÁS SEGURO? Esta acción reseteará los puntos de TODOS los usuarios a cero (0). Esta acción es IRREVERSIBLE.", "BORRAR PUNTOS (PELIGRO)")) {
            setIsLoading(true);
            try {
                const usersWithPoints = allUsers.filter(u => (u.points || 0) > 0);
                for (const u of usersWithPoints) {
                    await updateUser(u.id, { points: 0 });
                }
                showToast(`${usersWithPoints.length} usuarios reseteados`, "success");
            } catch (error) {
                showToast("Error al resetear puntos", "error");
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-1">
                <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tot</p>
                    <p className="text-lg sm:text-xl font-black text-white">{stats.users}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                    <p className="text-[8px] sm:text-[10px] font-black text-sky-500 uppercase tracking-widest mb-1">Pro</p>
                    <p className="text-lg sm:text-xl font-black text-sky-400">{stats.proUsers}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                    <p className="text-[8px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Elite</p>
                    <p className="text-lg sm:text-xl font-black text-amber-500">{stats.eliteUsers}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                    <p className="text-[8px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Adm</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-400">{stats.admins}</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 items-stretch">
                <div className="flex items-center gap-3 bg-neutral-900/50 p-3 sm:p-4 rounded-2xl sm:rounded-[1.5rem] border border-white/5 shadow-xl">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o email..." 
                        className="bg-transparent border-none text-white text-xs sm:text-sm w-full focus:outline-none"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select 
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value)}
                        className="flex-1 bg-neutral-900/50 border border-white/5 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none focus:border-orange-500/50"
                    >
                        <option value="all">Roles</option>
                        <option value="visitor">Visitors</option>
                        <option value="host">Hosts</option>
                        <option value="admin">Admins</option>
                    </select>
                    <select 
                        value={filterPlan}
                        onChange={e => setFilterPlan(e.target.value)}
                        className="flex-1 bg-neutral-900/50 border border-white/5 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none focus:border-orange-500/50"
                    >
                        <option value="all">Planes</option>
                        <option value={SubscriptionPlan.FREE}>Free</option>
                        <option value={SubscriptionPlan.PRO}>Pro</option>
                        <option value={SubscriptionPlan.EXPERT}>Expert</option>
                        <option value={SubscriptionPlan.ELITE}>Elite</option>
                    </select>
                </div>
            </div>

            {/* Global Actions */}
            <button 
                onClick={handleResetAllPoints}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl sm:rounded-2xl hover:bg-rose-500/10 transition-all group"
            >
                <div className="flex items-center gap-2 sm:gap-3">
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" />
                    <span className="text-[8px] sm:text-[10px] font-black text-rose-500 uppercase tracking-widest">Borrar Puntos de todos</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-500/30 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {filteredUsers.map(u => (
                    <div key={u.id} className={`bg-neutral-900/50 border rounded-2xl sm:rounded-[2rem] p-3.5 sm:p-6 hover:bg-neutral-900/80 transition-all group shadow-lg relative ${u.isBanned ? 'border-rose-500/30 grayscale-[0.5]' : 'border-white/5'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full p-0.5 shadow-lg shrink-0 ${u.isBanned ? 'bg-rose-500 shadow-rose-500/20' : 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/20'}`}>
                                    <div className="w-full h-full rounded-full bg-black overflow-hidden border-2 border-black">
                                        <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}&background=random`} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h5 className={`text-xs sm:text-sm font-black truncate ${u.isBanned ? 'text-rose-400' : 'text-white'}`}>{u.name} {u.surname}</h5>
                                        {u.role === 'admin' && <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500" />}
                                        {u.pulsePassActive && <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 animate-pulse" />}
                                        {u.isBanned && <span className="bg-rose-500/20 text-rose-500 text-[7px] font-black uppercase px-1 py-0.5 rounded">BANEADO</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                                        <p className="text-[9px] sm:text-[10px] text-slate-500 truncate">{u.email}</p>
                                        <span className="w-0.5 h-0.5 rounded-full bg-slate-800 shrink-0" />
                                        <p className="text-[8px] sm:text-[9px] font-black text-orange-500/80 uppercase tracking-tighter shrink-0">
                                            {u.points || 0} pts
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                <div className="text-right hidden sm:block">
                                    <div className="flex items-center gap-2 mb-1 justify-end">
                                        <select 
                                            value={u.role}
                                            onChange={async (e) => {
                                                const newRole = e.target.value;
                                                await updateUser(u.id, { role: newRole as any });
                                                showToast("Rol actualizado", "success");
                                            }}
                                            className="bg-black/60 text-[8px] sm:text-[9px] font-black uppercase text-white border border-white/10 rounded-lg px-2 py-1 outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                                        >
                                            <option value="visitor">Visitor</option>
                                            <option value="host">Host</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${u.plan === SubscriptionPlan.ELITE ? 'text-amber-500' : u.plan === SubscriptionPlan.EXPERT ? 'text-violet-400' : 'text-slate-500'}`}>
                                        {u.plan}
                                    </p>
                                </div>
                                
                                <div className="relative">
                                    <button 
                                        onClick={() => setMenuOpenUserId(menuOpenUserId === u.id ? null : u.id)}
                                        className={`p-2.5 sm:p-3 rounded-xl border transition-all ${menuOpenUserId === u.id ? 'bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-black/40 text-slate-400 border-white/5 hover:bg-black/60 hover:text-white'}`}
                                    >
                                        <MoreHorizontalIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>

                                    {menuOpenUserId === u.id && (
                                        <div className="absolute right-0 mt-3 w-52 sm:w-56 bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <div className="p-2 border-b border-white/5">
                                                <p className="px-3 py-1 text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">Suscripción</p>
                                                {[SubscriptionPlan.FREE, SubscriptionPlan.PRO, SubscriptionPlan.EXPERT, SubscriptionPlan.ELITE].map(plan => (
                                                    <button
                                                        key={plan}
                                                        onClick={async () => {
                                                            await updateUser(u.id, { plan });
                                                            setMenuOpenUserId(null);
                                                            showToast(`Plan actualizado a ${plan}`, "success");
                                                        }}
                                                        className={`w-full text-left px-3 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all flex items-center justify-between ${u.plan === plan ? 'bg-orange-500/10 text-orange-400' : 'text-slate-300 hover:bg-white/5'}`}
                                                    >
                                                        {plan}
                                                        {u.plan === plan && <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="p-2 border-b border-white/5">
                                                <p className="px-3 py-1 text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">Gestión</p>
                                                <button
                                                    onClick={() => {
                                                        handleAddPoints(u.id, u.points || 0);
                                                        setMenuOpenUserId(null);
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase text-sky-400 hover:bg-sky-400/10 transition-all flex items-center gap-2"
                                                >
                                                    <Coins className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                    Gestionar Puntos
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const active = !u.pulsePassActive;
                                                        await togglePulsePass(u.id, active);
                                                        setMenuOpenUserId(null);
                                                        showToast(active ? "PulsePass Activado" : "PulsePass Desactivado", "success");
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase text-amber-500 hover:bg-amber-500/10 transition-all flex items-center gap-2"
                                                >
                                                    <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                    PulsePass
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleSendNotification(u);
                                                        setMenuOpenUserId(null);
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase text-white hover:bg-white/5 transition-all flex items-center gap-2"
                                                >
                                                    <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />
                                                    Notificar
                                                </button>
                                            </div>
                                            <div className="p-2">
                                                <button
                                                    onClick={() => {
                                                        handleToggleBan(u);
                                                        setMenuOpenUserId(null);
                                                    }}
                                                    className={`w-full text-left px-3 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all flex items-center gap-2 ${u.isBanned ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-orange-500 hover:bg-orange-500/10'}`}
                                                >
                                                    <ShieldAlert className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                    {u.isBanned ? 'Desbanear' : 'Banear'}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (await showConfirm(`¿Eliminar definitivamente a ${u.name}? Esta acción no se puede deshacer.`)) {
                                                            showToast("Funcionalidad de borrado en desarrollo", "info");
                                                            setMenuOpenUserId(null);
                                                        }
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500/10 transition-all flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
