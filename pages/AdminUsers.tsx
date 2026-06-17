import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ShieldCheck,
    Search,
    Filter,
    User as UserIcon,
    Crown,
    Building2,
    Mail,
    MoreHorizontal,
    ArrowUpRight,
    Users,
    Zap,
    CheckCircle,
    Trash2,
    Award,
    TrendingUp,
    Gift,
    Link as LinkIcon
} from 'lucide-react';
import { UserProfile, SubscriptionPlan } from '../types';
import { updateUser, togglePulsePass, updateBusiness, createBusiness, deleteBusiness, incrementBusinessViewCount } from '../services/firestoreService';
import { PLAN_LIMITS } from '../constants';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useAuthContext } from '../context/AuthContext';

export const AdminUsers: React.FC = () => {
    const {
        allUsers, setAllUsers, businesses, setBusinesses,
        handlePurgeAllReferences, isSuperUser,
        deletedBusinesses, handleRestoreBusiness,
        planNames
    } = useData();
    const navigate = useNavigate();
    const { showToast, showConfirm, showPrompt } = useToast();
    const { user: currentUser } = useAuthContext();

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'users' | 'referrals'>('users');

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
        const sq = searchQuery || '';
        const sqLower = sq.toLowerCase();
        return allUsers.filter(u => {
            const matchesSearch = !sq ||
                (u.name || '').toLowerCase().includes(sqLower) ||
                (u.surname || '').toLowerCase().includes(sqLower) ||
                (u.email || '').toLowerCase().includes(sqLower);

            const matchesRole = roleFilter === 'all' || u.role === roleFilter;
            const matchesPlan = planFilter === 'all' || u.plan === planFilter;

            return matchesSearch && matchesRole && matchesPlan;
        });
    }, [allUsers, searchQuery, roleFilter, planFilter]);

    const stats = useMemo(() => ({
        total: allUsers.length,
        hosts: allUsers.filter(u => u.role === 'host').length,
        admins: allUsers.filter(u => u.role === 'admin').length,
        pro: allUsers.filter(u => u.plan === SubscriptionPlan.PRO).length,
        elite: allUsers.filter(u => u.plan === SubscriptionPlan.ELITE).length
    }), [allUsers]);

    return (
        <div className="h-auto w-full bg-slate-950 font-['Outfit'] pb-48">
            {/* Header section with glassmorphism */}
            <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-2xl border-b border-white/5 pt-12 pb-2 px-4 shadow-md shadow-black/20">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            onClick={() => navigate('/host')}
                            className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-all border border-white/10"
                        >
                            <ChevronLeft className="w-4 h-4 text-white" />
                        </button>
                        <div className="text-center">
                            <h1 className="text-sm font-black tracking-[0.2em] text-white uppercase flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-orange-400" />
                                Gestión de Usuarios
                            </h1>
                        </div>
                        <div className="w-7"></div>
                    </div>

                    {/* Tab Selector */}
                    <div className="grid grid-cols-2 gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-2">
                        <button
                            onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
                            className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'users'
                                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Usuarios
                        </button>
                        <button
                            onClick={() => { setActiveTab('referrals'); setSearchQuery(''); }}
                            className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'referrals'
                                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Award className="w-3.5 h-3.5" />
                            Red de Referidos
                        </button>
                    </div>

                    {/* Compact Stats & Filters */}
                    {activeTab === 'users' && (
                        <div className="flex flex-col gap-1.5 mb-1">
                            {/* Stats Row */}
                            <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-lg p-1.5 overflow-x-auto no-scrollbar">
                                {[
                                    { label: 'Tot', value: stats.total, color: 'text-orange-400' },
                                    { label: 'Pro', value: stats.pro, color: 'text-blue-400' },
                                    { label: 'Elite', value: stats.elite, color: 'text-purple-400' },
                                    { label: 'Adm', value: stats.admins, color: 'text-green-400' }
                                ].map((stat, i) => (
                                    <div key={i} className="flex flex-col items-center flex-1 border-r border-white/5 last:border-0 min-w-[50px]">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-white/50 leading-none mb-0.5">{stat.label}</p>
                                        <p className={`text-xs font-black leading-none ${stat.color}`}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Search & Filters Row */}
                            <div className="flex gap-1.5">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-7 pr-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all"
                                    />
                                </div>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold text-white outline-none w-20"
                                >
                                    <option value="all" className="bg-slate-900">Roles</option>
                                    <option value="visitor" className="bg-slate-900">Explorador</option>
                                    <option value="host" className="bg-slate-900">Ubicame Socio</option>
                                    <option value="admin" className="bg-slate-900">Master Admin</option>
                                </select>
                                <select
                                    value={planFilter}
                                    onChange={(e) => setPlanFilter(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold text-white outline-none w-24"
                                >
                                    <option value="all" className="bg-slate-900">Planes</option>
                                    <option value={SubscriptionPlan.FREE} className="bg-slate-900">{planNames[SubscriptionPlan.FREE]}</option>
                                    <option value={SubscriptionPlan.PRO} className="bg-slate-900">{planNames[SubscriptionPlan.PRO]}</option>
                                    <option value={SubscriptionPlan.ELITE} className="bg-slate-900">{planNames[SubscriptionPlan.ELITE]}</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Dangerous Actions - Only for SuperUser/Admin */}
                    {isSuperUser && (
                        <div className="mt-1.5 pt-1.5 border-t border-white/5">
                            <button
                                onClick={handlePurgeAllReferences}
                                className="w-full group bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-400 py-1.5 px-3 rounded-lg transition-all duration-300 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Trash2 className="w-3 h-3 text-red-500 group-hover:text-white" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-red-500 group-hover:text-white">Borrar puntos (Peligro)</p>
                                </div>
                                <ArrowUpRight className="w-3 h-3 text-red-500 group-hover:text-white" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'users' ? (
                <div className="p-6 max-w-2xl mx-auto space-y-4">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <Search className="w-6 h-6 text-white/20" />
                            </div>
                            <p className="text-slate-500 font-medium">No se encontraron usuarios</p>
                        </div>
                    ) : (
                        filteredUsers.map(u => {
                            const userBusiness = u.businessId ? (businesses.find(b => b.id === u.businessId) || deletedBusinesses.find(b => b.id === u.businessId)) : null;
                            const isDeleted = (userBusiness && 'isDeleted' in userBusiness && userBusiness.isDeleted) || false;

                            const SUPERUSER_EMAILS = ['fhernandezcalle@gmail.com', 'pruebasyaprendizaje0@gmail.com'];
                            const isTargetSuperuser = SUPERUSER_EMAILS.includes(u.email || '');
                            const isCurrentUserSuperuser = SUPERUSER_EMAILS.includes(currentUser?.email || '');
                            const canModify = !isTargetSuperuser || isCurrentUserSuperuser;

                            return (
                                <div key={u.id} className="group bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/30 hover:bg-slate-900/80 transition-all duration-300 shadow-xl shadow-black/20">
                                    <div className="p-4 sm:p-5">
                                        {/* Top Header: Avatar, Info, Badges */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="relative shrink-0">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 overflow-hidden ring-2 ring-white/10 group-hover:ring-orange-500/30 transition-all">
                                                        <img
                                                            src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name || 'User'}+${u.surname || 'Name'}&background=f97316&color=fff&bold=true`}
                                                            className="w-full h-full object-cover"
                                                            alt={u.name || 'User'}
                                                        />
                                                    </div>
                                                    {u.plan === SubscriptionPlan.ELITE && (
                                                        <div className="absolute -top-1.5 -right-1.5 bg-amber-500 p-1 rounded-md shadow-lg shadow-amber-500/40 border border-amber-300">
                                                            <Crown className="w-2.5 h-2.5 text-black" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-white font-black text-sm tracking-tight truncate max-w-[120px] sm:max-w-[200px]">{u.name || 'Usuario'} {u.surname || ''}</p>
                                                        {(u.role === 'admin' || isTargetSuperuser) && (
                                                            <ShieldCheck className={`w-4 h-4 shrink-0 ${isTargetSuperuser ? 'text-amber-500' : 'text-orange-500'}`} />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] sm:text-xs font-medium">
                                                        <Mail className="w-3 h-3 shrink-0 text-slate-500" />
                                                        <span className="truncate max-w-[120px] sm:max-w-[200px]">{u.email}</span>
                                                    </div>
                                                    {(() => {
                                                        const userBiz = u.businessId ? (businesses.find(b => b.id === u.businessId) || deletedBusinesses.find(b => b.id === u.businessId)) : null;
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
                                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
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
                                            <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                                                <div className={`px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider border ${u.plan === SubscriptionPlan.ELITE
                                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-sm shadow-amber-500/10'
                                                    : 'bg-white/5 border-white/10 text-slate-400'
                                                    }`}>
                                                    {planNames[u.plan || SubscriptionPlan.FREE]}
                                                </div>
                                                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${isTargetSuperuser ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-sm shadow-amber-500/10' : 'bg-white/5 text-white/40 border-white/5'}`}>
                                                    {isTargetSuperuser ? 'MASTER ADMIN' : (u.role === 'admin' ? 'MASTER ADMIN' : (u.role === 'host' ? 'UBICAME SOCIO' : 'EXPLORADOR'))}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Buttons & Details */}
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                                                    <p className="text-xs font-bold text-white truncate max-w-[200px]">
                                                        {userBusiness ? (
                                                            <span className={isDeleted ? "text-red-400 italic" : ""}>
                                                                {userBusiness.name} {isDeleted && "(Papelera)"}
                                                            </span>
                                                        ) : <span className="text-white/40">Sin negocio asociado</span>}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Primary Actions Grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={async () => {
                                                        if (!canModify) {
                                                            showToast('Acción denegada.', 'error'); return;
                                                        }
                                                        const nextRole = u.role === 'admin' ? 'visitor' : 'admin';
                                                        if (await showConfirm(`¿Cambiar rol a ${nextRole === 'admin' ? 'MASTER ADMIN' : 'EXPLORADOR'}?`, 'Cambiar Rol')) {
                                                            try {
                                                                await updateUser(u.id, { role: nextRole as any });
                                                                setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, role: nextRole } : user));
                                                                showToast('Rol actualizado', 'success');
                                                            } catch (e) { showToast('Error', 'error'); }
                                                        }
                                                    }}
                                                    className={`py-2.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-inner shadow-amber-500/20' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                                >
                                                    <ShieldCheck className="w-3 h-3" />
                                                    {u.role === 'admin' ? 'Es Master Admin' : 'Hacer Master Admin'}
                                                </button>

                                                <button
                                                    onClick={async () => {
                                                        if (!canModify) {
                                                            showToast('Acción denegada.', 'error'); return;
                                                        }
                                                        const plans = [
                                                            SubscriptionPlan.FREE,
                                                            SubscriptionPlan.PRO,
                                                            SubscriptionPlan.ELITE
                                                        ];
                                                        const nextPlan = plans[(plans.indexOf(u.plan || SubscriptionPlan.FREE) + 1) % plans.length];
                                                        if (await showConfirm(`¿Cambiar plan a ${planNames[nextPlan]}?`, 'Actualizar Plan')) {
                                                            try {
                                                                await updateUser(u.id, { plan: nextPlan });
                                                                setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, plan: nextPlan } : user));
                                                                if (u.businessId) {
                                                                    const creds = PLAN_LIMITS[nextPlan as keyof typeof PLAN_LIMITS] || 0;
                                                                    await updateBusiness(u.businessId, { plan: nextPlan, eventCredits: creds, lastResetDate: new Date().toISOString() });
                                                                    setBusinesses(prev => prev.map(b => b.id === u.businessId ? { ...b, plan: nextPlan, eventCredits: creds } : b));
                                                                }
                                                                showToast('Plan actualizado', 'success');
                                                            } catch (e) { showToast('Error', 'error'); }
                                                        }
                                                    }}
                                                    className={`py-2.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${u.plan === SubscriptionPlan.EXPERT ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-inner shadow-amber-500/20' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                                >
                                                    <Zap className="w-3 h-3" /> Plan: {planNames[u.plan || SubscriptionPlan.FREE]}
                                                </button>
                                            </div>

                                            {/* Expandable Advanced Options */}
                                            <details className="group/details mt-2 border border-white/5 rounded-xl bg-black/20 overflow-hidden">
                                                <summary className="cursor-pointer text-[10px] font-bold text-slate-400 hover:text-white transition-colors flex items-center justify-between p-3 select-none hover:bg-white/5">
                                                    <span>Opciones Avanzadas</span>
                                                    <MoreHorizontal className="w-4 h-4 group-open/details:hidden" />
                                                    <ChevronLeft className="w-4 h-4 hidden group-open/details:block -rotate-90" />
                                                </summary>
                                                <div className="p-3 pt-3 space-y-2 border-t border-white/5 bg-black/40">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                if (!canModify) { showToast('Denegado.', 'error'); return; }
                                                                const n = !u.pulsePassActive;
                                                                if (await showConfirm(`¿${n ? 'Activar' : 'Desactivar'} Pulse Pass?`, 'Pulse Pass')) {
                                                                    try {
                                                                        await togglePulsePass(u.id, n);
                                                                        setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, pulsePassActive: n } : user));
                                                                        showToast('Actualizado', 'success');
                                                                    } catch (e) { showToast('Error', 'error'); }
                                                                }
                                                            }}
                                                            className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${u.pulsePassActive ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-inner shadow-orange-500/10' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                                                        >
                                                            <Zap className="w-3 h-3" /> Pulse: {u.pulsePassActive ? 'ON' : 'OFF'}
                                                        </button>

                                                        {userBusiness && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (!canModify) { showToast('Denegado.', 'error'); return; }
                                                                    const v = !userBusiness.isVerified;
                                                                    if (await showConfirm(`¿${v ? 'Verificar' : 'Quitar verificación'}?`, 'Verificar')) {
                                                                        try {
                                                                            await updateBusiness(userBusiness.id, { isVerified: v });
                                                                            setBusinesses(prev => prev.map(b => b.id === userBusiness.id ? { ...b, isVerified: v } : b));
                                                                            showToast('Actualizado', 'success');
                                                                        } catch (e) { showToast('Error', 'error'); }
                                                                    }
                                                                }}
                                                                className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${userBusiness.isVerified ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-inner shadow-orange-500/10' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                                                            >
                                                                <CheckCircle className="w-3 h-3" /> {userBusiness.isVerified ? 'Verificado' : 'Verificar'}
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="pt-1 border-t border-white/5 mt-2">
                                                        {!userBusiness ? (
                                                            <button
                                                                onClick={async () => {
                                                                    if (!canModify) { showToast('Denegado.', 'error'); return; }
                                                                    const bName = await showPrompt(`Nombre del negocio:`, 'Crear Negocio', 'Mi Negocio');
                                                                    if (bName) {
                                                                        const dup = businesses.find(b => b.name.toLowerCase() === bName.toLowerCase()) || deletedBusinesses.find(b => b.name.toLowerCase() === bName.toLowerCase());
                                                                        if (dup) {
                                                                            if (await showConfirm(`¿Asignar negocio existente "${dup.name}"?`, 'Duplicado')) {
                                                                                try {
                                                                                    await updateBusiness(dup.id, { ownerId: u.id, isDeleted: false, isPublished: true });
                                                                                    await updateUser(u.id, { businessId: dup.id });
                                                                                    setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, businessId: dup.id } : user));
                                                                                    setBusinesses(prev => {
                                                                                        if (deletedBusinesses.find(d => d.id === dup.id)) {
                                                                                            return [...prev, { ...dup, ownerId: u.id, isDeleted: false, isPublished: true }];
                                                                                        }
                                                                                        return prev.map(b => b.id === dup.id ? { ...b, ownerId: u.id, isDeleted: false, isPublished: true } : b);
                                                                                    });
                                                                                    showToast('Negocio asignado', 'success');
                                                                                } catch (e) { showToast('Error', 'error'); }
                                                                            }
                                                                            return;
                                                                        }
                                                                        if (await showConfirm(`¿Crear negocio "${bName}"?`, 'Confirmar')) {
                                                                            try {
                                                                                const nId = await createBusiness({
                                                                                    name: bName, ownerId: u.id, plan: u.plan || SubscriptionPlan.FREE,
                                                                                    isVerified: true, description: 'Negocio admin', sector: 'Centro' as any,
                                                                                    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
                                                                                    category: 'Restaurante' as any, coordinates: [-0.747, -80.752]
                                                                                });
                                                                                await updateUser(u.id, { businessId: nId });
                                                                                setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, businessId: nId } : user));
                                                                                showToast('Creado', 'success');
                                                                            } catch (e) { showToast('Error', 'error'); }
                                                                        }
                                                                    }
                                                                }}
                                                                className="mt-2 w-full py-2.5 px-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all flex justify-center items-center gap-1.5 shadow-inner shadow-red-500/10"
                                                            >
                                                                <Building2 className="w-3 h-3" /> Crear Negocio
                                                            </button>
                                                        ) : (
                                                            <div className="flex gap-2 mt-2">
                                                                {isDeleted ? (
                                                                    <button
                                                                        onClick={() => { if (!canModify) return; handleRestoreBusiness(userBusiness.id); showToast('Restaurado', 'success'); }}
                                                                        className="flex-1 py-2 px-2 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-black uppercase hover:bg-orange-500 hover:text-white transition-all text-center"
                                                                    >
                                                                        Restaurar
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!canModify) return;
                                                                            if (await showConfirm('¿Mover a papelera?', 'Papelera')) {
                                                                                try { await deleteBusiness(userBusiness.id, false); showToast('Movido', 'success'); } catch (e) { }
                                                                            }
                                                                        }}
                                                                        className="flex-1 py-2 px-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all text-center shadow-inner shadow-red-500/10"
                                                                    >
                                                                        Papelera
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!canModify) return;
                                                                        if (await showConfirm('¿Borrado IRREVERSIBLE?', '¡PELIGRO!')) {
                                                                            try {
                                                                                await deleteBusiness(userBusiness.id, true);
                                                                                await updateUser(u.id, { businessId: "" });
                                                                                setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, businessId: "" } : user));
                                                                                showToast('Eliminado permanentemente', 'success');
                                                                            } catch (e) { }
                                                                        }
                                                                    }}
                                                                    className="flex-1 py-2 px-2 rounded-lg bg-black text-red-600 border border-red-900/50 text-[9px] font-black uppercase hover:bg-red-900 hover:text-white transition-all text-center"
                                                                >
                                                                    Destruir
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </details>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="p-6 max-w-2xl mx-auto space-y-6">
                    {/* KPI Metrics Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 p-3 rounded-2xl flex flex-col justify-between shadow-xl shadow-black/20 hover:border-orange-500/20 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Registrados</span>
                                <LinkIcon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            </div>
                            <div>
                                <span className="text-xl font-black text-white">{referralStats.total}</span>
                                <p className="text-[8px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Negocios vía link</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 p-3 rounded-2xl flex flex-col justify-between shadow-xl shadow-black/20 hover:border-orange-500/20 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Conversiones</span>
                                <TrendingUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            </div>
                            <div>
                                <span className="text-xl font-black text-white">{referralStats.conversions}</span>
                                <p className="text-[8px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">Premium activo</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 p-3 rounded-2xl flex flex-col justify-between shadow-xl shadow-black/20 hover:border-orange-500/20 transition-all">
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
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all"
                        />
                    </div>

                    {/* Referral History Table */}
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
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

            {/* Deleted Businesses / Restoration Section */}
            {deletedBusinesses.length > 0 && (
                <div className="p-6 max-w-2xl mx-auto space-y-6">
                    <div className="pt-10 border-t border-white/10">
                        <div className="flex items-center gap-3 mb-6">
                            <Trash2 className="w-6 h-6 text-orange-500" />
                            <div>
                                <h2 className="text-xl font-black text-white tracking-widest uppercase">Papelera de Reciclaje</h2>
                                <p className="text-xs font-bold text-white/40 tracking-widest mt-1">Negocios y puntos borrados recientemente</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {deletedBusinesses.map(biz => (
                                <div key={biz.id} className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-5 rounded-3xl flex items-center justify-between group hover:border-orange-500/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden border border-white/10 grayscale group-hover:grayscale-0 transition-all">
                                            <img src={biz.imageUrl} className="w-full h-full object-cover" alt={biz.name} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white leading-none mb-1">{biz.name}</p>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                                {biz.isReference ? 'Punto de Referencia' : 'Negocio'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                handleRestoreBusiness(biz.id);
                                                showToast(`"${biz.name}" restaurado con éxito`, 'success');
                                            }}
                                            className="px-5 py-2.5 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-500/10"
                                        >
                                            Restaurar
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const confirmed = await showConfirm(
                                                    `¿Eliminar PERMANENTEMENTE "${biz.name}"?`,
                                                    'Borrado Definitivo'
                                                );
                                                if (confirmed) {
                                                    try {
                                                        await deleteBusiness(biz.id, true);
                                                        showToast(`Eliminado permanentemente`, 'error');
                                                    } catch (err) {
                                                        showToast('Error al eliminar', 'error');
                                                    }
                                                }
                                            }}
                                            className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                            title="Borrar Permanentemente"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
