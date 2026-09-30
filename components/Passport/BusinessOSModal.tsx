import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Plus, Calendar, Clock, DollarSign, Users, Shield, Zap, Edit3, Trash2,
  CheckCircle, AlertTriangle, Eye, ArrowUpRight, Filter, Download, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, Phone, Mail, MessageCircle, RefreshCw, Layers, Grid, List,
  HelpCircle, Bell, Search, Lock, UserCheck, LogOut, Award, BarChart2, Bookmark, Check, Store,
  Scissors, CheckCheck, Sun, Moon, CreditCard, Sparkles, MapPin, ExternalLink, Share2, Tag, Percent, ArrowDownRight, Menu
} from 'lucide-react';
import { Business, ResourceItem, BusinessReservation, BlockedDateRange, ShiftSlot, BusinessServiceItem, Coupon, CouponType } from '../../types';
import {
  getBusinessResources, saveBusinessResource, toggleResourceAvailability, deleteBusinessResource,
  getBusinessReservations, saveBusinessReservation, updateReservationStatus, deleteBusinessReservation,
  getBlockedDates, saveBlockedDateRange, deleteBlockedDateRange,
  getBusinessShifts, saveBusinessShift, updateShiftStatus, deleteBusinessShift,
  getBusinessServices, saveBusinessService, deleteBusinessService,
  checkResourceAvailability, checkShiftAvailability, getEffectiveOSModule
} from '../../services/businessOSService';
import { useToast } from '../../context/ToastContext';
import { BASE_URL } from '../../constants';

interface BusinessOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  onNavigatePlans?: () => void;
  onEditBusiness?: () => void;
  onViewProfile?: () => void;
}

type OSMode = 'hospedaje' | 'turnos';
type OSTab = 'perfil' | 'habitaciones' | 'agenda' | 'servicios' | 'reservas' | 'calendario' | 'cupones' | 'crm' | 'caja' | 'estadisticas';

interface CashTransaction {
  id: string;
  time: string;
  concept: string;
  customerName: string;
  amount: number;
  type: 'ingreso' | 'egreso';
  method: 'efectivo' | 'transferencia' | 'tarjeta' | 'deuna';
}

