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

export const AdminUsers: React.FC = () => {
    const { 
        allUsers, setAllUsers, businesses, setBusinesses, 
        handlePurgeAllReferences, isSuperUser,
        deletedBusinesses, handleRestoreBusiness
    } = useData();
    const navigate = useNavigate();
    const { showToast, showConfirm, showPrompt } = useToast();

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
            <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-2xl border-b border-white/5 pt-20 pb-6 px-6">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <button
                            onClick={() => navigate('/host')}
                            className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10"
                        >
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        <div className="text-center">
                            <h1 className="text-xl font-black tracking-[0.2em] text-white uppercase flex items-center gap-3">
                                <Users className="w-5 h-5 text-orange-400" />
                                Gestión de Usuarios
                            </h1>
                        </div>
                        <div className="w-11"></div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                        {[
                            { label: 'Total', value: stats.total, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                            { label: 'Admins', value: stats.admins, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                            { label: 'Premium', value: stats.premium, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                            { label: 'Expert', value: stats.expert, color: 'text-cyan-400', bg: 'bg-cyan-500/10' }
                        ].map((stat, i) => (
                            <div key={i} className={`${stat.bg} p-4 rounded-2xl border border-white/5`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{stat.label}</p>
                                <p className="text-2xl font-black ${stat.color}">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Search & Filters */}
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none"
                            >
                                <option value="all" className="bg-slate-900">Todos los Roles</option>
                                <option value="visitor" className="bg-slate-900">Exploradores</option>
                                <option value="host" className="bg-slate-900">Hosts</option>
                                <option value="admin" className="bg-slate-900">Admins</option>
                            </select>

                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none"
                            >
                                <option value="all" className="bg-slate-900">Todos los Planes</option>
                                <option value={SubscriptionPlan.FREE} className="bg-slate-900">Gratis - 0 eventos</option>
                                <option value={SubscriptionPlan.BASIC} className="bg-slate-900">Basic - 4 eventos, 1 anuncio</option>
                                <option value={SubscriptionPlan.PREMIUM} className="bg-slate-900">Premium - 10 eventos, 4 anuncios</option>
                                <option value={SubscriptionPlan.EXPERT} className="bg-slate-900">Expert - Ilimitado (Admin)</option>
                            </select>
                        </div>
                    </div>

                    {/* Dangerous Actions - Only for SuperUser/Admin */}
                    {isSuperUser && (
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <button
                                onClick={handlePurgeAllReferences}
                                className="w-full group bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-400 p-4 rounded-2xl transition-all duration-300 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/20 group-hover:bg-black/20 rounded-xl transition-colors">
                                        <Trash2 className="w-5 h-5 text-red-500 group-hover:text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-black uppercase tracking-widest text-red-500 group-hover:text-white">Zona de Peligro</p>
                                        <p className="text-[10px] font-bold text-red-500/60 group-hover:text-white/80">Borrar todos los puntos de referencia</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="w-5 h-5 text-red-500 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
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

                        return (

                            <div key={u.id} className="group bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2rem] overflow-hidden hover:border-white/10 transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-orange-500/20 to-amber-500/20 overflow-hidden ring-2 ring-white/10 group-hover:ring-orange-500/30 transition-all">
                                                    <img
                                                        src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name || 'User'}+${u.surname || 'Name'}&background=f97316&color=fff&bold=true`}
                                                        className="w-full h-full object-cover"
                                                        alt={u.name || 'User'}
                                                    />
                                                </div>
                                                {u.plan === SubscriptionPlan.EXPERT && (
                                                    <div className="absolute -top-2 -right-2 bg-amber-500 p-1.5 rounded-lg shadow-lg shadow-amber-500/20 border border-amber-400">
                                                        <Crown className="w-3 h-3 text-black" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-white font-black text-xl tracking-tight">{u.name || 'Usuario'} {u.surname || ''}</p>
                                                    {u.role === 'admin' && (
                                                        <div className="bg-orange-500/10 px-1.5 py-0.5 rounded-md border border-orange-500/20">
                                                            <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                                                    <Mail className="w-3 h-3" />
                                                    {u.email}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ${u.plan === SubscriptionPlan.EXPERT
                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-lg shadow-amber-500/10'
                                            : 'bg-white/5 border-white/10 text-slate-400'
                                            }`}>
                                            {u.plan}
                                        </div>
                                    </div>

                                    {/* Additional Info */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <ShieldCheck className="w-3 h-3 text-orange-400" /> Rol Actual
                                            </p>
                                            <p className="text-sm font-bold text-white capitalize">{u.role}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <Building2 className="w-3 h-3 text-amber-400" /> Negocio
                                            </p>
                                            <p className="text-sm font-bold text-white truncate">
                                                {userBusiness ? (
                                                    <span className={isDeleted ? "text-red-400 italic" : ""}>
                                                        {userBusiness.name} {isDeleted && "(Borrador/Trash)"}
                                                    </span>
                                                ) : 'Ninguno'}
                                            </p>

                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={async () => {
                                                    const nextRole = u.role === 'admin' ? 'visitor' : 'admin';
                                                    const confirmed = await showConfirm(
                                                        `¿Cambiar rol de ${u.name || 'este usuario'} a ${nextRole === 'admin' ? 'ADMINISTRADOR' : 'Explorador'}?`,
                                                        'Cambiar Rol'
                                                    );
                                                    if (confirmed) {
                                                        try {
                                                            await updateUser(u.id, { role: nextRole as any });
                                                            setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, role: nextRole } : user));
                                                            const roleLabel = nextRole === 'admin' ? 'ADMINISTRADOR' : 'Explorador';
                                                            showToast(`Rol de ${u.name || 'Usuario'} actualizado a ${roleLabel}`, 'success');
                                                        } catch (error) {
                                                            console.error('Error updating role:', error);
                                                            showToast('Error al actualizar el rol', 'error');
                                                        }
                                                    }
                                                }}
                                                className={`group/btn relative py-4 px-4 rounded-2xl border transition-all overflow-hidden ${u.role === 'admin' ? 'bg-amber-500 border-amber-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${u.role === 'admin' ? 'bg-black/20' : 'bg-amber-500/10 group-hover/btn:bg-amber-500/20'}`}>
                                                        <ShieldCheck className={`w-4 h-4 ${u.role === 'admin' ? 'text-black' : 'text-amber-400'}`} />
                                                    </div>
                                                    <span className={`text-xs font-black uppercase tracking-widest ${u.role === 'admin' ? 'text-black' : 'text-white'}`}>
                                                        {u.role === 'admin' ? 'Admin' : 'Hacer Admin'}
                                                    </span>
                                                </div>
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const planCycle = [SubscriptionPlan.FREE, SubscriptionPlan.BASIC, SubscriptionPlan.PREMIUM, SubscriptionPlan.EXPERT];
                                                    const currentIndex = planCycle.indexOf(u.plan || SubscriptionPlan.FREE);
                                                    const newPlan = planCycle[(currentIndex + 1) % planCycle.length];

                                                    const confirmed = await showConfirm(
                                                        `¿Cambiar plan de ${u.name || 'este usuario'} a ${newPlan.toUpperCase()}?`,
                                                        'Actualizar Plan'
                                                    );
                                                    if (confirmed) {
                                                        try {
                                                            // 1. Update User Plan
                                                            await updateUser(u.id, { plan: newPlan });
                                                            setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, plan: newPlan } : user));

                                                            // 2. Update Business Plan and Credits if linked
                                                            if (u.businessId) {
                                                                const newCredits = PLAN_LIMITS[newPlan as keyof typeof PLAN_LIMITS] || 0;
                                                                await updateBusiness(u.businessId, { 
                                                                    plan: newPlan,
                                                                    eventCredits: newCredits,
                                                                    lastResetDate: new Date().toISOString()
                                                                });
                                                                
                                                                // Update local businesses state
                                                                setBusinesses(prev => prev.map(b => 
                                                                    b.id === u.businessId ? { ...b, plan: newPlan, eventCredits: newCredits } : b
                                                                ));
                                                            }

                                                            showToast(`Plan de ${u.name || 'Usuario'} actualizado a ${newPlan}`, 'success');
                                                        } catch (error) {
                                                            console.error('Error updating plan:', error);
                                                            showToast('Error al actualizar el plan', 'error');
                                                        }
                                                    }
                                                }}
                                                className={`py-4 px-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border ${u.plan === SubscriptionPlan.EXPERT
                                                        ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20'
                                                        : u.plan === SubscriptionPlan.PREMIUM
                                                            ? 'bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/20'
                                                            : u.plan === SubscriptionPlan.BASIC
                                                                ? 'bg-orange-500 text-white border-orange-400'
                                                                : 'bg-white/5 border-white/10 text-slate-400'
                                                    } hover:scale-[1.02] active:scale-95`}
                                            >
                                                <Zap className={`w-4 h-4 ${u.plan === SubscriptionPlan.EXPERT ? 'fill-current' : ''}`} />
                                                <span>Plan: {u.plan || 'Ninguno'}</span>
                                            </button>
                                        </div>

                                        {/* Advanced Admin Actions */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={async () => {
                                                    const newStatus = !u.pulsePassActive;
                                                    const confirmed = await showConfirm(
                                                        `¿${newStatus ? 'Activar' : 'Desactivar'} Pulse Pass para ${u.name || 'este usuario'}?`,
                                                        'Pulse Pass'
                                                    );
                                                    if (confirmed) {
                                                        try {
                                                            await togglePulsePass(u.id, newStatus);
                                                            setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, pulsePassActive: newStatus } : user));
                                                            showToast(`Pulse Pass de ${u.name || 'Usuario'} ${newStatus ? 'activado' : 'desactivado'}`, 'success');
                                                        } catch (error) {
                                                            console.error('Error toggling Pulse Pass:', error);
                                                            showToast('Error al actualizar Pulse Pass', 'error');
                                                        }
                                                    }
                                                }}
                                                className={`py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${u.pulsePassActive
                                                    ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                                    : 'bg-slate-800/50 border-white/5 text-slate-500'
                                                    }`}
                                            >
                                                <Zap className={`w-3.5 h-3.5 ${u.pulsePassActive ? 'fill-current' : ''}`} />
                                                <span>Pulse Pass: {u.pulsePassActive ? 'ON' : 'OFF'}</span>
                                            </button>

                                            {u.role !== 'admin' ? (
                                                <button
                                                    onClick={async () => {
                                                        const confirmed = await showConfirm(
                                                            `¡ADVERTENCIA! ¿Estás SEGURO de promover a ${u.name || 'este usuario'} a ADMINISTRADOR?\nTendrá acceso total al sistema.`,
                                                            'Promover a Admin'
                                                        );
                                                        if (confirmed) {
                                                            try {
                                                                await updateUser(u.id, { role: 'admin' });
                                                                setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, role: 'admin' } : user));
                                                                showToast(`${u.name || 'Usuario'} promovido a Administrador`, 'success');
                                                            } catch (error) {
                                                                console.error('Error promoting to admin:', error);
                                                                showToast('Error al promover a administrador', 'error');
                                                            }
                                                        }
                                                    }}
                                                    className="py-3 px-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Crown className="w-3.5 h-3.5" />
                                                    Promover Admin
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        const confirmed = await showConfirm(
                                                            `¿Quitar permisos de administrador a ${u.name || 'este usuario'}?`,
                                                            'Degradar Admin'
                                                        );
                                                        if (confirmed) {
                                                            try {
                                                                await updateUser(u.id, { role: 'visitor' });
                                                                setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, role: 'visitor' } : user));
                                                                showToast(`Permisos de administrador quitados a ${u.name || 'este usuario'}`, 'success');
                                                            } catch (error) {
                                                                console.error('Error demoting admin:', error);
                                                                showToast('Error al quitar permisos de administrador', 'error');
                                                            }
                                                        }
                                                    }}
                                                    className="py-3 px-4 rounded-2xl bg-slate-800 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    Quitar Admin
                                                </button>
                                            )}
                                        </div>

                                        {userBusiness && (
                                            <button
                                                onClick={async () => {
                                                    const newVerified = !userBusiness.isVerified;
                                                    const confirmed = await showConfirm(
                                                        `¿${newVerified ? 'Verificar' : 'Quitar verificación'} a ${userBusiness.name}?`,
                                                        'Verificación de Negocio'
                                                    );
                                                    if (confirmed) {
                                                        try {
                                                            await updateBusiness(userBusiness.id, { isVerified: newVerified });
                                                            setBusinesses(prev => prev.map(b => b.id === userBusiness.id ? { ...b, isVerified: newVerified } : b));
                                                            showToast(`Estado de negocio de ${userBusiness.name} actualizado`, 'success');
                                                        } catch (error) {
                                                            console.error('Error verifying business:', error);
                                                            showToast('Error al verificar el negocio', 'error');
                                                        }
                                                    }
                                                }}
                                                className={`w-full py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${userBusiness.isVerified
                                                    ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                                    : 'bg-slate-800/50 border-orange-500/20 text-orange-400'
                                                    }`}
                                            >
                                                <CheckCircle className={`w-3.5 h-3.5 ${userBusiness.isVerified ? 'fill-current' : ''}`} />
                                                <span>{userBusiness.isVerified ? 'Negocio Verificado' : 'Verificar Negocio'}</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Admin Business Management (Red Theme) */}
                                    <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/60 px-2 italic">
                                            Gestión de Negocio / Puntos (Solo Admin)
                                        </p>
                                        
                                        {!userBusiness ? (
                                            <button
                                                onClick={async () => {
                                                    const businessName = await showPrompt(
                                                        `Nombre del negocio para ${u.name || 'este usuario'}:`,
                                                        'Crear Nuevo Negocio',
                                                        'Mi Negocio Pulse'
                                                    );
                                                    
                                                    if (businessName) {
                                                        const existing = businesses.find(b => b.name.toLowerCase().trim() === businessName.toLowerCase().trim());
                                                        const deleted = deletedBusinesses.find(b => b.name.toLowerCase().trim() === businessName.toLowerCase().trim());
                                                        const duplicate = existing || deleted;

                                                        if (duplicate) {
                                                            const merge = await showConfirm(`Ya existe un negocio con el nombre "${businessName}" en el sistema ${deleted ? '(está en la papelera)' : ''}.\n\n¿Deseas ASIGNAR el negocio existente a este usuario en lugar de crear uno nuevo?`, 'Negocio Duplicado');
                                                            if (merge) {
                                                                try {
                                                                    await updateBusiness(duplicate.id, { ownerId: u.id, isDeleted: false, isPublished: true });
                                                                    await updateUser(u.id, { businessId: duplicate.id });
                                                                    setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, businessId: duplicate.id } : user));
                                                                    
                                                                    if (deleted) {
                                                                        // Mover de deleted a active en el estado local
                                                                        setBusinesses(prev => [...prev, { ...duplicate, ownerId: u.id, isDeleted: false, isPublished: true }]);
                                                                        // No es necesario actualizar handleRestoreBusiness localmente si se hace vía update
                                                                    } else {
                                                                        setBusinesses(prev => prev.map(b => b.id === duplicate.id ? { ...b, ownerId: u.id, isDeleted: false, isPublished: true } : b));
                                                                    }
                                                                    
                                                                    showToast(`Negocio "${duplicate.name}" asignado correctamente.`, 'success');
                                                                    return;
                                                                } catch (error) {
                                                                    showToast('Error al reasignar negocio.', 'error');
                                                                    return;
                                                                }
                                                            }
                                                        }

                                                        const confirmed = await showConfirm(
                                                            `¿Confirmas la creación del negocio "${businessName}" para ${u.email}?`,
                                                            'Confirmar Creación'
                                                        );
                                                        
                                                        if (confirmed) {
                                                            try {
                                                                const newBusinessId = await createBusiness({
                                                                    name: businessName,
                                                                    ownerId: u.id,
                                                                    plan: u.plan || SubscriptionPlan.FREE,
                                                                    isVerified: true,
                                                                    description: 'Negocio gestionado por administración.',
                                                                    sector: 'Centro' as any,
                                                                    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
                                                                    category: 'Restaurante' as any,
                                                                    coordinates: [-0.747, -80.752]
                                                                });

                                                                await updateUser(u.id, { businessId: newBusinessId });
                                                                setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, businessId: newBusinessId } : user));
                                                                showToast(`Negocio "${businessName}" creado con éxito`, 'success');
                                                            } catch (error) {
                                                                console.error('Error creating admin business:', error);
                                                                showToast('Error al crear el negocio', 'error');
                                                            }
                                                        }
                                                    }
                                                }}
                                                className="w-full py-4 px-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                            >
                                                <Building2 className="w-4 h-4" />
                                                Crear Negocio para Usuario
                                            </button>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                <div className={`p-4 rounded-2xl border ${isDeleted ? 'bg-red-500/10 border-red-500/30' : 'bg-red-500/5 border-red-500/10'}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`text-[10px] font-bold uppercase ${isDeleted ? 'text-red-400' : 'text-red-500/70'}`}>
                                                            {isDeleted ? 'EN PAPELERA' : 'Negocio Actual'}
                                                        </span>
                                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">ID: {userBusiness.id.slice(0, 8)}...</span>
                                                    </div>
                                                    <p className={`text-sm font-black ${isDeleted ? 'text-red-400' : 'text-white'}`}>{userBusiness.name}</p>
                                                </div>
                                                
                                                {isDeleted ? (
                                                    <button
                                                        onClick={() => {
                                                            handleRestoreBusiness(userBusiness.id);
                                                            showToast(`Negocio "${userBusiness.name}" restaurado`, 'success');
                                                        }}
                                                        className="w-full py-4 px-4 rounded-2xl bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <ArrowUpRight className="w-4 h-4" />
                                                        Restaurar Negocio
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={async () => {
                                                            const confirmed = await showConfirm(
                                                                `¿Mover el negocio "${userBusiness.name}" a la Papelera de Reciclaje?`,
                                                                'Mover a Papelera'
                                                            );
                                                            
                                                            if (confirmed) {
                                                                try {
                                                                    await deleteBusiness(userBusiness.id, false); // false for soft delete
                                                                    showToast(`Negocio movido a la papelera`, 'success');
                                                                } catch (error) {
                                                                    console.error('Error soft-deleting business:', error);
                                                                    showToast('Error al mover a la papelera', 'error');
                                                                }
                                                            }
                                                        }}
                                                        className="w-full py-4 px-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Mover a Papelera
                                                    </button>
                                                )}

                                                <button
                                                    onClick={async () => {
                                                        const confirmed = await showConfirm(
                                                            `¿Confirmar ELIMINACIÓN PERMANENTE de "${userBusiness.name}"?\nEsta acción es irreversible y borrará el ID del usuario.`,
                                                            'BORRADO DEFINITIVO'
                                                        );
                                                        
                                                        if (confirmed) {
                                                            try {
                                                                await deleteBusiness(userBusiness.id, true); // true for permanent delete
                                                                await updateUser(u.id, { businessId: "" });
                                                                setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, businessId: "" } : user));
                                                                showToast(`Negocio eliminado de forma permanente`, 'error');
                                                            } catch (error) {
                                                                console.error('Error hard-deleting business:', error);
                                                                showToast('Error al eliminar definitivamente', 'error');
                                                            }
                                                        }
                                                    }}
                                                    className="w-full py-2 px-4 rounded-xl border border-red-900/40 text-red-900 text-[9px] font-black uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all"
                                                >
                                                    Eliminación Irreversible
                                                </button>

                                            </div>
                                        )}
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
