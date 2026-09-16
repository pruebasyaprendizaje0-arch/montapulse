import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, Calendar, CreditCard, ArrowUpDown, ChevronDown, 
    FileText, User, Tag, Sparkles, Check, X, ExternalLink, Image, Lock, ShieldCheck, Banknote, Loader2
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { SubscriptionPlan } from '../../../types';
import { db } from '../../../firebase.config';
import { collection, doc, getDoc, getDocs, updateDoc, setDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useToast } from '../../../context/ToastContext';

type AdminPaymentTab = 'plans' | 'menus';

export const PaymentsPanel: React.FC = () => {
    const { transactions, allUsers, businesses } = useData();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<AdminPaymentTab>('plans');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    // Menus Addon approvals
    const [menuSearch, setMenuSearch] = useState('');
    const [menuFilterStatus, setMenuFilterStatus] = useState('all');

    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Escucha en tiempo real de payment_requests
    useEffect(() => {
        const q = query(collection(db, 'payment_requests'), orderBy('fecha', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const rawDate = data.fecha?.toDate ? data.fecha.toDate() : (data.fecha ? new Date(data.fecha) : new Date());
                const isPaid = data.estado === 'confirmado';
                const isFailed = data.estado === 'rechazado';
                
                return {
                    id: docSnap.id,
                    ...data,
                    isPaymentRequest: true,
                    userId: data.userId,
                    planId: data.plan || SubscriptionPlan.EXPERT,
                    status: isPaid ? 'PAID' : isFailed ? 'FAILED' : 'PENDING',
                    timestamp: rawDate,
                    amount: data.montoEstimado || 29.99,
                    gateway: data.metodo === 'dlocal_go' ? 'dLocal Go' : 'Transferencia Bancaria',
                    methodName: data.metodo === 'dlocal_go' ? 'dLocal Go' : 'Transferencia'
                };
            });
            setPaymentRequests(reqs);
        }, (error) => {
            console.warn('Error escuchando payment_requests:', error);
        });

        return () => unsubscribe();
    }, []);

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

    // Aprobar solicitud y dar de alta usuario inmediatamente
    const handleApprovePayment = async (tx: any) => {
        const targetUserId = tx.userId;
        const targetPlan = tx.planId || tx.plan || SubscriptionPlan.EXPERT;
        const userName = userMap[targetUserId]?.name || tx.userName || 'Cliente';

        if (!targetUserId) {
            showToast('No se encontró el ID del usuario para dar de alta.', 'error');
            return;
        }

        setApprovingId(tx.id);
        try {
            // 1. Si es una solicitud de payment_requests, actualizar estado a "confirmado"
            if (tx.isPaymentRequest || tx.metodo) {
                const reqRef = doc(db, 'payment_requests', tx.id);
                await updateDoc(reqRef, {
                    estado: 'confirmado',
                    fechaConfirmacion: new Date()
                });
            }

            // 2. Buscar documento del usuario en /users_v2/{userId} y actualizar plan y rol
            const userRef = doc(db, 'users_v2', targetUserId);
            await updateDoc(userRef, {
                plan: targetPlan,
                role: 'host',
                updatedAt: new Date()
            });

            showToast(`¡Plan ${targetPlan} activado! ${userName} fue dado de alta con éxito.`, 'success');
        } catch (error: any) {
            console.error('Error al dar de alta:', error);
            showToast('Error al activar el plan: ' + (error?.message || 'Error desconocido'), 'error');
        } finally {
            setApprovingId(null);
        }
    };

    const handleApproveMenu = async (bizId: string) => {
        try {
            const now = new Date();
            const expires = new Date();
            expires.setDate(now.getDate() + 30);

            const bizRef = doc(db, 'businesses', bizId);
            await updateDoc(bizRef, {
                menu_premium_active: true,
                'menu_subscription.status': 'active',
                'menu_subscription.activatedAt': now,
                'menu_subscription.expiresAt': expires,
                'menu_subscription.updatedAt': now
            });

            showToast('Menú Digital QR aprobado y activado con éxito.', 'success');
        } catch (err) {
            console.error('Error approving menu:', err);
            showToast('Error al aprobar el menú.', 'error');
        }
    };

    const handleRejectMenu = async (bizId: string) => {
        const confirmReject = window.confirm('¿Seguro que deseas desactivar/rechazar este menú digital?');
        if (!confirmReject) return;

        try {
            const bizRef = doc(db, 'businesses', bizId);
            await updateDoc(bizRef, {
                menu_premium_active: false,
                'menu_subscription.status': 'inactive',
                'menu_subscription.updatedAt': new Date()
            });
            showToast('Menú Digital QR rechazado/desactivado.', 'success');
        } catch (err) {
            console.error('Error rejecting menu:', err);
            showToast('Error al rechazar el menú.', 'error');
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

    // Unificación de payment_requests y transacciones del gateway
    const allPaymentItems = useMemo(() => {
        const reqIds = new Set(paymentRequests.map(r => r.id));
        const normalizedTx = transactions.filter(t => !reqIds.has(t.id)).map(t => ({
            ...t,
            isPaymentRequest: false,
            amount: t.rawBody?.amount || (t.planId === SubscriptionPlan.PRO ? 5 : t.planId === SubscriptionPlan.ELITE ? 10 : t.planId === SubscriptionPlan.EXPERT ? 25 : 5),
            gateway: (t as any).gateway || 'dLocal Go'
        }));

        return [...paymentRequests, ...normalizedTx].sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
        });
    }, [paymentRequests, transactions]);

    // Filtered Transactions
    const filteredTransactions = useMemo(() => {
        return allPaymentItems.filter(tx => {
            const user = userMap[tx.userId];
            const userName = user?.name || tx.userName || '';
            const userEmail = user?.email || tx.userEmail || '';
            const searchStr = searchQuery.toLowerCase();

            const matchesSearch = !searchQuery || 
                userName.toLowerCase().includes(searchStr) || 
                userEmail.toLowerCase().includes(searchStr) ||
                tx.id.toLowerCase().includes(searchStr);

            const matchesPlan = filterPlan === 'all' || tx.planId === filterPlan || (tx.plan && tx.plan.toLowerCase() === filterPlan.toLowerCase());
            const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;

            return matchesSearch && matchesPlan && matchesStatus;
        });
    }, [allPaymentItems, searchQuery, filterPlan, filterStatus, userMap]);

    // Statistics for Plans
    const paymentStats = useMemo(() => {
        const totalCount = filteredTransactions.length;
        const paidCount = filteredTransactions.filter(t => t.status === 'PAID').length;
        
        const revenue = filteredTransactions.reduce((acc, t) => {
            if (t.status !== 'PAID') return acc;
            if (t.amount && !isNaN(parseFloat(String(t.amount)))) {
                return acc + parseFloat(String(t.amount));
            }
            if (t.planId === SubscriptionPlan.PRO) return acc + 5;
            if (t.planId === SubscriptionPlan.ELITE) return acc + 10;
            if (t.planId === SubscriptionPlan.EXPERT) return acc + 25;
            return acc;
        }, 0);

        return { totalCount, paidCount, revenue };
    }, [filteredTransactions]);


    // Filtered Menus (maps over all businesses so they all show up)
    const filteredMenus = useMemo(() => {
        const allMenus = businesses.map(biz => {
            const sub = (biz as any).menu_subscription || {};
            const isActive = (biz as any).menu_premium_active || false;
            return {
                id: biz.id,
                businessId: biz.id,
                name: biz.name,
                category: biz.category,
                sector: biz.sector,
                status: isActive ? 'active' : (sub.status || 'inactive'),
                paymentMethod: sub.payment_method || null,
                paymentReceiptUrl: sub.manual_payment_receipt_url || null,
                expiresAt: sub.expiresAt || null
            };
        });

        return allMenus.filter(m => {
            const searchStr = menuSearch.toLowerCase();
            const matchesSearch = !menuSearch || m.name.toLowerCase().includes(searchStr);
            const matchesStatus = menuFilterStatus === 'all' || m.status === menuFilterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [businesses, menuSearch, menuFilterStatus]);

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
                    onClick={() => setActiveTab('menus')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'menus' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                >
                    Aprobación Menús ($5 Add-on)
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
                                                No se encontraron transacciones ni solicitudes de pago registradas.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map(tx => {
                                            const user = userMap[tx.userId];
                                            const amount = tx.amount !== undefined ? tx.amount : (tx.rawBody?.amount || (tx.planId === SubscriptionPlan.PRO ? 10 : tx.planId === SubscriptionPlan.ELITE ? 25 : tx.planId === SubscriptionPlan.EXPERT ? 50 : 29.99));
                                            const isPending = tx.status === 'PENDING' || tx.estado === 'pendiente';
                                            const isApproving = approvingId === tx.id;
                                            
                                            return (
                                                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors text-xs text-slate-300">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 p-0.5 shadow-lg shrink-0">
                                                                <div className="w-full h-full rounded-full bg-black overflow-hidden border border-black flex items-center justify-center">
                                                                    {user?.avatarUrl ? (
                                                                        <img src={user.avatarUrl} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-white truncate">{user?.name || tx.userName || 'Usuario Desconocido'}</p>
                                                                <p className="text-[10px] text-slate-500 truncate">{user?.email || tx.userEmail || 'Desconocido'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-bold uppercase tracking-wider text-[10px]">
                                                        <span className={`px-2 py-1 rounded-lg ${tx.planId === SubscriptionPlan.ELITE ? 'bg-amber-500/10 text-amber-500' : tx.planId === SubscriptionPlan.PRO ? 'bg-sky-500/10 text-sky-500' : 'bg-orange-500/10 text-orange-400'}`}>
                                                            {tx.planId || tx.plan}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-[10px] text-slate-400 whitespace-nowrap">
                                                        {formatTxDate(tx.timestamp)}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wider ${tx.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : tx.status === 'FAILED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>
                                                            {tx.status === 'PAID' ? 'Confirmado' : tx.status === 'FAILED' ? 'Fallido' : 'Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <p className="font-black text-white">${parseFloat(String(amount)).toFixed(2)}</p>
                                                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">{tx.gateway || (tx.metodo === 'dlocal_go' ? 'dLocal Go' : 'Transferencia')}</p>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {isPending && (
                                                                <button
                                                                    onClick={() => handleApprovePayment(tx)}
                                                                    disabled={isApproving}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                                                                    title="Dar de alta y activar plan inmediatamente"
                                                                >
                                                                    {isApproving ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                                    )}
                                                                    <span>Dar de Alta</span>
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => setSelectedTx(tx)}
                                                                className="p-1.5 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white tracking-widest transition-all"
                                                            >
                                                                Ver
                                                            </button>
                                                        </div>
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
                    {/* Menus filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 flex items-center gap-3 bg-neutral-900/50 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-xl">
                            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Buscar por negocio..." 
                                className="bg-transparent border-none text-white text-xs sm:text-sm w-full focus:outline-none"
                                value={menuSearch}
                                onChange={e => setMenuSearch(e.target.value)}
                            />
                        </div>
                        <select 
                            value={menuFilterStatus}
                            onChange={e => setMenuFilterStatus(e.target.value)}
                            className="bg-neutral-900/50 border border-white/5 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl outline-none focus:border-orange-500/50 cursor-pointer"
                        >
                            <option value="all">Todos los Estados</option>
                            <option value="pending_approval">Pendientes de Aprobación</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>
                    </div>

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
                                    {filteredMenus.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-xs text-slate-500 font-medium">
                                                No se encontraron suscripciones de menú digital.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMenus.map(m => {
                                            return (
                                                <tr key={m.id} className="hover:bg-white/[0.02] transition-colors text-xs text-slate-300">
                                                    <td className="p-4 text-left">
                                                        <p className="font-bold text-white">{m.name || 'Negocio Desconocido'}</p>
                                                        <p className="text-[10px] text-slate-500">{m.category} · {m.sector}</p>
                                                    </td>
                                                    <td className="p-4 capitalize">
                                                        {m.paymentMethod === 'manual' ? (
                                                            <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                                                                <Banknote className="w-3.5 h-3.5" /> Manual
                                                            </span>
                                                        ) : m.paymentMethod === 'dlocal' ? (
                                                            <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                                                                <CreditCard className="w-3.5 h-3.5" /> Automático
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500 text-[10px]">Ninguno (Manual)</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${m.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : m.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20 animate-pulse' : 'bg-red-500/20 text-red-400'}`}>
                                                            {m.status === 'pending_approval' ? 'Pte. Aprobación' : m.status === 'active' ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {m.paymentReceiptUrl ? (
                                                            <button 
                                                                onClick={() => setPreviewImage(m.paymentReceiptUrl)}
                                                                className="p-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 mx-auto"
                                                            >
                                                                <Image className="w-3 h-3" /> Ver Recibo
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-600 text-[10px]">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {m.status === 'pending_approval' ? (
                                                            <div className="flex gap-2 justify-center">
                                                                <button 
                                                                    onClick={() => handleApproveMenu(m.businessId)}
                                                                    className="p-1 px-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                                                                    title="Aprobar Pago"
                                                                >
                                                                    <Check className="w-3 h-3" /> Aprobar
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRejectMenu(m.businessId)}
                                                                    className="p-1 px-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                                                                    title="Rechazar Pago"
                                                                >
                                                                    <X className="w-3 h-3" /> Rechazar
                                                                </button>
                                                            </div>
                                                        ) : m.status === 'active' ? (
                                                            <button 
                                                                onClick={() => handleRejectMenu(m.businessId)}
                                                                className="p-1 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 mx-auto"
                                                                title="Desactivar Menú"
                                                            >
                                                                <X className="w-3 h-3" /> Desactivar
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleApproveMenu(m.businessId)}
                                                                className="p-1 px-3 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-[9px] font-black uppercase flex items-center gap-1 mx-auto"
                                                                title="Activar Menú"
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
