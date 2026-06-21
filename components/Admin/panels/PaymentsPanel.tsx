import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, Calendar, CreditCard, ArrowUpDown, ChevronDown, 
    FileText, User, Tag, Sparkles, Check, X, ExternalLink, Image, Lock, ShieldCheck, Banknote
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { SubscriptionPlan } from '../../../types';
import { db } from '../../../firebase.config';
import { collection, doc, getDoc, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { useToast } from '../../../context/ToastContext';

type AdminPaymentTab = 'plans' | 'bookings';

export const PaymentsPanel: React.FC = () => {
    const { transactions, allUsers, businesses } = useData();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<AdminPaymentTab>('plans');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedTx, setSelectedTx] = useState<any | null>(null);

    // Bookings Addon approvals
    const [addons, setAddons] = useState<any[]>([]);
    const [loadingAddons, setLoadingAddons] = useState(false);
    const [addonSearch, setAddonSearch] = useState('');
    const [addonFilterStatus, setAddonFilterStatus] = useState('all');
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Map user info for easy lookup
    const userMap = useMemo(() => {
        const map: Record<string, { name: string; email: string; avatarUrl?: string }> = {};
        allUsers.forEach(u => {
            map[u.id] = {
                name: `${u.name || ''} ${u.surname || ''}`.trim() || 'Usuario Desconocido',
                email: u.email || '',
                avatarUrl: u.avatarUrl
            };
        });
        return map;
    }, [allUsers]);

    // Map business info for easy lookup
    const businessMap = useMemo(() => {
        const map: Record<string, { name: string; category: string; sector: string }> = {};
        businesses.forEach(b => {
            map[b.id] = {
                name: b.name,
                category: b.category,
                sector: b.sector
            };
        });
        return map;
    }, [businesses]);

    useEffect(() => {
        if (activeTab === 'bookings') {
            loadAddons();
        }
    }, [activeTab]);

    const loadAddons = async () => {
        try {
            setLoadingAddons(true);
            const snap = await getDocs(collection(db, 'booking_addons'));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAddons(list);
        } catch (err) {
            console.error('Error fetching addons:', err);
            showToast('Error al cargar suscripciones de reservas.', 'error');
        } finally {
            setLoadingAddons(false);
        }
    };

    const handleApproveAddon = async (bizId: string) => {
        try {
            const now = new Date();
            const expires = new Date();
            expires.setDate(now.getDate() + 30);

            // Update subscription to active using setDoc with merge to support non-existent docs
            const addonRef = doc(db, 'booking_addons', bizId);
            await setDoc(addonRef, {
                businessId: bizId,
                status: 'active',
                activatedAt: now,
                expiresAt: expires,
                updatedAt: now
            }, { merge: true });

            // Auto initialize config
            const configRef = doc(db, 'booking_configs', bizId);
            const configSnap = await getDoc(configRef);
            if (!configSnap.exists()) {
                await setDoc(configRef, {
                    businessId: bizId,
                    bookingType: 'rooms',
                    isEnabled: true,
                    updatedAt: now
                });
            } else {
                await setDoc(configRef, {
                    isEnabled: true,
                    updatedAt: now
                }, { merge: true });
            }

            showToast('Add-on de reservas aprobado y activado con éxito.', 'success');
            loadAddons();
        } catch (err) {
            console.error('Error approving addon:', err);
            showToast('Error al aprobar el add-on.', 'error');
        }
    };

    const handleRejectAddon = async (bizId: string) => {
        const confirmReject = window.confirm('¿Seguro que deseas rechazar este pago de reservas?');
        if (!confirmReject) return;

        try {
            const addonRef = doc(db, 'booking_addons', bizId);
            await setDoc(addonRef, {
                status: 'inactive',
                updatedAt: new Date()
            }, { merge: true });
            showToast('Add-on de reservas rechazado.', 'success');
            loadAddons();
        } catch (err) {
            console.error('Error rejecting addon:', err);
            showToast('Error al rechazar el add-on.', 'error');
        }
    };

    // Format Date nicely
    const formatTxDate = (date: any) => {
        if (!date) return 'Sin fecha';
        const d = new Date(date);
        return isNaN(d.getTime()) ? 'Fecha inválida' : d.toLocaleString('es-EC', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    // Filtered Transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const user = userMap[tx.userId];
            const userName = user?.name || '';
            const userEmail = user?.email || '';
            const searchStr = searchQuery.toLowerCase();

            const matchesSearch = !searchQuery || 
                userName.toLowerCase().includes(searchStr) || 
                userEmail.toLowerCase().includes(searchStr) ||
                tx.id.toLowerCase().includes(searchStr);

            const matchesPlan = filterPlan === 'all' || tx.planId === filterPlan;
            const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;

            return matchesSearch && matchesPlan && matchesStatus;
        });
    }, [transactions, searchQuery, filterPlan, filterStatus, userMap]);

    // Filtered Addons (maps over all businesses so they all show up)
    const filteredAddons = useMemo(() => {
        const allAddons = businesses.map(biz => {
            const ad = addons.find(a => a.businessId === biz.id);
            return {
                id: biz.id,
                businessId: biz.id,
                name: biz.name,
                category: biz.category,
                sector: biz.sector,
                status: ad ? ad.status : 'inactive',
                paymentMethod: ad ? ad.paymentMethod : null,
                paymentReceiptUrl: ad ? ad.paymentReceiptUrl : null,
                expiresAt: ad ? ad.expiresAt : null
            };
        });

        return allAddons.filter(ad => {
            const searchStr = addonSearch.toLowerCase();
            const matchesSearch = !addonSearch || ad.name.toLowerCase().includes(searchStr);
            const matchesStatus = addonFilterStatus === 'all' || ad.status === addonFilterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [businesses, addons, addonSearch, addonFilterStatus]);

    // Statistics for Plans
    const paymentStats = useMemo(() => {
        const totalCount = filteredTransactions.length;
        const paidCount = filteredTransactions.filter(t => t.status === 'PAID').length;
        
        const revenue = filteredTransactions.reduce((acc, t) => {
            if (t.status !== 'PAID') return acc;
            if (t.planId === SubscriptionPlan.PRO) return acc + 10;
            if (t.planId === SubscriptionPlan.ELITE) return acc + 25;
            if (t.planId === SubscriptionPlan.EXPERT) return acc + 50;
            const amount = t.rawBody?.amount || t.rawBody?.amount_paid;
            if (amount && !isNaN(parseFloat(amount))) return acc + parseFloat(amount);
            return acc;
        }, 0);

        return { totalCount, paidCount, revenue };
    }, [filteredTransactions]);

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
            
            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-3">
                <button 
                    onClick={() => setActiveTab('plans')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'plans' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                >
                    Suscripciones a Planes
                </button>
                <button 
                    onClick={() => setActiveTab('bookings')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'bookings' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                >
                    Aprobación Reservas ($5 Add-on)
                </button>
            </div>

            {activeTab === 'plans' ? (
                <>
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 px-1">
                        <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                            <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pagos Totales</p>
                            <p className="text-sm sm:text-xl font-black text-white">{paymentStats.totalCount}</p>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                            <p className="text-[8px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Confirmados</p>
                            <p className="text-sm sm:text-xl font-black text-emerald-400">{paymentStats.paidCount}</p>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                            <p className="text-[8px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Recaudación Est.</p>
                            <p className="text-sm sm:text-xl font-black text-amber-400">${paymentStats.revenue.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Filter Row */}
                    <div className="flex flex-col gap-3 items-stretch">
                        <div className="flex items-center gap-3 bg-neutral-900/50 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-xl">
                            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Buscar por usuario o ID de pago..." 
                                className="bg-transparent border-none text-white text-xs sm:text-sm w-full focus:outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <select 
                                value={filterPlan}
                                onChange={e => setFilterPlan(e.target.value)}
                                className="flex-1 bg-neutral-900/50 border border-white/5 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none focus:border-orange-500/50 cursor-pointer"
                            >
                                <option value="all">Todos los Planes</option>
                                <option value={SubscriptionPlan.PRO}>Plan Pro</option>
                                <option value={SubscriptionPlan.ELITE}>Plan Elite</option>
                                <option value={SubscriptionPlan.EXPERT}>Plan Expert</option>
                            </select>
                            <select 
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="flex-1 bg-neutral-900/50 border border-white/5 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none focus:border-orange-500/50 cursor-pointer"
                            >
                                <option value="all">Todos los Estados</option>
                                <option value="PAID">Pagado (PAID)</option>
                                <option value="PENDING">Pendiente</option>
                                <option value="FAILED">Fallido</option>
                            </select>
                        </div>
                    </div>

                    {/* Payments List */}
                    <div className="bg-neutral-900/40 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-black/40 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        <th className="p-4">Usuario</th>
                                        <th className="p-4">Plan</th>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4 text-center">Estado</th>
                                        <th className="p-4 text-right">Monto Estimado</th>
                                        <th className="p-4 text-center">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-xs text-slate-500 font-medium">
                                                No se encontraron transacciones registradas.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map(tx => {
                                            const user = userMap[tx.userId];
                                            const amount = tx.rawBody?.amount || (tx.planId === SubscriptionPlan.PRO ? 10 : tx.planId === SubscriptionPlan.ELITE ? 25 : tx.planId === SubscriptionPlan.EXPERT ? 50 : 0);
                                            
                                            return (
                                                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors text-xs text-slate-300">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 p-0.5 shadow-lg shrink-0">
                                                                <div className="w-full h-full rounded-full bg-black overflow-hidden border border-black flex items-center justify-center">
                                                                    {user?.avatarUrl ? (
                                                                        <img src={user.avatarUrl} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-white truncate">{user?.name || 'Usuario Desconocido'}</p>
                                                                <p className="text-[10px] text-slate-500 truncate">{user?.email || 'Desconocido'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-bold uppercase tracking-wider text-[10px]">
                                                        <span className={`px-2 py-1 rounded-lg ${tx.planId === SubscriptionPlan.ELITE ? 'bg-amber-500/10 text-amber-500' : tx.planId === SubscriptionPlan.PRO ? 'bg-sky-500/10 text-sky-500' : 'bg-purple-500/10 text-purple-400'}`}>
                                                            {tx.planId}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-[10px] text-slate-400 whitespace-nowrap">
                                                        {formatTxDate(tx.timestamp)}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${tx.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20' : tx.status === 'FAILED' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-black text-white">
                                                        ${parseFloat(String(amount)).toFixed(2)}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button 
                                                            onClick={() => setSelectedTx(tx)}
                                                            className="p-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black uppercase text-white tracking-widest transition-all"
                                                        >
                                                            Ver
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
                </>
            ) : (
                <div className="space-y-4">
                    {/* Addons filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 flex items-center gap-3 bg-neutral-900/50 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-xl">
                            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Buscar por negocio..." 
                                className="bg-transparent border-none text-white text-xs sm:text-sm w-full focus:outline-none"
                                value={addonSearch}
                                onChange={e => setAddonSearch(e.target.value)}
                            />
                        </div>
                        <select 
                            value={addonFilterStatus}
                            onChange={e => setAddonFilterStatus(e.target.value)}
                            className="bg-neutral-900/50 border border-white/5 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl outline-none focus:border-orange-500/50 cursor-pointer"
                        >
                            <option value="all">Todos los Estados</option>
                            <option value="pending_approval">Pendientes de Aprobación</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>
                    </div>

                    {loadingAddons ? (
                        <div className="py-12 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="bg-neutral-900/40 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-black/40 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            <th className="p-4">Negocio</th>
                                            <th className="p-4">Método</th>
                                            <th className="p-4">Estado</th>
                                            <th className="p-4 text-center">Comprobante</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredAddons.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-xs text-slate-500 font-medium">
                                                    No se encontraron suscripciones Add-on.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAddons.map(ad => {
                                                return (
                                                    <tr key={ad.id} className="hover:bg-white/[0.02] transition-colors text-xs text-slate-300">
                                                        <td className="p-4 text-left">
                                                            <p className="font-bold text-white">{ad.name || 'Negocio Desconocido'}</p>
                                                            <p className="text-[10px] text-slate-500">{ad.category} · {ad.sector}</p>
                                                        </td>
                                                        <td className="p-4 capitalize">
                                                            {ad.paymentMethod === 'manual' ? (
                                                                <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                                                                    <Banknote className="w-3.5 h-3.5" /> Manual
                                                                </span>
                                                            ) : ad.paymentMethod === 'dlocal' ? (
                                                                <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                                                                    <CreditCard className="w-3.5 h-3.5" /> Automático
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-500 text-[10px]">Ninguno (Manual)</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${ad.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : ad.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20 animate-pulse' : 'bg-red-500/20 text-red-400'}`}>
                                                                {ad.status === 'pending_approval' ? 'Pte. Aprobación' : ad.status === 'active' ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {ad.paymentReceiptUrl ? (
                                                                <button 
                                                                    onClick={() => setPreviewImage(ad.paymentReceiptUrl)}
                                                                    className="p-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 mx-auto"
                                                                >
                                                                    <Image className="w-3 h-3" /> Ver Recibo
                                                                </button>
                                                            ) : (
                                                                <span className="text-slate-600 text-[10px]">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {ad.status === 'pending_approval' ? (
                                                                <div className="flex gap-2 justify-center">
                                                                    <button 
                                                                        onClick={() => handleApproveAddon(ad.businessId)}
                                                                        className="p-1 px-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                                                                        title="Aprobar Pago"
                                                                    >
                                                                        <Check className="w-3 h-3" /> Aprobar
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleRejectAddon(ad.businessId)}
                                                                        className="p-1 px-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                                                                        title="Rechazar Pago"
                                                                    >
                                                                        <X className="w-3 h-3" /> Rechazar
                                                                    </button>
                                                                </div>
                                                            ) : ad.status === 'active' ? (
                                                                <button 
                                                                    onClick={() => handleRejectAddon(ad.businessId)}
                                                                    className="p-1 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 mx-auto"
                                                                    title="Desactivar Reservas"
                                                                >
                                                                    <X className="w-3 h-3" /> Desactivar
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => handleApproveAddon(ad.businessId)}
                                                                    className="p-1 px-3 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-[9px] font-black uppercase flex items-center gap-1 mx-auto"
                                                                    title="Activar Reservas"
                                                                >
                                                                    <Check className="w-3 h-3" /> Activar Manual
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Transaction Details Modal */}
            {selectedTx && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-neutral-950 border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <h4 className="text-base font-black text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-orange-500" />
                            Detalle de Transacción
                        </h4>

                        <div className="space-y-3 text-xs text-slate-300">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">ID de Pago:</span>
                                <span className="font-mono text-white select-all">{selectedTx.id}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">Usuario:</span>
                                <span className="font-bold text-white">{userMap[selectedTx.userId]?.name || 'Desconocido'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">Email:</span>
                                <span className="text-white">{userMap[selectedTx.userId]?.email || 'Desconocido'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">Plan Adquirido:</span>
                                <span className="font-bold text-white uppercase">{selectedTx.planId}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">Fecha de Pago:</span>
                                <span className="text-white">{formatTxDate(selectedTx.timestamp)}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">Gateway:</span>
                                <span className="text-white font-bold">{selectedTx.gateway}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">Estado de Transacción:</span>
                                <span className="font-black text-emerald-400">{selectedTx.status}</span>
                            </div>

                            {selectedTx.rawBody && (
                                <div className="mt-4">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Respuesta de Pasarela (Raw Data)</p>
                                    <pre className="bg-black/50 border border-white/5 rounded-xl p-3 max-h-48 overflow-y-auto text-[10px] font-mono text-slate-400 select-all">
                                        {JSON.stringify(selectedTx.rawBody, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={() => setSelectedTx(null)}
                                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Payment Receipt Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[3100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-neutral-950 border border-white/10 rounded-[2.5rem] p-6 max-w-2xl w-full shadow-2xl relative flex flex-col max-h-[90vh]">
                        <h4 className="text-sm font-black text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                            <Image className="w-5 h-5 text-indigo-400" />
                            Comprobante de Transferencia
                        </h4>
                        
                        <div className="flex-1 overflow-hidden rounded-2xl bg-black border border-white/5 flex items-center justify-center p-2">
                            <img src={previewImage} className="max-w-full max-h-[60vh] object-contain rounded-xl" alt="Receipt Preview" />
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={() => setPreviewImage(null)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                            >
                                Cerrar Vista
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
