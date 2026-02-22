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
    CheckCircle
} from 'lucide-react';
import { UserProfile, SubscriptionPlan } from '../types';
import { updateUser, togglePulsePass, updateBusiness, incrementBusinessViewCount } from '../services/firestoreService';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

export const AdminUsers: React.FC = () => {
    const { allUsers, setAllUsers, businesses, setBusinesses } = useData();
    const navigate = useNavigate();
    const { showToast, showConfirm } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');

    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => {
            const matchesSearch =
                (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.surname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());

            const matchesRole = roleFilter === 'all' || u.role === roleFilter;
            const matchesPlan = planFilter === 'all' || u.plan === planFilter;

            return matchesSearch && matchesRole && matchesPlan;
        });
    }, [allUsers, searchQuery, roleFilter, planFilter]);

    const stats = useMemo(() => ({
        total: allUsers.length,
        hosts: allUsers.filter(u => u.role === 'host').length,
        premium: allUsers.filter(u => u.plan === SubscriptionPlan.PREMIUM).length
    }), [allUsers]);

    return (
        <div className="min-h-screen bg-slate-950 font-['Outfit'] pb-32">
            {/* Header section with glassmorphism */}
            <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 pt-12 pb-6 px-6">
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
                                <Users className="w-5 h-5 text-indigo-400" />
                                Gestión de Usuarios
                            </h1>
                        </div>
                        <div className="w-11"></div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {[
                            { label: 'Total', value: stats.total, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                            { label: 'Hosts', value: stats.hosts, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                            { label: 'Premium', value: stats.premium, color: 'text-amber-400', bg: 'bg-amber-500/10' }
                        ].map((stat, i) => (
                            <div key={i} className={`${stat.bg} p-4 rounded-2xl border border-white/5`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{stat.label}</p>
                                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
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
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none"
                            >
                                <option value="all" className="bg-slate-900">Todos los Roles</option>
                                <option value="visitor" className="bg-slate-900">Visitantes</option>
                                <option value="host" className="bg-slate-900">Hosts</option>
                                <option value="admin" className="bg-slate-900">Admins</option>
                            </select>

                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none"
                            >
                                <option value="all" className="bg-slate-900">Todos los Planes</option>
                                <option value={SubscriptionPlan.BASIC} className="bg-slate-900">Básico</option>
                                <option value={SubscriptionPlan.PREMIUM} className="bg-slate-900">Premium</option>
                            </select>
                        </div>
                    </div>
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
                        const userBusiness = u.businessId ? businesses.find(b => b.id === u.businessId) : null;

                        return (
                            <div key={u.id} className="group bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2rem] overflow-hidden hover:border-white/10 transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 overflow-hidden ring-2 ring-white/10 group-hover:ring-indigo-500/30 transition-all">
                                                    <img
                                                        src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name || 'User'}+${u.surname || 'Name'}&background=6366f1&color=fff&bold=true`}
                                                        className="w-full h-full object-cover"
                                                        alt={u.name || 'User'}
                                                    />
                                                </div>
                                                {u.plan === SubscriptionPlan.PREMIUM && (
                                                    <div className="absolute -top-2 -right-2 bg-amber-500 p-1.5 rounded-lg shadow-lg shadow-amber-500/20 border border-amber-400">
                                                        <Crown className="w-3 h-3 text-black" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-white font-black text-xl tracking-tight">{u.name || 'Usuario'} {u.surname || ''}</p>
                                                    {u.role === 'admin' && (
                                                        <div className="bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                                                    <Mail className="w-3 h-3" />
                                                    {u.email}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ${u.plan === SubscriptionPlan.PREMIUM
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
                                                <ShieldCheck className="w-3 h-3 text-indigo-400" /> Rol Actual
                                            </p>
                                            <p className="text-sm font-bold text-white capitalize">{u.role}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <Building2 className="w-3 h-3 text-sky-400" /> Negocio
                                            </p>
                                            <p className="text-sm font-bold text-white truncate">
                                                {userBusiness?.name || 'Ninguno'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={async () => {
                                                    const nextRole = u.role === 'host' ? 'visitor' : 'host';
                                                    const confirmed = await showConfirm(
                                                        `¿Cambiar rol de ${u.name || 'este usuario'} a ${nextRole === 'host' ? 'Host (Anfitrión)' : 'Visitante'}?`,
                                                        'Cambiar Rol'
                                                    );
                                                    if (confirmed) {
                                                        try {
                                                            await updateUser(u.id, { role: nextRole as any });
                                                            setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, role: nextRole } : user));
                                                            showToast(`Rol de ${u.name || 'Usuario'} actualizado a ${nextRole}`, 'success');
                                                        } catch (error) {
                                                            console.error('Error updating role:', error);
                                                            showToast('Error al actualizar el rol', 'error');
                                                        }
                                                    }
                                                }}
                                                className="group/btn relative py-4 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all overflow-hidden"
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover/btn:bg-indigo-500/20 transition-colors">
                                                        <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                                                    </div>
                                                    <span className="text-xs font-black uppercase tracking-widest text-white">
                                                        {u.role === 'host' ? 'Quitar Host' : 'Hacer Host'}
                                                    </span>
                                                </div>
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const newPlan = u.plan === SubscriptionPlan.PREMIUM ? SubscriptionPlan.BASIC : SubscriptionPlan.PREMIUM;
                                                    const confirmed = await showConfirm(
                                                        `¿Cambiar plan de ${u.name || 'este usuario'} a ${newPlan.toUpperCase()}?`,
                                                        'Actualizar Plan'
                                                    );
                                                    if (confirmed) {
                                                        try {
                                                            await updateUser(u.id, { plan: newPlan });
                                                            setAllUsers(prev => prev.map(user => user.id === u.id ? { ...user, plan: newPlan } : user));
                                                            showToast(`Plan de ${u.name || 'Usuario'} actualizado a ${newPlan}`, 'success');
                                                        } catch (error) {
                                                            console.error('Error updating plan:', error);
                                                            showToast('Error al actualizar el plan', 'error');
                                                        }
                                                    }
                                                }}
                                                className={`py-4 px-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border ${u.plan === SubscriptionPlan.PREMIUM
                                                    ? 'bg-slate-800/50 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                                                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 border-amber-400 text-black shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95'
                                                    }`}
                                            >
                                                {u.plan === SubscriptionPlan.PREMIUM ? 'Bajar Nivel' : 'Activar Premium'}
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
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
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
                                                    className="py-3 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
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
                                                    className="py-3 px-4 rounded-2xl bg-slate-800 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:border-rose-500 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
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
                                                    ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                                                    : 'bg-slate-800/50 border-orange-500/20 text-orange-400'
                                                    }`}
                                            >
                                                <CheckCircle className={`w-3.5 h-3.5 ${userBusiness.isVerified ? 'fill-current' : ''}`} />
                                                <span>{userBusiness.isVerified ? 'Negocio Verificado' : 'Verificar Negocio'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