export const BusinessOSModal: React.FC<BusinessOSModalProps> = ({
  isOpen,
  onClose,
  business,
  onNavigatePlans,
  onEditBusiness,
  onViewProfile
}) => {
  const { showToast, showConfirm } = useToast();
  
  // OS Operating Mode: Fixed by business category / active contract module ('hospedaje' or 'turnos')
  const effectiveOSModule = getEffectiveOSModule(business);
  const [osMode, setOsMode] = useState<OSMode>(effectiveOSModule);
  const [activeTab, setActiveTab] = useState<OSTab>(effectiveOSModule === 'turnos' ? 'agenda' : 'habitaciones');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark'); // Default to MontaPulse Dark Theme
  const [isOpenBusiness, setIsOpenBusiness] = useState(business.isOpen ?? true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Agenda Date State
  const [selectedAgendaDate, setSelectedAgendaDate] = useState<string>('2026-10-23');

  // Stats Period State
  const [statsPeriod, setStatsPeriod] = useState<'semana' | 'mes' | 'trimestre'>('mes');

  // Data State
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [reservations, setReservations] = useState<BusinessReservation[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDateRange[]>([]);
  const [shifts, setShifts] = useState<ShiftSlot[]>([]);
  const [services, setServices] = useState<BusinessServiceItem[]>([]);
  
  // Local Coupons & Cash transactions state
  const [couponsList, setCouponsList] = useState<Coupon[]>([
    {
      id: 'coup-1',
      businessId: business.id,
      ownerId: business.id,
      code: 'VERANO20',
      type: 'percentage',
      value: 20,
      description: '20% de descuento en estadías o turnos de tarde',
      maxUses: 50,
      currentUses: 12,
      minPurchase: 0,
      isActive: true,
      requiresProximity: false,
      proximityRadius: 500,
      expiresAt: '2026-12-31',
      createdAt: Date.now()
    },
    {
      id: 'coup-2',
      businessId: business.id,
      ownerId: business.id,
      code: 'MONTA10',
      type: 'fixed_amount',
      value: 10,
      description: '$10 OFF en consumo o reservas superiores a $40',
      maxUses: 30,
      currentUses: 5,
      minPurchase: 40,
      isActive: true,
      requiresProximity: false,
      proximityRadius: 500,
      expiresAt: '2026-11-15',
      createdAt: Date.now()
    }
  ]);

  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([
    { id: 'tx-1', time: '09:30 AM', concept: 'Reserva Cabaña Familiar #RES1028', customerName: 'Carlos Mendoza', amount: 85, type: 'ingreso', method: 'transferencia' },
    { id: 'tx-2', time: '10:15 AM', concept: 'Turno Corte & Barba', customerName: 'Carlos', amount: 8, type: 'ingreso', method: 'efectivo' },
    { id: 'tx-3', time: '11:45 AM', concept: 'Reserva Habitación Privada', customerName: 'Lucía Fernández', amount: 45, type: 'ingreso', method: 'deuna' },
    { id: 'tx-4', time: '01:30 PM', concept: 'Clase de Surf 1-a-1', customerName: 'Mateo Rossi', amount: 35, type: 'ingreso', method: 'efectivo' },
    { id: 'tx-5', time: '03:10 PM', concept: 'Insumos de Limpieza / Toallas', customerName: 'Proveedor Local', amount: 15, type: 'egreso', method: 'efectivo' }
  ]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [crmSearch, setCrmSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cashMethodFilter, setCashMethodFilter] = useState<string>('todos');

  // Modal forms state
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Partial<ResourceItem> | null>(null);
  
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Partial<ShiftSlot>>({});
  
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<Partial<BusinessServiceItem>>({});

  const [showReservationForm, setShowReservationForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Partial<BusinessReservation> | null>(null);

  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon>>({});

  const [showCashForm, setShowCashForm] = useState(false);
  const [editingCash, setEditingCash] = useState<Partial<CashTransaction>>({});

  const [showBlockDateForm, setShowBlockDateForm] = useState(false);
  const [editingBlockDate, setEditingBlockDate] = useState<Partial<BlockedDateRange>>({});

  const refreshData = () => {
    if (business && business.id) {
      setResources(getBusinessResources(business.id));
      setReservations(getBusinessReservations(business.id));
      setBlockedDates(getBlockedDates(business.id));
      setShifts(getBusinessShifts(business.id));
      setServices(getBusinessServices(business.id));
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [business, isOpen]);

  useEffect(() => {
    const handleDataChange = () => {
      refreshData();
    };
    window.addEventListener('montapulse_business_data_changed', handleDataChange);
    window.addEventListener('storage', handleDataChange);
    return () => {
      window.removeEventListener('montapulse_business_data_changed', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, [business]);

  // Hospedaje stats
  const totalUnits = resources.length;
  const activeAvailableUnits = resources.filter(r => r.isAvailable).length;
  const occupancyPct = totalUnits > 0 ? Math.round(((totalUnits - activeAvailableUnits) / totalUnits) * 100) : 60;
  const todayCheckins = reservations.filter(r => r.status === 'confirmed' || r.status === 'checked_in').length;

  // Turnos stats
  const dayShifts = shifts.filter(s => s.dateStr === selectedAgendaDate || !s.dateStr);
  const completedShiftsCount = dayShifts.filter(s => s.status === 'completed').length;
  const inProgressShiftsCount = dayShifts.filter(s => s.status === 'in_progress').length;
  const totalShiftIncome = dayShifts.reduce((sum, s) => sum + s.price, 0);

  // Cash income totals
  const filteredCashTransactions = cashTransactions.filter(tx => {
    if (cashMethodFilter === 'todos') return true;
    return tx.method === cashMethodFilter;
  });

  const totalCashIncome = cashTransactions.filter(t => t.type === 'ingreso').reduce((sum, tx) => sum + tx.amount, 0);
  const totalCashExpense = cashTransactions.filter(t => t.type === 'egreso').reduce((sum, tx) => sum + tx.amount, 0);
  const netCashBalance = totalCashIncome - totalCashExpense;
  const cashEfectivo = cashTransactions.filter(t => t.method === 'efectivo' && t.type === 'ingreso').reduce((sum, t) => sum + t.amount, 0);
  const cashDigital = cashTransactions.filter(t => t.method !== 'efectivo' && t.type === 'ingreso').reduce((sum, t) => sum + t.amount, 0);

  // Handlers for Hospedaje (Rooms)
  const handleToggleResource = (resId: string) => {
    const updated = toggleResourceAvailability(business.id, resId);
    setResources(updated);
    showToast('Estado de disponibilidad actualizado', 'success');
  };

  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource?.name || !editingResource?.price) return;
    const newRes: ResourceItem = {
      id: editingResource.id || `res-${Date.now()}`,
      businessId: business.id,
      name: editingResource.name,
      type: editingResource.type || 'room',
      price: Number(editingResource.price) || 0,
      pricePeriod: editingResource.pricePeriod || 'noche',
      capacity: Number(editingResource.capacity) || 2,
      status: editingResource.status || 'available',
      features: typeof editingResource.features === 'string'
        ? (editingResource.features as string).split(',').map(s => s.trim()).filter(Boolean)
        : editingResource.features || ['WiFi', 'Baño privado'],
      isAvailable: editingResource.isAvailable ?? true,
      description: editingResource.description || '',
      nextBookingNote: editingResource.nextBookingNote || 'Sin reservas próximas'
    };
    setResources(saveBusinessResource(newRes));
    setShowResourceForm(false);
    setEditingResource(null);
    showToast('Habitación / Unidad guardada con éxito', 'success');
  };

  const handleDeleteResource = async (resId: string, name: string) => {
    const confirmed = await showConfirm(`¿Estás seguro de que deseas eliminar "${name}"?`, 'Eliminar unidad');
    if (confirmed) {
      setResources(deleteBusinessResource(business.id, resId));
      showToast('Habitación eliminada', 'info');
    }
  };

  // Handlers for Turnos (Shifts)
  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift.customerName || !editingShift.time) return;

    const avail = checkShiftAvailability(
      editingShift.time || '09:00',
      editingShift.dateStr || selectedAgendaDate,
      business.id,
      editingShift.staffName,
      editingShift.id
    );
    if (!avail.isAvailable) {
      showToast(`⚠️ ${avail.reason}`, 'warning');
      return;
    }

    const newShift: ShiftSlot = {
      id: editingShift.id || `sh-${Date.now()}`,
      businessId: business.id,
      time: editingShift.time || '09:00',
      serviceName: editingShift.serviceName || services[0]?.name || 'Corte',
      customerName: editingShift.customerName,
      staffName: editingShift.staffName || 'Atendedor Principal',
      stationName: editingShift.stationName || 'Puesto 1',
      durationMin: Number(editingShift.durationMin) || 30,
      price: Number(editingShift.price) || 5,
      status: editingShift.status || 'confirmed',
      dateStr: editingShift.dateStr || selectedAgendaDate
    };
    setShifts(saveBusinessShift(newShift));
    setShowShiftForm(false);
    setEditingShift({});
    showToast('Turno agendado con éxito', 'success');
  };

  const handleShiftStatus = (shiftId: string, status: ShiftSlot['status']) => {
    const updated = updateShiftStatus(business.id, shiftId, status);
    setShifts(updated);

    // If shift completed, add automatic cash transaction if not already registered
    if (status === 'completed') {
      const targetShift = shifts.find(s => s.id === shiftId);
      if (targetShift) {
        const autoTx: CashTransaction = {
          id: `tx-auto-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          concept: `Turno ${targetShift.serviceName} - ${targetShift.customerName}`,
          customerName: targetShift.customerName,
          amount: targetShift.price,
          type: 'ingreso',
          method: 'efectivo'
        };
        setCashTransactions(prev => [autoTx, ...prev]);
        showToast(`Turno completado y +$${targetShift.price} ingresado a Caja`, 'success');
        return;
      }
    }
    showToast(`Estado del turno actualizado a ${status}`, 'success');
  };

  const handleDeleteShift = async (shiftId: string) => {
    const confirmed = await showConfirm('¿Estás seguro de que deseas eliminar este turno?', 'Eliminar turno');
    if (confirmed) {
      setShifts(deleteBusinessShift(business.id, shiftId));
      showToast('Turno eliminado', 'info');
    }
  };

  // Handlers for Services Catalog
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService.name || !editingService.price) return;
    const newSrv: BusinessServiceItem = {
      id: editingService.id || `srv-${Date.now()}`,
      businessId: business.id,
      name: editingService.name,
      durationMin: Number(editingService.durationMin) || 30,
      price: Number(editingService.price) || 5,
      icon: editingService.icon || 'scissors'
    };
    setServices(saveBusinessService(newSrv));
    setShowServiceForm(false);
    setEditingService({});
    showToast('Servicio guardado con éxito', 'success');
  };

  const handleDeleteService = async (serviceId: string, name: string) => {
    const confirmed = await showConfirm(`¿Estás seguro de eliminar el servicio "${name}"?`, 'Eliminar servicio');
    if (confirmed) {
      setServices(deleteBusinessService(business.id, serviceId));
      showToast('Servicio eliminado', 'info');
    }
  };

  // Handlers for Reservations
  const handleSaveReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReservation?.customerName || !editingReservation?.startDate) return;

    const resourceName = editingReservation.resourceName || resources[0]?.name || 'Cabaña Familiar';
    const targetResource = resources.find(r => r.name === resourceName || r.id === editingReservation.resourceId) || resources[0];

    if (targetResource) {
      const avail = checkResourceAvailability(
        targetResource.id,
        editingReservation.startDate,
        editingReservation.endDate || editingReservation.startDate,
        business.id,
        editingReservation.id
      );
      if (!avail.isAvailable) {
        showToast(`⚠️ ${avail.reason}`, 'warning');
        return;
      }
    }

    const code = editingReservation.reservationCode || `RES${Math.floor(1000 + Math.random() * 9000)}`;
    const newResv: BusinessReservation = {
      id: editingReservation.id || `resv-${Date.now()}`,
      reservationCode: code,
      businessId: business.id,
      resourceId: targetResource?.id || editingReservation.resourceId || 'res-1',
      resourceName: targetResource?.name || editingReservation.resourceName || 'Unidad / Habitación',
      customerName: editingReservation.customerName,
      customerPhone: editingReservation.customerPhone || '+593 99 000 0000',
      customerEmail: editingReservation.customerEmail || '',
      startDate: editingReservation.startDate,
      endDate: editingReservation.endDate || editingReservation.startDate,
      shiftTime: editingReservation.shiftTime || '',
      status: editingReservation.status || 'confirmed',
      guestsCount: Number(editingReservation.guestsCount) || 1,
      totalPrice: Number(editingReservation.totalPrice) || 50,
      paymentStatus: editingReservation.paymentStatus || 'paid',
      notes: editingReservation.notes || '',
      createdAt: Date.now()
    };
    setReservations(saveBusinessReservation(newResv));
    setShowReservationForm(false);
    setEditingReservation(null);
    showToast(`Reserva ${code} registrada con éxito`, 'success');
  };

  const handleUpdateReservationStatus = (resId: string, status: BusinessReservation['status']) => {
    setReservations(updateReservationStatus(business.id, resId, status));
    showToast(`Estado de reserva actualizado a ${status}`, 'success');
  };

  const handleDeleteReservation = async (resId: string, code: string) => {
    const confirmed = await showConfirm(`¿Eliminar la reserva ${code}?`, 'Eliminar reserva');
    if (confirmed) {
      setReservations(deleteBusinessReservation(business.id, resId));
      showToast('Reserva eliminada', 'info');
    }
  };

  // Handlers for Blocked Dates
  const handleSaveBlockedDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlockDate.startDate || !editingBlockDate.endDate) return;
    const range: BlockedDateRange = {
      id: editingBlockDate.id || `block-${Date.now()}`,
      resourceId: editingBlockDate.resourceId || resources[0]?.id || 'all',
      resourceName: editingBlockDate.resourceName || resources[0]?.name || 'Todas las unidades',
      startDate: editingBlockDate.startDate,
      endDate: editingBlockDate.endDate,
      reason: editingBlockDate.reason || 'mantenimiento',
      code: editingBlockDate.code || 'Mantenimiento'
    };
    setBlockedDates(saveBlockedDateRange(business.id, range));
    setShowBlockDateForm(false);
    setEditingBlockDate({});
    showToast('Período de bloqueo guardado', 'success');
  };

  const handleDeleteBlockedDate = (rangeId: string) => {
    setBlockedDates(deleteBlockedDateRange(business.id, rangeId));
    showToast('Desbloqueado con éxito', 'info');
  };

  // Handlers for Coupons
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon.code || !editingCoupon.value) return;
    const couponType: CouponType = editingCoupon.type === 'fixed_amount' ? 'fixed_amount' : 'percentage';
    const newCoup: Coupon = {
      id: editingCoupon.id || `coup-${Date.now()}`,
      businessId: business.id,
      ownerId: business.id,
      code: (editingCoupon.code || '').toUpperCase(),
      type: couponType,
      value: Number(editingCoupon.value) || 10,
      description: editingCoupon.description || 'Descuento especial',
      maxUses: Number(editingCoupon.maxUses) || 50,
      currentUses: editingCoupon.currentUses || 0,
      minPurchase: Number(editingCoupon.minPurchase) || 0,
      isActive: editingCoupon.isActive ?? true,
      requiresProximity: false,
      proximityRadius: 500,
      expiresAt: editingCoupon.expiresAt || '2026-12-31',
      createdAt: Date.now()
    };
    const exists = couponsList.some(c => c.id === newCoup.id);
    if (exists) {
      setCouponsList(couponsList.map(c => c.id === newCoup.id ? newCoup : c));
    } else {
      setCouponsList([newCoup, ...couponsList]);
    }
    setShowCouponForm(false);
    setEditingCoupon({});
    showToast(`Cupón ${newCoup.code} guardado`, 'success');
  };

  const handleToggleCoupon = (couponId: string) => {
    setCouponsList(couponsList.map(c => c.id === couponId ? { ...c, isActive: !c.isActive } : c));
    showToast('Estado del cupón actualizado', 'info');
  };

  const handleDeleteCoupon = (couponId: string, code: string) => {
    setCouponsList(couponsList.filter(c => c.id !== couponId));
    showToast(`Cupón ${code} eliminado`, 'info');
  };

  // Handlers for Cash Transactions
  const handleSaveCashTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCash.concept || !editingCash.amount) return;
    const newTx: CashTransaction = {
      id: `tx-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      concept: editingCash.concept,
      customerName: editingCash.customerName || 'Cliente General',
      amount: Number(editingCash.amount) || 0,
      type: editingCash.type || 'ingreso',
      method: editingCash.method || 'efectivo'
    };
    setCashTransactions([newTx, ...cashTransactions]);
    setShowCashForm(false);
    setEditingCash({});
    showToast(`${newTx.type === 'ingreso' ? 'Ingreso' : 'Egreso'} de $${newTx.amount} registrado`, 'success');
  };

  const handleDeleteCashTx = (txId: string) => {
    setCashTransactions(cashTransactions.filter(t => t.id !== txId));
    showToast('Movimiento de caja eliminado', 'info');
  };

  // Filtered lists
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      const matchSearch = r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.reservationCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.resourceName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [reservations, searchTerm, statusFilter]);

  const filteredCustomers = useMemo(() => {
    return reservations.filter(r => 
      r.customerName.toLowerCase().includes(crmSearch.toLowerCase()) ||
      r.customerPhone.includes(crmSearch)
    );
  }, [reservations, crmSearch]);

  const navTabs = useMemo(() => [
    { id: 'perfil', label: 'Perfil', icon: UserCheck },
    ...(osMode === 'hospedaje' ? [
      { id: 'habitaciones', label: 'Habitaciones', icon: Layers, count: resources.length },
      { id: 'reservas', label: 'Reservas', icon: Calendar, count: reservations.length },
    ] : [
      { id: 'servicios', label: 'Servicios', icon: Scissors, count: services.length },
      { id: 'agenda', label: 'Agenda', icon: Calendar, count: dayShifts.length },
    ]),
    { id: 'calendario', label: 'Calendario', icon: Clock },
    { id: 'cupones', label: 'Cupones', icon: Bookmark, count: couponsList.length },
    { id: 'crm', label: 'Clientes CRM', icon: Users, count: reservations.length },
    { id: 'caja', label: 'Caja', icon: DollarSign, count: cashTransactions.length },
    { id: 'estadisticas', label: 'Estadísticas', icon: BarChart2 },
  ], [osMode, resources.length, reservations.length, services.length, dayShifts.length, couponsList.length, cashTransactions.length]);

  // Theme styling helpers
  const isLight = themeMode === 'light';
  const bgMain = isLight ? 'bg-[#f4f6f8] text-slate-800' : 'bg-[#050a14] text-white selection:bg-orange-500 selection:text-white';
  const bgCard = isLight ? 'bg-white border-slate-200 shadow-sm text-slate-800' : 'bg-[#0c1626]/90 border border-white/10 text-white shadow-xl backdrop-blur-md';
  const bgHeader = isLight ? 'bg-white border-b border-slate-200 text-slate-900 shadow-sm' : 'bg-[#081021]/95 border-b border-white/10 text-white backdrop-blur-xl';
  const bgSidebar = isLight ? 'bg-white border-r border-slate-200 text-slate-700' : 'bg-[#040812]/95 border-r border-white/10 text-slate-300 backdrop-blur-xl';
  const bgPill = isLight ? 'bg-slate-100 border border-slate-200 text-slate-700' : 'bg-white/5 border border-white/10 text-slate-200';
  const bgInput = isLight ? 'bg-white border border-slate-300 text-slate-800' : 'bg-slate-900/90 border border-white/15 text-white placeholder-slate-400';
  const bgModal = isLight ? 'bg-white border border-slate-200 text-slate-800' : 'bg-[#0c1626] border border-white/10 text-white shadow-2xl backdrop-blur-2xl';

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[6000] flex flex-col overflow-hidden font-sans ${bgMain} animate-fadeIn select-none`}>
      
      {/* ── TOP HEADER BAR ── */}
      <header className={`h-16 px-3 sm:px-8 flex items-center justify-between shrink-0 ${bgHeader}`}>
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          {/* Mobile Hamburger Drawer Trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-xl cursor-pointer ${bgPill}`}
            title="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => { setActiveTab('perfil'); setIsMobileMenuOpen(false); }}>
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-white shadow-md ${
              osMode === 'hospedaje' ? 'bg-[#00a896]' : 'bg-[#1e1e38]'
            }`}>
              {osMode === 'hospedaje' ? <Store className="w-4 h-4 sm:w-5 sm:h-5" /> : <Scissors className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div>
              <h1 className="text-xs sm:text-base font-black tracking-tight flex items-center gap-1.5 leading-none">
                UBICAME <span className={`text-[9px] sm:text-xs font-bold uppercase px-1.5 py-0.5 rounded-md ${
                  osMode === 'hospedaje' ? 'bg-teal-50 text-[#00a896] border border-teal-200' : 'bg-indigo-50 text-[#1e1e38] border border-indigo-200'
                }`}>
                  OS
                </span>
              </h1>
              <p className="text-[8px] sm:text-[9px] font-black text-slate-400 tracking-widest uppercase mt-0.5 truncate max-w-[100px] sm:max-w-none">
                {osMode === 'hospedaje' ? 'Hostel Control' : 'Turno Control'}
              </p>
            </div>
          </div>

          {/* Contracted Module Status Badge (desktop/tablet) */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">
            <Lock className="w-3.5 h-3.5 text-[#00a896]" />
            <span>Módulo Contratado:</span>
            <span className={`px-2 py-0.5 rounded-lg ${
              osMode === 'hospedaje' ? 'bg-[#00a896]/20 text-[#00a896]' : 'bg-indigo-500/20 text-indigo-400'
            }`}>
              {osMode === 'hospedaje' ? 'Hospedaje OS' : 'Turnos OS'}
            </span>
          </div>

          {/* Business Selector & Status */}
          <div className={`hidden md:flex items-center gap-3 pl-3 ${isLight ? 'border-l border-slate-200' : 'border-l border-white/10'}`}>
            <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 ${bgPill}`}>
              <span>{business.name}</span>
              <span className="text-[10px] text-slate-400">({business.locality || 'Montañita'})</span>
            </div>

            <button
              onClick={() => {
                setIsOpenBusiness(!isOpenBusiness);
                showToast(`Estado: ${!isOpenBusiness ? 'Abierto para clientes' : 'Cerrado temporalmente'}`, 'info');
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                isOpenBusiness ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOpenBusiness ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {isOpenBusiness ? 'Abierto' : 'Cerrado'}
            </button>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${bgPill}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase">Ocupación</span>
              <span className="text-xs font-black text-[#00a896]">{occupancyPct}%</span>
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setThemeMode(isLight ? 'dark' : 'light')}
            className={`p-2 rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer ${bgPill}`}
            title="Cambiar tema claro/oscuro"
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <button
            onClick={() => showToast('Notificaciones: 3 reservas nuevas confirmadas', 'info')}
            className={`p-2 rounded-xl relative hover:scale-105 active:scale-95 transition-all cursor-pointer ${bgPill}`}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
          </button>
          
          <div className="w-8 h-8 rounded-xl bg-[#00a896] text-white font-black text-xs flex items-center justify-center shadow-md">
            {business.name.slice(0, 2).toUpperCase()}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white transition-all ml-1 sm:ml-2 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── WORKSPACE WITH SIDEBAR & CONTENT ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* MOBILE OVERLAY BACKDROP */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-[6400] bg-black/70 backdrop-blur-xs lg:hidden animate-fadeIn"
          />
        )}

        {/* SIDEBAR NAVIGATION (Desktop static, Mobile drawer) */}
        <aside className={`fixed inset-y-0 left-0 z-[6500] w-64 p-4 flex flex-col justify-between shrink-0 ${bgSidebar} transition-transform duration-300 lg:static lg:translate-x-0 lg:w-56 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between px-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {osMode === 'hospedaje' ? 'HOSTEL CONTROL' : 'TURNO CONTROL'}
              </p>
              <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contracted Module Status Badge inside drawer */}
            <div className="lg:hidden px-3 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-[10px] font-black uppercase">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Lock className="w-3.5 h-3.5 text-[#00a896]" />
                <span>Módulo Contratado</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${
                osMode === 'hospedaje' ? 'bg-[#00a896]/20 text-[#00a896]' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {osMode === 'hospedaje' ? 'Hospedaje OS' : 'Turnos OS'}
              </span>
            </div>

            <nav className="space-y-1">
              {navTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as OSTab); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer ${
                      isActive
                        ? osMode === 'hospedaje'
                          ? 'bg-[#00a896] text-white shadow-md'
                          : 'bg-[#1e1e38] text-white shadow-md'
                        : isLight
                        ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Plan Pro Banner */}
          <div className={`p-4 rounded-2xl border ${
            isLight ? 'bg-teal-50 border-teal-200' : 'bg-teal-500/10 border-teal-500/20'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-[#00a896]" />
              <span className="text-xs font-black text-slate-800 dark:text-white uppercase">Plan PRO • Activo</span>
            </div>
            <p className="text-[10px] text-slate-500 mb-3">Sincronización en tiempo real habilitada.</p>
            <button
              onClick={() => { onNavigatePlans?.(); setIsMobileMenuOpen(false); }}
              className="w-full py-2 bg-[#00a896] hover:bg-[#008f80] text-white font-black text-[10px] uppercase rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Actualizar plan →
            </button>
          </div>
        </aside>

        {/* MAIN WORKSPACE DISPLAY CONTAINER */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* HORIZONTAL MOBILE SCROLLABLE TAB NAV BAR */}
          <div className={`lg:hidden flex items-center gap-2 px-3 py-2 overflow-x-auto shrink-0 border-b no-scrollbar ${bgHeader}`}>
            {/* Contracted Module Indicator */}
            <div className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase shrink-0 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#00a896]" />
              <span>{osMode === 'hospedaje' ? 'Hospedaje OS' : 'Turnos OS'}</span>
            </div>

            {navTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as OSTab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? osMode === 'hospedaje' ? 'bg-[#00a896] text-white shadow-md' : 'bg-[#1e1e38] text-white shadow-md'
                      : isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-white/20">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-6">

          {/* ── TAB 1: PERFIL DEL NEGOCIO ── */}
          {activeTab === 'perfil' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">Perfil de {business.name}</h2>
                  <p className="text-xs text-slate-500 font-medium">Información corporativa y visualización pública</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditBusiness?.()}
                    className="px-4 py-2 bg-[#00a896] hover:bg-[#008f80] text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" /> Editar Información
                  </button>
                  <button
                    onClick={() => onViewProfile?.()}
                    className="px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" /> Vista Previa Pública
                  </button>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border ${bgCard} grid grid-cols-1 md:grid-cols-3 gap-6`}>
                <div className="md:col-span-1 flex flex-col items-center text-center space-y-3">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-[#00a896] shadow-lg">
                    <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-lg font-black">{business.name}</h3>
                  <span className="px-3 py-1 rounded-full bg-teal-50 text-[#00a896] font-black text-xs uppercase border border-teal-200">
                    {business.category}
                  </span>
                  <p className="text-xs text-slate-500 italic px-4">{business.description || 'Sin descripción guardada'}</p>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <h4 className="text-sm font-black uppercase text-slate-400">Datos Principales</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Sector / Ubicación</p>
                      <p className="font-black text-slate-800 dark:text-white mt-1">📍 {business.sector} ({business.locality || 'Montañita'})</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp de Contacto</p>
                      <p className="font-black text-slate-800 dark:text-white mt-1">💬 {business.whatsapp || business.phone || 'No especificado'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Plan Suscripción</p>
                      <p className="font-black text-[#00a896] mt-1">⚡ Plan {business.plan || 'PRO'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Vistas Mensuales</p>
                      <p className="font-black text-slate-800 dark:text-white mt-1">👁️ {business.monthlyViews || 140} visitas</p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        const url = `${BASE_URL}/negocio/${business.slug || business.id}`;
                        navigator.clipboard.writeText(url);
                        showToast('¡Enlace del negocio copiado al portapapeles!', 'success');
                      }}
                      className="px-4 py-2 bg-[#00a896] text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-sm cursor-pointer hover:bg-[#008f80] transition-all"
                    >
                      <Share2 className="w-4 h-4" /> Copiar Enlace Público
                    </button>
                    <a
                      href={`https://wa.me/${(business.whatsapp || business.phone || '').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-emerald-600 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" /> Probar WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: HABITACIONES (IMAGE 1) ── */}
          {osMode === 'hospedaje' && activeTab === 'habitaciones' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Gestión de Habitaciones</h2>
                  <p className="text-xs text-slate-500 font-medium">Administra tipos de habitación, precios y disponibilidad para {business.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => showToast('Lista filtrada por disponibles', 'info')} className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer">
                    <Filter className="w-3.5 h-3.5" /> Filtros
                  </button>
                  <button onClick={() => showToast('Reporte de habitaciones exportado en CSV', 'success')} className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> Exportar
                  </button>
                  <button
                    onClick={() => { setEditingResource({ isAvailable: true, pricePeriod: 'noche', capacity: 2 }); setShowResourceForm(true); }}
                    className="px-4 py-2 bg-[#00a896] hover:bg-[#008f80] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Nueva Habitación
                  </button>
                </div>
              </div>

              {/* 3 KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${bgCard} flex items-center justify-between`}>
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase">Total Habitaciones</p>
                    <h3 className="text-3xl font-black mt-1">{totalUnits || 3}</h3>
                    <p className="text-[11px] text-teal-600 font-bold mt-1">{activeAvailableUnits} unidades disponibles</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#00a896] flex items-center justify-center font-black">
                    <Layers className="w-6 h-6" />
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border ${bgCard} flex items-center justify-between`}>
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase">Ocupación Actual</p>
                    <h3 className="text-3xl font-black mt-1">{occupancyPct}%</h3>
                    <p className="text-[11px] text-emerald-600 font-bold mt-1">{totalUnits - activeAvailableUnits} ocupadas hoy</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border ${bgCard} flex items-center justify-between`}>
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase">Check-ins Hoy</p>
                    <h3 className="text-3xl font-black mt-1">{todayCheckins}</h3>
                    <p className="text-[11px] text-amber-600 font-bold mt-1">Reservas activas en sistema</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Room items & mini calendars */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-4">
                  {resources.map((item) => (
                    <div key={item.id} className={`p-5 rounded-2xl border ${bgCard} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-all`}>
                      <div className="flex items-start gap-4">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-2xl object-cover shrink-0 shadow-md border border-slate-200 dark:border-white/10" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-[#00a896] text-white flex items-center justify-center font-black shrink-0 shadow-md">
                            <Layers className="w-7 h-7" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-black">{item.name}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              item.isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              ● {item.isAvailable ? 'Disponible' : 'No disponible'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                            <span className="text-slate-800 dark:text-white font-black">US$ {item.price} / {item.pricePeriod}</span>
                            <span>Capacidad: {item.capacity} huéspedes</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {item.features.map((f, i) => (
                              <span key={i} className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <button
                          onClick={() => { setEditingResource(item); setShowResourceForm(true); }}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                          title="Editar Habitación"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteResource(item.id, item.name)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                          title="Eliminar Habitación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
                          <button
                            onClick={() => handleToggleResource(item.id)}
                            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${item.isAvailable ? 'bg-[#00a896]' : 'bg-slate-300'}`}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${item.isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-4 space-y-4">
                  <div className={`p-5 rounded-2xl border ${bgCard}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#00a896]" />
                        <h4 className="text-xs font-black uppercase">Calendario de bloqueo — Agosto 2026</h4>
                      </div>
                      <button
                        onClick={() => { setEditingBlockDate({ startDate: '2026-08-20', endDate: '2026-08-22' }); setShowBlockDateForm(true); }}
                        className="p-1 rounded-lg bg-teal-50 text-[#00a896] hover:bg-teal-100 transition-all cursor-pointer"
                        title="Bloquear fechas"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 mb-2">
                      <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <div
                          key={day}
                          onClick={() => {
                            setEditingBlockDate({ startDate: `2026-08-${day < 10 ? '0' + day : day}`, endDate: `2026-08-${day < 10 ? '0' + day : day}` });
                            setShowBlockDateForm(true);
                          }}
                          className={`py-1.5 rounded-lg cursor-pointer transition-all hover:scale-110 ${(day >= 18 && day <= 21) ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-teal-50'}`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: AGENDA Y TURNOS (IMAGE 2) ── */}
          {(osMode === 'turnos' || activeTab === 'agenda' || activeTab === 'servicios') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
              <div className="lg:col-span-8 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Agenda - {selectedAgendaDate}</h2>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      {dayShifts.length} turnos • {inProgressShiftsCount} en progreso • {completedShiftsCount} completados • ${totalShiftIncome} ingresos
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAgendaDate('2026-10-23')}
                      className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Hoy (23 Oct)
                    </button>
                    <button
                      onClick={() => { setEditingShift({ dateStr: selectedAgendaDate, status: 'confirmed', price: services[0]?.price || 5 }); setShowShiftForm(true); }}
                      className="px-4 py-2 bg-[#1e1e38] hover:bg-[#2e2e56] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Nuevo Turno
                    </button>
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase text-slate-400">Timeline diario — 9:00 a 20:00</h3>
                    <div className="flex gap-2 text-xs font-bold">
                      <button onClick={() => setSelectedAgendaDate('2026-10-22')} className="px-2.5 py-1 bg-slate-100 rounded-lg hover:bg-slate-200">← 22 Oct</button>
                      <span className="px-2.5 py-1 bg-[#1e1e38] text-white rounded-lg">{selectedAgendaDate}</span>
                      <button onClick={() => setSelectedAgendaDate('2026-10-24')} className="px-2.5 py-1 bg-slate-100 rounded-lg hover:bg-slate-200">24 Oct →</button>
                    </div>
                  </div>

                  <div className="space-y-3 font-sans">
                    {dayShifts.map((s) => {
                      const isConf = s.status === 'confirmed';
                      const isInProg = s.status === 'in_progress';
                      const isComp = s.status === 'completed';

                      return (
                        <div key={s.id} className="flex items-center gap-4">
                          <span className="w-12 text-xs font-black text-slate-500 shrink-0">{s.time}</span>
                          <div className={`flex-1 p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            isConf ? 'bg-emerald-50 border-emerald-300 text-emerald-950 border-l-8 border-l-emerald-500' :
                            isInProg ? 'bg-amber-50 border-amber-300 text-amber-950 border-l-8 border-l-amber-500' :
                            'bg-slate-100 border-slate-300 text-slate-800 border-l-8 border-l-slate-400'
                          }`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isConf ? 'bg-emerald-600' : isInProg ? 'bg-amber-600' : 'bg-slate-500'}`} />
                                <span className="text-[10px] font-black uppercase">{s.status}</span>
                              </div>
                              <h4 className="text-sm font-black">{s.serviceName} - {s.customerName}</h4>
                              <p className="text-[11px] font-bold text-slate-600">{s.staffName} • {s.stationName}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-black">
                              <span>{s.durationMin}min • ${s.price}</span>
                              {isConf && (
                                <button onClick={() => handleShiftStatus(s.id, 'in_progress')} className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black cursor-pointer">
                                  Iniciar
                                </button>
                              )}
                              {isInProg && (
                                <button onClick={() => handleShiftStatus(s.id, 'completed')} className="px-2 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black cursor-pointer">
                                  Finalizar
                                </button>
                              )}
                              {isComp && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                              <button onClick={() => { setEditingShift(s); setShowShiftForm(true); }} className="p-1.5 rounded-lg bg-white/50 hover:bg-white text-slate-700 cursor-pointer">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteShift(s.id)} className="p-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-500 hover:text-white cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Services & Summary */}
              <div className="lg:col-span-4 space-y-5">
                <div className={`p-5 rounded-3xl border ${bgCard} space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase">Catálogo de Servicios</h3>
                    <button onClick={() => { setEditingService({}); setShowServiceForm(true); }} className="px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white font-black text-xs rounded-xl flex items-center gap-1 cursor-pointer">
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                  <div className="space-y-3">
                    {services.map(srv => (
                      <div key={srv.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#1e1e38] text-white flex items-center justify-center font-black">
                            <Scissors className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black">{srv.name}</h4>
                            <p className="text-[10px] text-slate-400">⏱ {srv.durationMin}min</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black">${srv.price}</span>
                          <button onClick={() => { setEditingService(srv); setShowServiceForm(true); }} className="p-1 text-slate-400 hover:text-slate-700">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteService(srv.id, srv.name)} className="p-1 text-rose-400 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-5 rounded-3xl border ${bgCard} space-y-4`}>
                  <h3 className="text-sm font-black uppercase">Resumen de hoy</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase">Ingresos hoy</p>
                      <p className="text-lg font-black text-indigo-700 mt-1">${totalShiftIncome}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/10 text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase">Duración prom.</p>
                      <p className="text-lg font-black mt-1">32min</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/10 text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase">Ocupación</p>
                      <p className="text-lg font-black mt-1">65%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: RESERVAS ── */}
          {activeTab === 'reservas' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#00a896]/10 p-4 rounded-3xl border border-[#00a896]/20">
                <div className="flex items-center gap-3 flex-1">
                  <Search className="w-4 h-4 text-[#00a896]" />
                  <input
                    type="text"
                    placeholder="Buscar reserva por cliente o código..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold w-full max-w-xs"
                  />
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold cursor-pointer">
                    <option value="all">Todas las reservas</option>
                    <option value="confirmed">Confirmadas</option>
                    <option value="pending">Pendientes / Conflicto</option>
                    <option value="checked_in">Check-in activo</option>
                    <option value="completed">Completadas</option>
                    <option value="cancelled">Canceladas</option>
                  </select>
                </div>
                <button onClick={() => { setEditingReservation({ status: 'confirmed', guestsCount: 2 }); setShowReservationForm(true); }} className="px-4 py-2.5 bg-[#00a896] hover:bg-[#008f80] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all">
                  <Plus className="w-4 h-4" /> + Nueva Reserva Directa
                </button>
              </div>

              <div className={`p-4 rounded-3xl border ${bgCard} overflow-x-auto`}>
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Unidad / Habitación</th>
                      <th className="p-3">Fechas</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredReservations.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                        <td className="p-3 font-black text-[#00a896]">{r.reservationCode}</td>
                        <td className="p-3 font-bold">
                          {r.customerName}
                          <br/>
                          <span className="text-[10px] text-slate-400">{r.customerPhone}</span>
                          {r.notes && (
                            <span className={`block text-[9px] font-bold px-1.5 py-0.5 rounded border mt-1 max-w-xs truncate ${
                              r.notes.includes('Conflicto')
                                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300'
                            }`}>
                              📝 {r.notes}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold">{r.resourceName}</td>
                        <td className="p-3 font-bold">{r.startDate} a {r.endDate}</td>
                        <td className="p-3 font-black text-emerald-600">US$ {r.totalPrice}</td>
                        <td className="p-3">
                          <select
                            value={r.status}
                            onChange={(e) => handleUpdateReservationStatus(r.id, e.target.value as any)}
                            className={`px-2 py-1 rounded-full font-black uppercase text-[9px] border cursor-pointer ${
                              r.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              r.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                              r.status === 'checked_in' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              r.status === 'completed' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            <option value="confirmed">Confirmada</option>
                            <option value="pending">Pendiente</option>
                            <option value="checked_in">Checked In</option>
                            <option value="completed">Completada</option>
                            <option value="cancelled">Cancelada</option>
                          </select>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <a
                            href={`https://wa.me/${r.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${r.customerName}, te saludamos de ${business.name} sobre tu reserva ${r.reservationCode}.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg font-black text-[10px] inline-block hover:bg-emerald-600 cursor-pointer"
                          >
                            WhatsApp
                          </a>
                          <button onClick={() => { setEditingReservation(r); setShowReservationForm(true); }} className="p-1 text-slate-400 hover:text-slate-700">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteReservation(r.id, r.reservationCode)} className="p-1 text-rose-400 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB 5: CALENDARIO GENERAL ── */}
          {activeTab === 'calendario' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Calendario de Ocupación y Mantenimiento</h2>
                  <p className="text-xs text-slate-500 font-bold">Bloqueo de fechas, mantenimiento y eventos especiales</p>
                </div>
                <button
                  onClick={() => { setEditingBlockDate({ startDate: '2026-08-20', endDate: '2026-08-22' }); setShowBlockDateForm(true); }}
                  className="px-4 py-2 bg-[#00a896] hover:bg-[#008f80] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Lock className="w-4 h-4" /> + Bloquear Fechas
                </button>
              </div>

              {/* List of blocked date ranges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blockedDates.map(b => (
                  <div key={b.id} className={`p-4 rounded-2xl border ${bgCard} flex items-center justify-between`}>
                    <div>
                      <span className="text-xs font-black text-amber-600 uppercase">🔒 {b.code}</span>
                      <h4 className="text-sm font-black mt-0.5">{b.resourceName}</h4>
                      <p className="text-xs text-slate-500 font-bold">{b.startDate} al {b.endDate}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteBlockedDate(b.id)}
                      className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Desbloquear
                    </button>
                  </div>
                ))}
              </div>

              <div className={`p-6 rounded-3xl border ${bgCard}`}>
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-black mb-3 text-slate-400">
                  <span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span><span>DOM</span>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <div
                      key={day}
                      onClick={() => {
                        setEditingBlockDate({ startDate: `2026-08-${day < 10 ? '0' + day : day}`, endDate: `2026-08-${day < 10 ? '0' + day : day}` });
                        setShowBlockDateForm(true);
                      }}
                      className={`p-3 rounded-2xl font-black text-xs border transition-all cursor-pointer hover:scale-105 ${
                        day >= 19 && day <= 22 ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-50 dark:bg-white/5 border-slate-200 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {day}
                      {day >= 19 && day <= 22 && <p className="text-[9px] text-amber-600 font-normal">Bloqueado</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 6: CUPONES ── */}
          {activeTab === 'cupones' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Cupones y Promociones</h2>
                  <p className="text-xs text-slate-500 font-medium">Gestión de códigos de descuento activos para clientes</p>
                </div>
                <button
                  onClick={() => { setEditingCoupon({ type: 'percentage', value: 15, isActive: true }); setShowCouponForm(true); }}
                  className="px-4 py-2 bg-[#00a896] hover:bg-[#008f80] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> + Crear Nuevo Cupón
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {couponsList.map(c => (
                  <div key={c.id} className={`p-5 rounded-3xl border ${bgCard} flex items-center justify-between`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#00a896]" />
                        <span
                          onClick={() => {
                            navigator.clipboard.writeText(c.code);
                            showToast(`Código ${c.code} copiado`, 'success');
                          }}
                          className="text-lg font-black text-[#00a896] cursor-pointer hover:underline"
                        >
                          {c.code}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">{c.description}</p>
                      <p className="text-[10px] font-black text-emerald-600 uppercase">
                        Descuento: {c.type === 'percentage' ? `${c.value}%` : `$${c.value}`} • Usos: {c.currentUses}/{c.maxUses}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleCoupon(c.id)}
                        className={`px-3 py-1 font-black text-xs rounded-xl cursor-pointer transition-all ${
                          c.isActive ? 'bg-[#00a896]/10 text-[#00a896]' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {c.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                      <button onClick={() => { setEditingCoupon(c); setShowCouponForm(true); }} className="p-1 text-slate-400 hover:text-slate-700">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCoupon(c.id, c.code)} className="p-1 text-rose-400 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 7: CLIENTES CRM ── */}
          {activeTab === 'crm' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Directorio de Clientes CRM</h2>
                  <p className="text-xs text-slate-500 font-medium">Historial y contacto directo con tus clientes</p>
                </div>
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre o teléfono..."
                  value={crmSearch}
                  onChange={e => setCrmSearch(e.target.value)}
                  className="px-3 py-2 border rounded-xl text-xs font-bold bg-white dark:bg-black/40 w-64"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCustomers.map((c, i) => (
                  <div key={i} className={`p-5 rounded-3xl border ${bgCard} flex items-center justify-between`}>
                    <div className="space-y-1">
                      <h4 className="font-black text-base">{c.customerName}</h4>
                      <p className="text-xs text-slate-500 font-bold">📞 {c.customerPhone}</p>
                      <p className="text-[10px] text-[#00a896] font-bold">Reserva: {c.resourceName} (${c.totalPrice})</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <a
                        href={`https://wa.me/${c.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${c.customerName}, un gusto saludarte desde ${business.name}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                      <button
                        onClick={() => {
                          setEditingReservation({ customerName: c.customerName, customerPhone: c.customerPhone, status: 'confirmed' });
                          setShowReservationForm(true);
                        }}
                        className="text-[10px] font-black text-[#00a896] hover:underline cursor-pointer"
                      >
                        + Agendar nueva reserva
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 8: CAJA Y COBROS DIARIOS ── */}
          {activeTab === 'caja' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">Caja Diaria y Registro de Movimientos</h2>
                  <p className="text-xs text-slate-500 font-medium">Control total de ingresos y egresos de tu negocio</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingCash({ type: 'ingreso', method: 'efectivo' }); setShowCashForm(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all">
                    <Plus className="w-4 h-4" /> + Ingreso
                  </button>
                  <button onClick={() => { setEditingCash({ type: 'egreso', method: 'efectivo' }); setShowCashForm(true); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all">
                    <Plus className="w-4 h-4" /> + Egreso
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-5 rounded-3xl border ${bgCard}`}>
                  <p className="text-xs font-black text-slate-400 uppercase">Balance Neto Hoy</p>
                  <h3 className="text-3xl font-black text-emerald-600 mt-1">${netCashBalance}</h3>
                </div>
                <div className={`p-5 rounded-3xl border ${bgCard}`}>
                  <p className="text-xs font-black text-slate-400 uppercase">Ingresos Totales</p>
                  <h3 className="text-3xl font-black text-teal-600 mt-1">+${totalCashIncome}</h3>
                </div>
                <div className={`p-5 rounded-3xl border ${bgCard}`}>
                  <p className="text-xs font-black text-slate-400 uppercase">Egresos / Gastos</p>
                  <h3 className="text-3xl font-black text-rose-500 mt-1">-${totalCashExpense}</h3>
                </div>
                <div className={`p-5 rounded-3xl border ${bgCard}`}>
                  <p className="text-xs font-black text-slate-400 uppercase">Efectivo vs Digital</p>
                  <h3 className="text-xl font-black mt-1">💵 ${cashEfectivo} / 💳 ${cashDigital}</h3>
                </div>
              </div>

              <div className={`p-5 rounded-3xl border ${bgCard} space-y-3`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase text-slate-400">Movimientos de Caja</h3>
                  <div className="flex gap-2">
                    {['todos', 'efectivo', 'transferencia', 'deuna'].map(m => (
                      <button
                        key={m}
                        onClick={() => setCashMethodFilter(m)}
                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase cursor-pointer ${
                          cashMethodFilter === m ? 'bg-[#00a896] text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {filteredCashTransactions.map(t => (
                    <div key={t.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                          t.type === 'ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {t.type === 'ingreso' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="font-bold text-slate-400 mr-2">{t.time}</span>
                          <span className="font-black">{t.concept}</span>
                          <p className="text-[10px] text-slate-400">{t.customerName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={`font-black text-sm ${t.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.type === 'ingreso' ? '+' : '-'}${t.amount}
                          </span>
                          <p className="text-[9px] uppercase font-bold text-slate-500">{t.method}</p>
                        </div>
                        <button onClick={() => handleDeleteCashTx(t.id)} className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 9: ESTADÍSTICAS ── */}
          {activeTab === 'estadisticas' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Estadísticas & Reporte de Rendimiento</h2>
                  <p className="text-xs text-slate-500 font-medium">Métricas de ocupación, conversión e ingresos</p>
                </div>
                <div className="flex gap-2">
                  {(['semana', 'mes', 'trimestre'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setStatsPeriod(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase cursor-pointer transition-all ${
                        statsPeriod === p ? 'bg-[#00a896] text-white shadow-sm' : 'bg-slate-200 dark:bg-white/10 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-6 rounded-3xl border ${bgCard} space-y-3`}>
                  <h4 className="text-sm font-black uppercase text-slate-400">Ocupación Promedio ({statsPeriod})</h4>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00a896] w-3/4 transition-all duration-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-500">75% promedio de disponibilidad reservada</p>
                </div>
                <div className={`p-6 rounded-3xl border ${bgCard} space-y-3`}>
                  <h4 className="text-sm font-black uppercase text-slate-400">Conversión de Reservas</h4>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-4/5 transition-all duration-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-500">80% de consultas convertidas en reservas o turnos confirmados</p>
                </div>
              </div>
            </div>
          )}

        </main>
        </div>
      </div>

      {/* ── MODALS FOR FORMS ── */}

      {/* Modal: Nueva Habitación / Unidad */}
      {showResourceForm && (
        <div className="fixed inset-0 z-[7000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveResource} className={`rounded-3xl p-6 w-full max-w-md space-y-4 ${bgModal}`}>
            <h3 className="text-lg font-black">{editingResource?.id ? 'Editar Habitación' : 'Nueva Habitación / Unidad'}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-black mb-1">Nombre (ej. Cabaña Familiar)</label>
                <input type="text" required value={editingResource?.name || ''} onChange={e => setEditingResource({ ...editingResource, name: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1">Precio ($)</label>
                  <input type="number" required value={editingResource?.price || ''} onChange={e => setEditingResource({ ...editingResource, price: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
                <div>
                  <label className="block font-black mb-1">Capacidad (Huéspedes)</label>
                  <input type="number" value={editingResource?.capacity || 2} onChange={e => setEditingResource({ ...editingResource, capacity: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
              </div>
              <div>
                <label className="block font-black mb-1">Características (separadas por coma)</label>
                <input
                  type="text"
                  placeholder="WiFi, Aire acondicionado, Baño privado"
                  value={Array.isArray(editingResource?.features) ? editingResource?.features.join(', ') : (editingResource?.features || '')}
                  onChange={e => setEditingResource({ ...editingResource, features: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent"
                />
              </div>
              <div>
                <label className="block font-black mb-1">URL de Imagen de la Habitación</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... o URL de la foto"
                  value={editingResource?.imageUrl || ''}
                  onChange={e => setEditingResource({ ...editingResource, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setShowResourceForm(false)} className="px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-xl text-xs font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-[#00a896] text-white rounded-xl text-xs font-black shadow-md cursor-pointer hover:bg-[#008f80]">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Nuevo Turno */}
      {showShiftForm && (
        <div className="fixed inset-0 z-[7000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveShift} className={`rounded-3xl p-6 w-full max-w-md space-y-4 ${bgModal}`}>
            <h3 className="text-lg font-black">{editingShift?.id ? 'Editar Turno' : 'Nuevo Turno de Agenda'}</h3>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1">Hora (ej. 09:30)</label>
                  <input type="text" required value={editingShift.time || '09:30'} onChange={e => setEditingShift({ ...editingShift, time: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
                <div>
                  <label className="block font-black mb-1">Servicio</label>
                  <select
                    value={editingShift.serviceName || services[0]?.name}
                    onChange={e => {
                      const srv = services.find(s => s.name === e.target.value);
                      setEditingShift({
                        ...editingShift,
                        serviceName: e.target.value,
                        price: srv ? srv.price : editingShift.price,
                        durationMin: srv ? srv.durationMin : editingShift.durationMin
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent"
                  >
                    {services.map(s => <option key={s.id} value={s.name}>{s.name} (${s.price})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-black mb-1">Nombre del Cliente</label>
                <input type="text" required placeholder="ej. Juan Pérez" value={editingShift.customerName || ''} onChange={e => setEditingShift({ ...editingShift, customerName: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1">Atendedor / Staff</label>
                  <input type="text" value={editingShift.staffName || 'Barbero: Camila'} onChange={e => setEditingShift({ ...editingShift, staffName: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
                <div>
                  <label className="block font-black mb-1">Precio ($)</label>
                  <input type="number" value={editingShift.price || 5} onChange={e => setEditingShift({ ...editingShift, price: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setShowShiftForm(false)} className="px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-xl text-xs font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-[#1e1e38] text-white rounded-xl text-xs font-black shadow-md cursor-pointer hover:bg-[#2e2e56]">Guardar Turno</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Nuevo Servicio Catalog */}
      {showServiceForm && (
        <div className="fixed inset-0 z-[7000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveService} className={`rounded-3xl p-6 w-full max-w-md space-y-4 ${bgModal}`}>
            <h3 className="text-lg font-black">{editingService?.id ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-black mb-1">Nombre del Servicio (ej. Corte & Barba)</label>
                <input type="text" required value={editingService.name || ''} onChange={e => setEditingService({ ...editingService, name: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1">Duración (minutos)</label>
                  <input type="number" required value={editingService.durationMin || 30} onChange={e => setEditingService({ ...editingService, durationMin: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
                <div>
                  <label className="block font-black mb-1">Precio ($)</label>
                  <input type="number" required value={editingService.price || 10} onChange={e => setEditingService({ ...editingService, price: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setShowServiceForm(false)} className="px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-xl text-xs font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-[#00a896] text-white rounded-xl text-xs font-black shadow-md cursor-pointer hover:bg-[#008f80]">Guardar Servicio</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Nueva Reserva Directa */}
      {showReservationForm && (
        <div className="fixed inset-0 z-[7000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveReservation} className={`rounded-3xl p-6 w-full max-w-md space-y-4 ${bgModal}`}>
            <h3 className="text-lg font-black">{editingReservation?.id ? 'Editar Reserva' : 'Nueva Reserva Directa'}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-black mb-1">Nombre del Cliente</label>
                <input type="text" required value={editingReservation?.customerName || ''} onChange={e => setEditingReservation({ ...editingReservation, customerName: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1">Teléfono WhatsApp</label>
                  <input type="text" required value={editingReservation?.customerPhone || ''} onChange={e => setEditingReservation({ ...editingReservation, customerPhone: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
                <div>
                  <label className="block font-black mb-1">Habitación / Unidad</label>
                  <select
                    value={editingReservation?.resourceName || resources[0]?.name}
                    onChange={e => setEditingReservation({ ...editingReservation, resourceName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent"
                  >
                    {resources.map(r => <option key={r.id} value={r.name}>{r.name} (${r.price})</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1">Fecha Inicio</label>
                  <input type="date" required value={editingReservation?.startDate || '2026-08-20'} onChange={e => setEditingReservation({ ...editingReservation, startDate: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
                <div>
                  <label className="block font-black mb-1">Fecha Fin</label>
                  <input type="date" required value={editingReservation?.endDate || '2026-08-22'} onChange={e => setEditingReservation({ ...editingReservation, endDate: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1">Precio Total ($)</label>
                  <input type="number" required value={editingReservation?.totalPrice || 85} onChange={e => setEditingReservation({ ...editingReservation, totalPrice: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
                <div>
                  <label className="block font-black mb-1">Estado</label>
                  <select value={editingReservation?.status || 'confirmed'} onChange={e => setEditingReservation({ ...editingReservation, status: e.target.value as any })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent">
                    <option value="confirmed">Confirmada</option>
                    <option value="checked_in">Checked In</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setShowReservationForm(false)} className="px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-xl text-xs font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-[#00a896] text-white rounded-xl text-xs font-black shadow-md cursor-pointer hover:bg-[#008f80]">Guardar Reserva</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Bloquear Fechas */}
      {showBlockDateForm && (
        <div className="fixed inset-0 z-[7000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveBlockedDate} className={`rounded-3xl p-6 w-full max-w-md space-y-4 ${bgModal}`}>
            <h3 className="text-lg font-black">Bloquear Fechas / Mantenimiento</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-black mb-1">Motivo o Código (ej. Mantenimiento)</label>
                <input type="text" required value={editingBlockDate.code || 'Mantenimiento'} onChange={e => setEditingBlockDate({ ...editingBlockDate, code: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
              </div>
              <div>
                <label className="block font-black mb-1">Unidad / Habitación</label>
                <select value={editingBlockDate.resourceName || resources[0]?.name} onChange={e => setEditingBlockDate({ ...editingBlockDate, resourceName: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent">
                  <option value="Todas las unidades">Todas las unidades</option>
                  {resources.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1">Desde</label>
                  <input type="date" required value={editingBlockDate.startDate || '2026-08-20'} onChange={e => setEditingBlockDate({ ...editingBlockDate, startDate: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
                <div>
                  <label className="block font-black mb-1">Hasta</label>
                  <input type="date" required value={editingBlockDate.endDate || '2026-08-22'} onChange={e => setEditingBlockDate({ ...editingBlockDate, endDate: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setShowBlockDateForm(false)} className="px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-xl text-xs font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer hover:bg-amber-700">Bloquear Fechas</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Crear / Editar Cupón */}
      {showCouponForm && (
        <div className="fixed inset-0 z-[7000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveCoupon} className={`rounded-3xl p-6 w-full max-w-md space-y-4 ${bgModal}`}>
            <h3 className="text-lg font-black">{editingCoupon?.id ? 'Editar Cupón' : 'Crear Nuevo Cupón'}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-black mb-1">Código del Cupón (ej. VERANO30)</label>
                <input type="text" required value={editingCoupon.code || ''} onChange={e => setEditingCoupon({ ...editingCoupon, code: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold uppercase bg-transparent" />
              </div>
              <div>
                <label className="block font-black mb-1">Descripción</label>
                <input type="text" value={editingCoupon.description || 'Descuento especial de temporada'} onChange={e => setEditingCoupon({ ...editingCoupon, description: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1">Tipo de Descuento</label>
                  <select value={editingCoupon.type || 'percentage'} onChange={e => setEditingCoupon({ ...editingCoupon, type: e.target.value as any })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent">
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed_amount">Monto Fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black mb-1">Valor</label>
                  <input type="number" required value={editingCoupon.value || 15} onChange={e => setEditingCoupon({ ...editingCoupon, value: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setShowCouponForm(false)} className="px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-xl text-xs font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-[#00a896] text-white rounded-xl text-xs font-black shadow-md cursor-pointer hover:bg-[#008f80]">Guardar Cupón</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Registrar Ingreso/Egreso Caja */}
      {showCashForm && (
        <div className="fixed inset-0 z-[7000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveCashTransaction} className={`rounded-3xl p-6 w-full max-w-md space-y-4 ${bgModal}`}>
            <h3 className="text-lg font-black">{editingCash.type === 'egreso' ? 'Registrar Egreso / Gasto' : 'Registrar Ingreso a Caja'}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-black mb-1">Concepto</label>
                <input type="text" required placeholder="ej. Pago Reserva Cabaña #1029" value={editingCash.concept || ''} onChange={e => setEditingCash({ ...editingCash, concept: e.target.value })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1">Monto ($)</label>
                  <input type="number" required value={editingCash.amount || ''} onChange={e => setEditingCash({ ...editingCash, amount: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent" />
                </div>
                <div>
                  <label className="block font-black mb-1">Método de Pago</label>
                  <select value={editingCash.method || 'efectivo'} onChange={e => setEditingCash({ ...editingCash, method: e.target.value as any })} className="w-full px-3 py-2 border rounded-xl font-bold bg-transparent">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="deuna">DeUna</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setShowCashForm(false)} className="px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-xl text-xs font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className={`px-4 py-2 text-white rounded-xl text-xs font-black shadow-md cursor-pointer ${editingCash.type === 'egreso' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {editingCash.type === 'egreso' ? 'Registrar Egreso' : 'Registrar Ingreso'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
