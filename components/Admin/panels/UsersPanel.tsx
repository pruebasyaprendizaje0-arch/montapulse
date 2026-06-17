import React, { useState, useMemo } from 'react';
import { 
    Search, Users, Coins, Crown, ShieldCheck, Mail, Activity, 
    ShieldAlert, Trash2, ChevronRight, CheckCircle, MoreHorizontal as MoreHorizontalIcon,
    Award, TrendingUp, Gift, Link
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { SubscriptionPlan, UserProfile } from '../../../types';
import { updateUser, createNotification, togglePulsePass, updateBusiness } from '../../../services/firestoreService';

interface UsersPanelProps {
    stats: {
        users: number;
        proUsers: number;
        eliteUsers: number;
        admins: number;
    };
}

export const UsersPanel: React.FC<UsersPanelProps> = ({ stats }) => {
    const { allUsers, transactions, businesses, setBusinesses } = useData();
    const { showToast, showConfirm } = useToast();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [menuOpenUserId, setMenuOpenUserId] = useState<string | null>(null);
    const [expandedBillingUserId, setExpandedBillingUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState<'users' | 'referrals'>('users');

    const referredBusinesses = useMemo(() => {
        return businesses.filter(b => b.referredBy);
    }, [businesses]);

    const referralStats = useMemo(() => {
        const total = referredBusinesses.length;
        const conversions = referredBusinesses.filter(b => b.plan && b.plan !== SubscriptionPlan.FREE).length;
        const benefits = conversions * 50;
        return { total, conversions, benefits };
    }, [referredBusinesses]);

    const filteredReferredBusinesses = useMemo(() => {
        const sq = (searchQuery || '').toLowerCase();
        return referredBusinesses.filter(b => {
            const matchesSearch = !sq ||
                (b.name || '').toLowerCase().includes(sq) ||
                (b.referredBy || '').toLowerCase().includes(sq);
            return matchesSearch;
        });
    }, [referredBusinesses, searchQuery]);

    const formatDate = (dateValue: any) => {
        if (!dateValue) return 'N/A';
        if (dateValue?.seconds) {
            return new Date(dateValue.seconds * 1000).toLocaleDateString('es-ES');
        }
        return new Date(dateValue).toLocaleDateString('es-ES');
    };

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


    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sub-Tab Selector */}
            <div className="grid grid-cols-2 gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-2">
                <button
                    onClick={() => { setActiveSubTab('users'); setSearchQuery(''); }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        activeSubTab === 'users'
                            ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Users className="w-3.5 h-3.5" />
                    Usuarios
                </button>
                <button
                    onClick={() => { setActiveSubTab('referrals'); setSearchQuery(''); }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        activeSubTab === 'referrals'
                            ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Award className="w-3.5 h-3.5" />
                    Red de Referidos
                </button>
            </div>

            {activeSubTab === 'users' ? (
                <>
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
                                    <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden flex-wrap">
                                        <p className="text-[9px] sm:text-[10px] text-slate-500 truncate">{u.email}</p>
                                        <span className="w-0.5 h-0.5 rounded-full bg-slate-800 shrink-0" />
                                        <p className="text-[8px] sm:text-[9px] font-black text-orange-500/80 uppercase tracking-tighter shrink-0">
                                            {u.points || 0} pts
                                        </p>
                                        <span className="w-0.5 h-0.5 rounded-full bg-slate-800 shrink-0" />
                                        <button 
                                            onClick={() => setExpandedBillingUserId(expandedBillingUserId === u.id ? null : u.id)}
                                            className="text-[8px] sm:text-[9px] font-black text-sky-400 hover:text-sky-300 uppercase shrink-0 transition-colors flex items-center gap-1"
                                        >
                                            💳 Facturación
                                        </button>
                                    </div>
                                    {(() => {
                                        const userBiz = u.businessId ? businesses.find(b => b.id === u.businessId) : null;
                                        const userReferrerId = userBiz ? (userBiz.slug || userBiz.id) : null;
                                        const suggested = businesses.filter(b => 
                                            b.referredBy && (
                                                (userReferrerId && b.referredBy === userReferrerId) || 
                                                b.referredBy === u.id || 
                                                (u.email && b.referredBy === u.email)
                                            )
                                        );
                                        if (suggested.length === 0) return null;
                                        return (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest self-center">Sugeridos:</span>
                                                {suggested.map(b => (
                                                    <span key={b.id} className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                                                        <span>{b.name}</span>
                                                        {b.plan && b.plan !== SubscriptionPlan.FREE && (
                                                            <span className="text-amber-500 text-[9px] font-black">★</span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        );
                                    })()}
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
                        
                        {/* Expanded Billing Details */}
                        {expandedBillingUserId === u.id && (
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Información de Facturación</p>
                                <div className="grid grid-cols-2 gap-3 bg-black/40 p-3 rounded-xl border border-white/5 text-[10px]">
                                    <div>
                                        <p className="text-slate-500 font-bold uppercase text-[8px]">Plan Actual</p>
                                        <p className="font-black text-white uppercase">{u.plan || 'Free'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 font-bold uppercase text-[8px]">Estado de Pago</p>
                                        <p className="font-black text-white uppercase">{u.paymentStatus || (u.plan !== 'Free' ? 'Activo (Manual)' : 'N/A')}</p>
                                    </div>
                                </div>

                                {/* Transactions list for user */}
                                <div className="space-y-1.5">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Historial de Transacciones</p>
                                    {(() => {
                                        const userTxs = transactions.filter(t => t.userId === u.id);
                                        if (userTxs.length === 0) {
                                            return <p className="text-[9px] text-slate-600 font-medium italic pl-1">No hay pagos registrados en la plataforma.</p>;
                                        }
                                        return userTxs.map(tx => (
                                            <div key={tx.id} className="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/[0.03] text-[9px]">
                                                <div className="min-w-0">
                                                    <p className="font-bold text-white uppercase">Adquisición: {tx.planId}</p>
                                                    <p className="text-slate-500 font-mono text-[8px] truncate">Ref: {tx.id}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${tx.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                                        {tx.status}
                                                    </span>
                                                    <p className="text-[8px] text-slate-500 mt-0.5">
                                                        {new Date(tx.timestamp).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            </>
            ) : (
                <div className="space-y-6">
                    {/* KPI Metrics Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/5 p-3 rounded-2xl flex flex-col justify-between shadow-xl shadow-black/20 hover:border-orange-500/20 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Registrados</span>
                                <Link className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            </div>
                            <div>
                                <span className="text-xl font-black text-white">{referralStats.total}</span>
                                <p className="text-[8px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Negocios vía link</p>
                            </div>
                        </div>

                        <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/5 p-3 rounded-2xl flex flex-col justify-between shadow-xl shadow-black/20 hover:border-orange-500/20 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Conversiones</span>
                                <TrendingUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            </div>
                            <div>
                                <span className="text-xl font-black text-white">{referralStats.conversions}</span>
                                <p className="text-[8px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Premium activo</p>
                            </div>
                        </div>

                        <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/5 p-3 rounded-2xl flex flex-col justify-between shadow-xl shadow-black/20 hover:border-orange-500/20 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Beneficios</span>
                                <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            </div>
                            <div>
                                <span className="text-xl font-black text-white">+{referralStats.benefits}</span>
                                <p className="text-[8px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Créditos aplicados</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar for referrals */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                        <input
                            type="text"
                            placeholder="Buscar negocio sugerido o código..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-neutral-900/50 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all"
                        />
                    </div>

                    {/* Referral History Table */}
                    <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/5">
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Negocio Sugerido</th>
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Estado Comercial</th>
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredReferredBusinesses.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-500 text-xs font-bold">
                                                No hay registros de referidos encontrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredReferredBusinesses.map((biz) => {
                                            const isPremium = biz.plan && biz.plan !== SubscriptionPlan.FREE;
                                            const referrerBiz = businesses.find(r => r.id === biz.referredBy || r.slug === biz.referredBy);
                                            return (
                                                <tr key={biz.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 overflow-hidden border border-white/10 shrink-0">
                                                                <img
                                                                    src={biz.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=100'}
                                                                    className="w-full h-full object-cover"
                                                                    alt={biz.name}
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-black text-white truncate max-w-[120px]">{biz.name}</p>
                                                                <p className="text-[9px] text-slate-500 truncate max-w-[120px]">
                                                                    De: <span className="text-orange-400/80 font-bold">{referrerBiz ? referrerBiz.name : biz.referredBy}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                        {formatDate(biz.createdAt || biz.lastResetDate)}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                                            isPremium
                                                                ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-sm shadow-green-500/10'
                                                                : 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-sm shadow-orange-500/10'
                                                        }`}>
                                                            {isPremium ? 'Premium Activo' : 'Cuenta Gratuita'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={async () => {
                                                                const referrerTarget = businesses.find(r => r.id === biz.referredBy || r.slug === biz.referredBy);
                                                                if (!referrerTarget) {
                                                                    showToast('No se encontró el negocio referente.', 'error');
                                                                    return;
                                                                }
                                                                if (await showConfirm(`¿Forzar recompensa de +50 créditos a "${referrerTarget.name}" por referir a "${biz.name}"?`, 'Forzar Recompensa')) {
                                                                    try {
                                                                        const currentCredits = referrerTarget.eventCredits || 0;
                                                                        const newCredits = currentCredits + 50;
                                                                        await updateBusiness(referrerTarget.id, { eventCredits: newCredits });
                                                                        setBusinesses(prev => prev.map(b => b.id === referrerTarget.id ? { ...b, eventCredits: newCredits } : b));
                                                                        showToast('Recompensa aplicada con éxito (+50 créditos)', 'success');
                                                                    } catch (err) {
                                                                        showToast('Error al aplicar la recompensa', 'error');
                                                                    }
                                                                }
                                                            }}
                                                            className="px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500 hover:text-black transition-all text-[8px] font-black uppercase tracking-wider"
                                                        >
                                                            Forzar Recompensa
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
