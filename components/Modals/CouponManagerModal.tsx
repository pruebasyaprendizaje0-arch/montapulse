import React, { useState, useEffect } from 'react';
import { X, Ticket, Plus, Trash2, Edit3, ToggleLeft, ToggleRight, Loader2, Zap, Clock, MapPin, DollarSign, Users, CheckCircle, AlertTriangle, QrCode, BarChart2, Search, RefreshCw } from 'lucide-react';
import { Coupon, CouponType, Business, CouponRedemption } from '../../types';
import { 
    subscribeToBusinessCoupons, createCoupon, updateCoupon, deleteCoupon, 
    generateCouponCode, subscribeToCouponRedemptions, confirmRedemption,
    cleanupExpiredRedemptions 
} from '../../services/couponService';
import { createNotification } from '../../services/firestoreService';
import { CouponCard } from '../Coupons/CouponCard';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { useAuthContext } from '../../context/AuthContext';
import { ensureDate } from '../../services/dateUtils';

// Temporary placeholder for QRScanner during stabilization
const PlaceholderScanner = ({ onScanSuccess }: { onScanSuccess: (code: string) => void }) => (
    <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl text-center">
        <QrCode className="w-12 h-12 text-slate-700 mx-auto mb-2" />
        <p className="text-[10px] font-black text-slate-500 uppercase">Scanner habilitado (Usa el botón manual para pruebas)</p>
    </div>
);

interface CouponManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    business: Business;
}

type ModalView = 'list' | 'form' | 'validate' | 'history' | 'analytics';

const EMPTY_FORM = {
    code: '',
    description: '',
    type: 'percentage' as CouponType,
    value: 0,
    expiresAt: '',
    maxUses: 0,
    minPurchase: 0,
    requiresProximity: false,
    proximityRadius: 500
};

