import React, { useState, useMemo } from 'react';
import { 
    Search, Calendar, CreditCard, ArrowUpDown, ChevronDown, 
    FileText, User, Tag, Sparkles
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { SubscriptionPlan } from '../../../types';

export const PaymentsPanel: React.FC = () => {
    const { transactions, allUsers } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedTx, setSelectedTx] = useState<any | null>(null);

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

    // Statistics
    const paymentStats = useMemo(() => {
        const totalCount = filteredTransactions.length;
        const paidCount = filteredTransactions.filter(t => t.status === 'PAID').length;
        
        // Approximate revenue calculation
        const revenue = filteredTransactions.reduce((acc, t) => {
            if (t.status !== 'PAID') return acc;
            if (t.planId === SubscriptionPlan.PRO) return acc + 10;
            if (t.planId === SubscriptionPlan.ELITE) return acc + 25;
            if (t.planId === SubscriptionPlan.EXPERT) return acc + 50;
            // Parse from rawBody if available
            const amount = t.rawBody?.amount || t.rawBody?.amount_paid;
            if (amount && !isNaN(parseFloat(amount))) return acc + parseFloat(amount);
            return acc;
        }, 0);

        return {
            totalCount,
            paidCount,
            revenue
        };
    }, [filteredTransactions]);

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        </div>
    );
};
