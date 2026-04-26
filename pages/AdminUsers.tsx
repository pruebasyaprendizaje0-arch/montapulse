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
    Trash2
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
        deletedBusinesses, handleRestoreBusiness
    } = useData();
    const navigate = useNavigate();
    const { showToast, showConfirm, showPrompt } = useToast();
    const { user: currentUser } = useAuthContext();

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');

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
        basic: allUsers.filter(u => u.plan === SubscriptionPlan.BASIC).length,
        premium: allUsers.filter(u => u.plan === SubscriptionPlan.PREMIUM).length,
        expert: allUsers.filter(u => u.plan === SubscriptionPlan.EXPERT).length
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

                    {/* Compact Stats & Filters */}
                    <div className="flex flex-col gap-1.5 mb-1">
                        {/* Stats Row */}
                        <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-lg p-1.5">
                            {[
                                { label: 'Tot', value: stats.total, color: 'text-orange-400' },
                                { label: 'Adm', value: stats.admins, color: 'text-amber-400' },
                                { label: 'Pre', value: stats.premium, color: 'text-purple-400' },
                                { label: 'Exp', value: stats.expert, color: 'text-cyan-400' }
                            ].map((stat, i) => (
                                <div key={i} className="flex flex-col items-center flex-1 border-r border-white/5 last:border-0">
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
                                <option value="visitor" className="bg-slate-900">Exp</option>
                                <option value="host" className="bg-slate-900">Host</option>
                                <option value="admin" className="bg-slate-900">Admin</option>
                            </select>
                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold text-white outline-none w-24"
                            >
                                <option value="all" className="bg-slate-900">Planes</option>
                                <option value={SubscriptionPlan.FREE} className="bg-slate-900">Gratis</option>
                                <option value={SubscriptionPlan.BASIC} className="bg-slate-900">Basic</option>
                                <option value={SubscriptionPlan.PREMIUM} className="bg-slate-900">Premium</option>
                                <option value={SubscriptionPlan.EXPERT} className="bg-slate-900">Expert</option>
                            </select>
                        </div>
                    </div>

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
                                                {u.plan === SubscriptionPlan.EXPERT && (
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
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                                            <div className={`px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider border ${u.plan === SubscriptionPlan.EXPERT
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-sm shadow-amber-500/10'
                                                : 'bg-white/5 border-white/10 text-slate-400'
                                                }`}>
                                                {u.plan}
                                            </div>
                                            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${isTargetSuperuser ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-sm shadow-amber-500/10' : 'bg-white/5 text-white/40 border-white/5'}`}>
                                                {isTargetSuperuser ? 'MASTER ADMIN' : u.role}
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
                                                    if (await showConfirm(`¿Cambiar rol a ${nextRole === 'admin' ? 'ADMINISTRADOR' : 'Explorador'}?`, 'Cambiar Rol')) {
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
                                                {u.role === 'admin' ? 'Es Admin' : 'Hacer Admin'}
                                            </button>

                                            <button
                                                onClick={async () => {
                                                    if (!canModify) {
                                                        showToast('Acción denegada.', 'error'); return;
                                                    }
                                                    const plans = [SubscriptionPlan.FREE, SubscriptionPlan.BASIC, SubscriptionPlan.PREMIUM, SubscriptionPlan.EXPERT];
                                                    const nextPlan = plans[(plans.indexOf(u.plan || SubscriptionPlan.FREE) + 1) % plans.length];
                                                    if (await showConfirm(`¿Cambiar plan a ${nextPlan}?`, 'Actualizar Plan')) {
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
                                                <Zap className="w-3 h-3" /> Plan: {u.plan}
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
                                                                            try { await deleteBusiness(userBusiness.id, false); showToast('Movido', 'success'); } catch (e) {}
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
                                                                        } catch (e) {}
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