const CouponManagerModal: React.FC<CouponManagerModalProps> = ({ isOpen, onClose, business }) => {
    const { businesses } = useData();
    const { user } = useAuthContext();
    const { showToast, showConfirm } = useToast();
    const [view, setView] = useState<ModalView>('list');
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [validationCode, setValidationCode] = useState('');
    const [filterCouponId, setFilterCouponId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'redeemed' | 'reserved' | null>(null);

    useEffect(() => {
        if (!isOpen || !business?.id) return;
        const unsubCoupons = subscribeToBusinessCoupons(business.id, setCoupons);
        const unsubRedemptions = subscribeToCouponRedemptions(business.id, setRedemptions);
        return () => {
            unsubCoupons();
            unsubRedemptions();
        };
    }, [isOpen, business?.id]);

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setFilterCouponId(null);
        setFilterType(null);
        setView('list');
    };

    const handleEdit = (c: Coupon) => {
        setForm({
            code: c.code,
            description: c.description || '',
            type: c.type,
            value: c.value,
            expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : '',
            maxUses: c.maxUses || 0,
            minPurchase: c.minPurchase || 0,
            requiresProximity: c.requiresProximity || false,
            proximityRadius: c.proximityRadius || 500
        });
        setEditingId(c.id);
        setView('form');
    };

    const handleSubmit = async () => {
        if (!form.code) return showToast('El código es obligatorio', 'error');
        if (form.value <= 0) return showToast('El valor debe ser mayor a 0', 'error');

        setIsLoading(true);
        try {
            const couponData = {
                ...form,
                businessId: business.id,
                businessName: business.name,
                isActive: true,
                expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
            };

            if (editingId) {
                await updateCoupon(editingId, couponData);
                showToast('Cupón actualizado', 'success');
            } else {
                await createCoupon(couponData);
                showToast('Cupón creado con éxito', 'success');
            }
            resetForm();
        } catch (error: any) {
            showToast(error.message === 'DUPLICATE_CODE' ? 'Código ya existe' : 'Error al guardar', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (c: Coupon) => {
        if (await showConfirm(`¿Eliminar ${c.code}?`, 'Esta acción no se puede deshacer.')) {
            await deleteCoupon(c.id);
            showToast('Cupón eliminado', 'success');
        }
    };

    const handleToggle = async (c: Coupon) => {
        await updateCoupon(c.id, { isActive: !c.isActive });
        showToast(c.isActive ? 'Cupón desactivado' : 'Cupón activado', 'success');
    };

    const handleValidateCode = async (codeOverride?: string) => {
        const code = codeOverride || validationCode;
        if (!code.trim()) return showToast('Ingresa un código', 'error');

        setIsLoading(true);
        try {
            const result = await confirmRedemption(code.trim().toUpperCase(), business.id, user?.name || 'Owner');
            if (result.success) {
                showToast('¡Cupón canjeado!', 'success');
                setValidationCode('');
                setView('history');
                
                if (result.redemptionData?.userId) {
                    const biz = businesses.find(b => b.id === business.id);
                    createNotification({
                        userId: result.redemptionData.userId,
                        title: '🎉 ¡Cupón Canjeado!',
                        message: `Tu cupón de ${biz?.name || 'el negocio'} ha sido validado correctamente.`,
                        type: 'offer',
                        businessId: business.id,
                        metadata: { couponId: result.redemptionData.couponId }
                    });
                }
            } else {
                showToast(result.error || 'Error al validar', 'error');
            }
        } catch (error: any) {
            showToast('Error al validar el código', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleShowStats = (coupon: Coupon, type: 'redeemed' | 'reserved') => {
        setFilterCouponId(coupon.id);
        setFilterType(type);
        setView('history');
    };

    if (!isOpen) return null;

    const totalRedeemed = redemptions.filter(r => r.status === 'redeemed').length;
    const activeCoupons = coupons.filter(c => c.isActive).length;

    return (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-3xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-orange-600/20 to-amber-500/10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center">
                            <Ticket className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white italic">Gestión de Cupones</h2>
                            <p className="text-orange-400 text-[10px] font-bold uppercase tracking-widest">{business.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {view === 'list' && (
                            <>
                                <button onClick={() => { setFilterCouponId(null); setFilterType(null); setView('history'); }} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Historial
                                </button>
                                <button onClick={() => setView('analytics')} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sky-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                                    <BarChart2 className="w-4 h-4" /> Métricas
                                </button>
                                <button onClick={() => setView('validate')} className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Validar
                                </button>
                            </>
                        )}
                        {view !== 'list' && (
                            <button onClick={resetForm} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                Volver
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#111111]">
                    {view === 'list' ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-4 gap-3">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Total</p>
                                    <p className="text-2xl font-black text-white">{coupons.length}</p>
                                </div>
                                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Activos</p>
                                    <p className="text-2xl font-black text-emerald-400">{activeCoupons}</p>
                                </div>
                                <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                                    <p className="text-[8px] font-black text-orange-600 uppercase mb-1">Canjes</p>
                                    <p className="text-2xl font-black text-orange-400">{totalRedeemed}</p>
                                </div>
                                <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                                    <p className="text-[8px] font-black text-amber-600 uppercase mb-1">Reservas</p>
                                    <p className="text-2xl font-black text-amber-400">{redemptions.filter(r => r.status === 'reserved').length}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => { setForm({ ...EMPTY_FORM, code: generateCouponCode() }); setView('form'); }}
                                className="w-full py-4 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl text-slate-400 hover:text-orange-400 font-black text-xs uppercase flex items-center justify-center gap-2 transition-all"
                            >
                                <Plus className="w-5 h-5" /> Crear Nuevo Cupón
                            </button>

                            {coupons.length === 0 ? (
                                <div className="py-16 text-center bg-black/20 rounded-3xl border border-dashed border-white/5">
                                    <Ticket className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                    <p className="text-sm font-black text-slate-600 uppercase">Sin cupones</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {coupons.map(c => (
                                        <div key={c.id} className="relative group">
                                            <CouponCard 
                                                coupon={c} 
                                                isOwner 
                                                pendingCount={redemptions.filter(r => r.couponId === c.id && r.status === 'reserved').length}
                                                onShowStats={handleShowStats}
                                            />
                                            <div className="absolute top-4 right-16 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleToggle(c)} className="p-2 bg-black/80 hover:bg-white/10 rounded-xl border border-white/10">
                                                    {c.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                                                </button>
                                                <button onClick={() => handleEdit(c)} className="p-2 bg-black/80 hover:bg-white/10 rounded-xl border border-white/10">
                                                    <Edit3 className="w-4 h-4 text-sky-400" />
                                                </button>
                                                <button onClick={() => handleDelete(c)} className="p-2 bg-black/80 hover:bg-rose-500/10 rounded-xl border border-white/10">
                                                    <Trash2 className="w-4 h-4 text-rose-400" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : view === 'form' ? (
                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-white">{editingId ? 'Editar Cupón' : 'Nuevo Cupón'}</h3>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Código</label>
                                <div className="flex gap-2">
                                    <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} 
                                        className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono font-black text-lg outline-none uppercase" maxLength={12} />
                                    <button onClick={() => setForm({ ...form, code: generateCouponCode() })} className="px-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400"><Zap className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tipo</label>
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as CouponType })}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white font-bold outline-none appearance-none">
                                        <option value="percentage">Porcentaje (%)</option>
                                        <option value="fixed_amount">Monto Fijo ($)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Valor</label>
                                    <input type="number" value={form.value} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white font-black outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Descripción</label>
                                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm outline-none" />
                            </div>
                            <button onClick={handleSubmit} disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-sm uppercase rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                {editingId ? 'Guardar Cambios' : 'Crear Cupón'}
                            </button>
                        </div>
                    ) : view === 'history' ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-white italic">
                                    {filterCouponId 
                                        ? `Actividad: ${coupons.find(c => c.id === filterCouponId)?.code}` 
                                        : 'Historial de Actividad'}
                                </h3>
                                {filterCouponId && (
                                    <button 
                                        onClick={() => { setFilterCouponId(null); setFilterType(null); }}
                                        className="text-[9px] font-black text-orange-400 uppercase hover:text-orange-300"
                                    >
                                        Ver Todo
                                    </button>
                                )}
                            </div>
                            
                            {redemptions.filter(r => {
                                if (filterCouponId && r.couponId !== filterCouponId) return false;
                                if (filterType && r.status !== filterType) return false;
                                return true;
                            }).length === 0 ? (
                                <div className="py-20 text-center bg-black/20 rounded-[2.5rem] border border-dashed border-white/5">
                                    <Clock className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                    <p className="text-sm font-black text-slate-600 uppercase">Sin actividad {filterType === 'reserved' ? 'de reservas' : filterType === 'redeemed' ? 'de canjes' : ''}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {redemptions
                                        .filter(r => {
                                            if (filterCouponId && r.couponId !== filterCouponId) return false;
                                            if (filterType && r.status !== filterType) return false;
                                            return true;
                                        })
                                        .sort((a, b) => ensureDate(b.reservedAt).getTime() - ensureDate(a.reservedAt).getTime())
                                        .map(r => (
                                            <div key={r.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.status === 'redeemed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {r.status === 'redeemed' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-white">{r.userName}</p>
                                                        <p className="text-[9px] text-slate-500">
                                                            {r.couponCode} • {ensureDate(r.reservedAt).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                            {r.redeemedAt && ` • Canjeado: ${ensureDate(r.redeemedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${r.status === 'redeemed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {r.status === 'redeemed' ? 'Canjeado' : 'Reservado'}
                                                    </div>
                                                    {r.status === 'reserved' && (
                                                        <p className="text-[7px] font-black text-slate-600 uppercase mt-1">Expira en 24h</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    ) : view === 'validate' ? (
                        <div className="space-y-6 text-center">
                            <h3 className="text-2xl font-black text-white italic">Validar Cupón</h3>
                            <div className="max-w-xs mx-auto space-y-4">
                                <input type="text" value={validationCode} onChange={e => setValidationCode(e.target.value.toUpperCase())} placeholder="MT-XXXXX"
                                    className="w-full bg-white/5 border-2 border-emerald-500/20 rounded-3xl px-6 py-6 text-white font-mono text-3xl font-black text-center outline-none" />
                                <PlaceholderScanner onScanSuccess={handleValidateCode} />
                                <button onClick={() => handleValidateCode()} disabled={isLoading || !validationCode.trim()} className="w-full py-4 bg-emerald-500 text-black font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Validar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-white italic">Métricas</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase mb-2">Canjes Reales</p>
                                    <p className="text-3xl font-black text-white italic">{totalRedeemed}</p>
                                </div>
                                <div className="p-6 bg-sky-500/5 rounded-[2rem] border border-sky-500/10">
                                    <p className="text-[10px] font-black text-sky-400 uppercase mb-2">Impacto</p>
                                    <p className="text-3xl font-black text-white italic">${redemptions.filter(r => r.status === 'redeemed').reduce((acc, r) => acc + (r.couponType === 'fixed_amount' ? r.couponValue : 0), 0).toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CouponManagerModal;
