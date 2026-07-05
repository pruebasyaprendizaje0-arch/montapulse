import React, { useState, useEffect } from 'react';
import { X, Lock, CreditCard, Banknote, Sparkles, Plus, Trash2, Check, CheckCircle, Info, CalendarDays, Hotel, Utensils, Edit2, Save, RotateCcw, ChevronDown, ChevronUp, FileText, Phone, Mail, User, Clock, Calendar, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../../firebase.config';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { useAuthContext } from '../../context/AuthContext';
import { OptimizedImageUploader } from '../OptimizedImageUploader';

interface BookingManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
}

type TabType = 'addon' | 'config' | 'inventory' | 'bookings';

export const BookingManagerModal: React.FC<BookingManagerModalProps> = ({ isOpen, onClose, businessId }) => {
    const { user } = useAuthContext();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('addon');
    const [addonStatus, setAddonStatus] = useState<'inactive' | 'pending_approval' | 'active' | 'expired'>('inactive');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [bookingType, setBookingType] = useState<'rooms' | 'tables' | 'appointments'>('rooms');
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [businessName, setBusinessName] = useState('');

    // Bank Account details
    const [bankName, setBankName] = useState('');
    const [accountType, setAccountType] = useState('Ahorros');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [holderId, setHolderId] = useState('');
    const [accountEmail, setAccountEmail] = useState('');

    // Manual Upload Receipt
    const [receiptUrl, setReceiptUrl] = useState('');
    const [submittingManual, setSubmittingManual] = useState(false);

    // Inventories
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    // Forms for inventory add
    const [roomType, setRoomType] = useState('');
    const [roomCapacity, setRoomCapacity] = useState(1);
    const [roomPrice, setRoomPrice] = useState(0);
    const [roomImageUrl, setRoomImageUrl] = useState('');

    const [tableZone, setTableZone] = useState('');
    const [tableIdentifier, setTableIdentifier] = useState('');
    const [tableDiners, setTableDiners] = useState(2);

    const [serviceName, setServiceName] = useState('');
    const [serviceDuration, setServiceDuration] = useState(60);
    const [serviceSpots, setServiceSpots] = useState(5);
    const [servicePrice, setServicePrice] = useState(0);
    const [serviceStaff, setServiceStaff] = useState('');
    const [serviceWorkingDays, setServiceWorkingDays] = useState<string[]>(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']);
    const [serviceStartHour, setServiceStartHour] = useState('08:00');
    const [serviceEndHour, setServiceEndHour] = useState('17:00');

    // Bookings list
    const [bookings, setBookings] = useState<any[]>([]);

    // Per-booking management state
    const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editState, setEditState] = useState<Record<string, any>>({}); // bookingId -> draft fields
    const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
    const [editInvFields, setEditInvFields] = useState<Record<string, any>>({});

    // WhatsApp Reminder Configuration State
    const [whatsappConfigBooking, setWhatsappConfigBooking] = useState<any | null>(null);
    const [includePaymentInfo, setIncludePaymentInfo] = useState(true);
    const [includeCalendarLink, setIncludeCalendarLink] = useState(true);

    // Filters and Weekly Calendar States
    const [bookingFilter, setBookingFilter] = useState<'active' | 'completed' | 'cancelled'>('active');
    const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(today.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    });

    // Custom Rates and Blocks Form States (for Room Inventory Management)
    const [newRateStart, setNewRateStart] = useState('');
    const [newRateEnd, setNewRateEnd] = useState('');
    const [newRatePrice, setNewRatePrice] = useState(0);

    const [newBlockStart, setNewBlockStart] = useState('');
    const [newBlockEnd, setNewBlockEnd] = useState('');
    const [newBlockCapacity, setNewBlockCapacity] = useState(0);

    // Extra Services Config States
    const [extraServicesList, setExtraServicesList] = useState<any[]>([]);
    const [newExtraServiceName, setNewExtraServiceName] = useState('');
    const [newExtraServicePrice, setNewExtraServicePrice] = useState(0);

    // Helpers and computations for filtering and weekly calendar
    const getBookingLocalDateString = (booking: any) => {
        if (!booking.startTime) return '';
        const d = booking.startTime.toDate ? booking.startTime.toDate() : new Date(booking.startTime);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getWeekDays = () => {
        const days = [];
        const current = new Date(currentWeekStart);
        for (let i = 0; i < 7; i++) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    };

    const handlePrevWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() - 7);
        setCurrentWeekStart(newStart);
    };

    const handleNextWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + 7);
        setCurrentWeekStart(newStart);
    };

    const handleGoToToday = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        setCurrentWeekStart(monday);
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setSelectedDateFilter(todayStr);
    };

    const weekDays = getWeekDays();

    const bookingCountsByDate = bookings.reduce((acc: Record<string, number>, booking) => {
        const isMatchFilter = bookingFilter === 'active'
            ? (booking.status === 'pending' || booking.status === 'confirmed' || !booking.status)
            : booking.status === bookingFilter;
        if (isMatchFilter) {
            const dateStr = getBookingLocalDateString(booking);
            if (dateStr) {
                acc[dateStr] = (acc[dateStr] || 0) + 1;
            }
        }
        return acc;
    }, {});

    const filteredBookings = bookings.filter(booking => {
        const matchesStatus = bookingFilter === 'active'
            ? (booking.status === 'pending' || booking.status === 'confirmed' || !booking.status)
            : booking.status === bookingFilter;
        if (!matchesStatus) return false;
        if (selectedDateFilter) {
            return getBookingLocalDateString(booking) === selectedDateFilter;
        }
        return true;
    });

    const sortedFilteredBookings = [...filteredBookings].sort((a, b) => {
        const dateA = a.startTime?.toDate ? a.startTime.toDate() : new Date(a.startTime || 0);
        const dateB = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime || 0);
        return dateA.getTime() - dateB.getTime();
    });

    useEffect(() => {
        if (!isOpen) return;
        loadAddonAndConfig();
    }, [isOpen, businessId]);

    const loadAddonAndConfig = async () => {
        try {
            setLoading(true);
            // 1. Get Addon status
            const addonRef = doc(db, 'booking_addons', businessId);
            const addonSnap = await getDoc(addonRef);
            if (addonSnap.exists()) {
                const data = addonSnap.data();
                setAddonStatus(data.status || 'inactive');
                if (data.expiresAt) {
                    setExpiresAt(data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt));
                }
            } else {
                setAddonStatus('inactive');
                setExpiresAt(null);
            }

            // 2. Get Config
            const configRef = doc(db, 'booking_configs', businessId);
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                const data = configSnap.data();
                setBookingType(data.bookingType || 'rooms');
                setIsEnabled(data.isEnabled || false);
                setBankName(data.bankName || '');
                setAccountType(data.accountType || 'Ahorros');
                setAccountNumber(data.accountNumber || '');
                setAccountHolder(data.accountHolder || '');
                setHolderId(data.holderId || '');
                setAccountEmail(data.accountEmail || '');
                setExtraServicesList(data.extraServices || []);
            }

            // 3. Get Business Name
            const bizRef = doc(db, 'businesses', businessId);
            const bizSnap = await getDoc(bizRef);
            if (bizSnap.exists()) {
                setBusinessName(bizSnap.data().name || '');
            }
        } catch (err) {
            console.error('Error loading config:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load inventories when tab changes to inventory
    useEffect(() => {
        if (!isOpen || activeTab !== 'inventory') return;
        loadInventory();
    }, [activeTab, bookingType]);

    // Load bookings when tab changes to bookings
    useEffect(() => {
        if (!isOpen || activeTab !== 'bookings') return;
        loadBookings();
    }, [activeTab]);

    const loadInventory = async () => {
        try {
            let colName = '';
            if (bookingType === 'rooms') colName = 'room_inventories';
            else if (bookingType === 'tables') colName = 'table_inventories';
            else if (bookingType === 'appointments') colName = 'slot_inventories';

            if (colName) {
                const q = query(collection(db, colName), where('businessId', '==', businessId));
                const snap = await getDocs(q);
                setInventoryItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }
        } catch (err) {
            console.error('Error loading inventory:', err);
        }
    };

    const handleStartEditInventory = (item: any) => {
        setEditingInventoryId(item.id);
        setEditInvFields(item);
    };

    const handleSaveEditInventory = async (item: any) => {
        try {
            let colName = '';
            if (bookingType === 'rooms') colName = 'room_inventories';
            else if (bookingType === 'tables') colName = 'table_inventories';
            else if (bookingType === 'appointments') colName = 'slot_inventories';

            if (colName) {
                const itemRef = doc(db, colName, item.id);
                const { id, ...dataToWrite } = editInvFields;
                await setDoc(itemRef, dataToWrite, { merge: true });
                showToast('Elemento del inventario actualizado.', 'success');
                setEditingInventoryId(null);
                loadInventory();
            }
        } catch (err) {
            showToast('Error al actualizar el elemento.', 'error');
        }
    };

    const loadBookings = async () => {
        try {
            const q = query(collection(db, 'bookings'), where('businessId', '==', businessId));
            const snap = await getDocs(q);
            setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error('Error loading bookings:', err);
        }
    };

    const handleDlocalCheckout = async () => {
        try {
            const response = await fetch('/api/booking-addon/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId, email: user?.email })
            });
            const data = await response.json();
            if (data.success && data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                showToast(data.message || 'Error al conectar con dLocal Go', 'error');
            }
        } catch (err) {
            showToast('Error de comunicación con el servidor', 'error');
        }
    };

    const handleManualPaymentSubmit = async () => {
        if (!receiptUrl) {
            showToast('Por favor sube la foto del comprobante primero.', 'error');
            return;
        }

        setSubmittingManual(true);
        try {
            const addonRef = doc(db, 'booking_addons', businessId);
            await setDoc(addonRef, {
                businessId,
                status: 'pending_approval',
                paymentMethod: 'manual',
                paymentReceiptUrl: receiptUrl,
                updatedAt: new Date()
            }, { merge: true });

            setAddonStatus('pending_approval');
            showToast('Comprobante subido. Esperando aprobación del administrador.', 'success');
        } catch (err) {
            showToast('Error al registrar el pago manual', 'error');
        } finally {
            setSubmittingManual(false);
        }
    };

    const handleUpdateConfig = async () => {
        try {
            const configRef = doc(db, 'booking_configs', businessId);
            await setDoc(configRef, {
                businessId,
                bookingType,
                isEnabled,
                bankName,
                accountType,
                accountNumber,
                accountHolder,
                holderId,
                accountEmail,
                extraServices: extraServicesList,
                updatedAt: new Date()
            }, { merge: true });
            showToast('Configuración guardada.', 'success');
        } catch (err) {
            showToast('Error al guardar configuración.', 'error');
        }
    };

    const handleAddInventory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let colName = '';
            let payload: any = { businessId, createdAt: new Date() };

            if (bookingType === 'rooms') {
                colName = 'room_inventories';
                payload = {
                    ...payload,
                    room_type: roomType,
                    total_capacity: roomCapacity,
                    price_per_night: roomPrice,
                    image_url: roomImageUrl
                };
            } else if (bookingType === 'tables') {
                colName = 'table_inventories';
                payload = {
                    ...payload,
                    zone_name: tableZone,
                    table_identifier: tableIdentifier,
                    max_diners: tableDiners
                };
            } else if (bookingType === 'appointments') {
                colName = 'slot_inventories';
                payload = {
                    ...payload,
                    service_name: serviceName,
                    duration_minutes: serviceDuration,
                    max_spots_per_slot: serviceSpots,
                    price: servicePrice,
                    assigned_staff: serviceStaff,
                    working_days: serviceWorkingDays,
                    work_start_time: serviceStartHour,
                    work_end_time: serviceEndHour
                };
            }

            if (colName) {
                // Add item to local collection
                const itemRef = doc(collection(db, colName));
                await setDoc(itemRef, payload);
                showToast('Elemento agregado al inventario.', 'success');
                // Reset forms
                setRoomType('');
                setRoomImageUrl('');
                setTableZone('');
                setTableIdentifier('');
                setServiceName('');
                setServiceStaff('');
                setServiceWorkingDays(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']);
                setServiceStartHour('08:00');
                setServiceEndHour('17:00');
                loadInventory();
            }
        } catch (err) {
            showToast('Error al agregar al inventario.', 'error');
        }
    };

    const handleDeleteInventory = async (itemId: string) => {
        const confirmDel = window.confirm('¿Deseas eliminar este elemento?');
        if (!confirmDel) return;

        try {
            let colName = '';
            if (bookingType === 'rooms') colName = 'room_inventories';
            else if (bookingType === 'tables') colName = 'table_inventories';
            else if (bookingType === 'appointments') colName = 'slot_inventories';

            if (colName) {
                await deleteDoc(doc(db, colName, itemId));
                showToast('Elemento eliminado.', 'success');
                loadInventory();
            }
        } catch (err) {
            showToast('Error al eliminar elemento.', 'error');
        }
    };

    const handleUpdateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled' | 'completed') => {
        try {
            const bookingRef = doc(db, 'bookings', bookingId);
            await updateDoc(bookingRef, { status, updatedAt: new Date() });
            const msg = status === 'confirmed' ? 'Reserva confirmada con éxito.' : status === 'cancelled' ? 'Reserva cancelada con éxito.' : 'Reserva marcada como terminada.';
            showToast(msg, 'success');
            loadBookings();
        } catch (err) {
            showToast('Error al actualizar estado de reserva.', 'error');
        }
    };

    const handleStartEdit = (booking: any) => {
        setEditingBookingId(booking.id);
        // Pre-fill edit state with current booking values
        const startD = booking.startTime?.toDate ? booking.startTime.toDate() : (booking.startTime ? new Date(booking.startTime) : null);
        const endD = booking.endTime?.toDate ? booking.endTime.toDate() : (booking.endTime ? new Date(booking.endTime) : null);
        const toLocalDateStr = (d: Date | null) => {
            if (!d || isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        };
        const toLocalTimeStr = (d: Date | null) => {
            if (!d || isNaN(d.getTime())) return '';
            return d.toTimeString().substring(0, 5);
        };
        setEditState(prev => ({
            ...prev,
            [booking.id]: {
                clientName: booking.clientName || '',
                clientEmail: booking.clientEmail || '',
                clientPhone: booking.clientPhone || '',
                spotsRequested: booking.spotsRequested || 1,
                notes: booking.notes || '',
                newStartDate: toLocalDateStr(startD),
                newStartTime: booking.bookingType !== 'rooms' ? toLocalTimeStr(startD) : '12:00',
                newEndDate: booking.bookingType === 'rooms' ? toLocalDateStr(endD) : '',
                status: booking.status || 'pending',
            }
        }));
    };

    const handleEditChange = (bookingId: string, field: string, value: any) => {
        setEditState(prev => ({
            ...prev,
            [bookingId]: { ...prev[bookingId], [field]: value }
        }));
    };

    const handleSaveEdit = async (booking: any) => {
        const draft = editState[booking.id];
        if (!draft) return;
        setSavingEdit(true);
        try {
            const updates: Record<string, any> = {
                clientName: draft.clientName,
                clientEmail: draft.clientEmail,
                clientPhone: draft.clientPhone,
                spotsRequested: parseInt(draft.spotsRequested) || 1,
                notes: draft.notes,
                status: draft.status,
                updatedAt: new Date(),
            };
            // Reschedule dates
            if (draft.newStartDate) {
                if (booking.bookingType === 'rooms') {
                    updates.startTime = new Date(`${draft.newStartDate}T12:00:00`);
                    if (draft.newEndDate) updates.endTime = new Date(`${draft.newEndDate}T10:00:00`);
                } else {
                    const timeStr = draft.newStartTime || '09:00';
                    updates.startTime = new Date(`${draft.newStartDate}T${timeStr}:00`);
                    updates.endTime = new Date(`${draft.newStartDate}T${timeStr}:00`);
                }
            }
            const bookingRef = doc(db, 'bookings', booking.id);
            await updateDoc(bookingRef, updates);
            showToast('Reserva actualizada con éxito.', 'success');
            setEditingBookingId(null);
            loadBookings();
        } catch (err) {
            showToast('Error al guardar cambios.', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteBooking = async (bookingId: string) => {
        const confirmed = window.confirm('¿Estás seguro de eliminar esta reserva? Esta acción no se puede deshacer.');
        if (!confirmed) return;
        try {
            await deleteDoc(doc(db, 'bookings', bookingId));
            showToast('Reserva eliminada.', 'success');
            if (expandedBookingId === bookingId) setExpandedBookingId(null);
            if (editingBookingId === bookingId) setEditingBookingId(null);
            loadBookings();
        } catch (err) {
            showToast('Error al eliminar la reserva.', 'error');
        }
    };

    const formatBookingDate = (dateField: any) => {
        if (!dateField) return 'No especificada';
        const d = dateField.toDate ? dateField.toDate() : new Date(dateField);
        return isNaN(d.getTime()) ? 'Fecha inválida' : d.toLocaleString('es-EC', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const generateCalendarLink = (booking: any) => {
        const typeLabel = booking.bookingType === 'rooms' ? 'Reserva de Alojamiento'
            : booking.bookingType === 'tables' ? 'Reserva de Mesa'
                : `Cita: ${booking.reservedItemName || 'Servicio'}`;
        const title = `${typeLabel} - ${businessName || 'MontaPulse'}`;

        const startDate = booking.startTime?.toDate ? booking.startTime.toDate() : new Date(booking.startTime);
        let endDate = booking.endTime?.toDate ? booking.endTime.toDate() : (booking.endTime ? new Date(booking.endTime) : null);

        if (!endDate || isNaN(endDate.getTime())) {
            endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
        }

        const toUTCString = (date: Date) => {
            try {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            } catch (e) {
                return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            }
        };

        const dates = `${toUTCString(startDate)}/${toUTCString(endDate)}`;

        const details = `Hola ${booking.clientName}, aquí tienes tu confirmación de reserva.\n\nDetalles:\n- Tipo: ${booking.bookingType === 'rooms' ? 'Alojamiento' : booking.bookingType === 'tables' ? 'Mesa/Restaurante' : 'Cita/Servicio'}\n- Detalle: ${booking.reservedItemName || 'N/A'}\n- Organizado por: ${businessName || 'MontaPulse'}`;

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}`;
    };

    const handleWhatsAppReminder = (booking: any) => {
        setWhatsappConfigBooking(booking);
        setIncludePaymentInfo(!!(bankName && accountNumber));
        setIncludeCalendarLink(true);
    };

    const executeWhatsAppSend = (booking: any, incPayment: boolean, incCalendar: boolean) => {
        const phone = booking.clientPhone.replace(/\D/g, ''); // keep only numbers
        const formattedPhone = phone.startsWith('0') ? '593' + phone.substring(1) : phone;

        const dateStr = formatBookingDate(booking.startTime);
        const typeLabel = booking.bookingType === 'rooms' ? 'Habitación/Alojamiento'
            : booking.bookingType === 'tables' ? 'Mesa/Restaurante'
                : 'Cita/Servicio';

        let detailStr = '';
        if (booking.bookingType === 'rooms') {
            detailStr = `Check-in: ${dateStr}\nCheck-out: ${formatBookingDate(booking.endTime)}\nHabitaciones: ${booking.spotsRequested}`;
        } else if (booking.bookingType === 'tables') {
            detailStr = `Fecha/Hora: ${dateStr}\nPersonas: ${booking.spotsRequested}`;
        } else {
            detailStr = `Fecha/Turno: ${dateStr}\nCupos: ${booking.spotsRequested}`;
        }

        let bankPaymentStr = '';
        if (incPayment && bankName && accountNumber) {
            bankPaymentStr = `\n\n*Datos de pago para confirmar su reserva:*\n- *Banco:* ${bankName}\n- *Tipo:* ${accountType || 'Ahorros'}\n- *Cuenta:* ${accountNumber}\n- *Titular:* ${accountHolder}\n${holderId ? `- *CI/RUC:* ${holderId}\n` : ''}${accountEmail ? `- *Email:* ${accountEmail}\n` : ''}\nPor favor, realice la transferencia y envíe el comprobante de pago por este medio para confirmar y registrar su reserva.`;
        }

        let calendarStr = '';
        if (incCalendar) {
            const calUrl = generateCalendarLink(booking);
            calendarStr = `\n\n*Añadir a tu calendario:*\n${calUrl}`;
        }

        const message = `Hola ${booking.clientName},\n\nTe escribimos de parte de *${businessName || 'ubicame.info'}* para recordarte tu reserva:\n\n*Tipo:* ${typeLabel}\n*Detalles:*\n${detailStr}\n*Estado:* ${booking.status.toUpperCase()}${bankPaymentStr}${calendarStr}\n\n¡Te esperamos!`;

        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
        setWhatsappConfigBooking(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[4000] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-slate-900 rounded-t-[3.5rem] sm:rounded-[3rem] border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[90vh] text-left">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            <CalendarDays className="w-6 h-6 text-orange-500" />
                            Módulo de Reservas
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configuración y Administración</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors group">
                        <X className="w-6 h-6 text-slate-400 group-hover:text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-white/5 pb-3 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('addon')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'addon' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                    >
                        Suscripción Add-on
                    </button>
                    {addonStatus === 'active' && (
                        <>
                            <button
                                onClick={() => setActiveTab('config')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'config' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                            >
                                Configuración
                            </button>
                            <button
                                onClick={() => setActiveTab('inventory')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'inventory' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                            >
                                Inventario
                            </button>
                            <button
                                onClick={() => setActiveTab('bookings')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'bookings' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
                            >
                                Reservas Recibidas
                            </button>
                        </>
                    )}
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                    {loading ? (
                        <div className="py-12 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'addon' && (
                                <div className="space-y-6">
                                    <div className="p-6 bg-slate-800/40 border border-white/5 rounded-3xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-white">Botón de Reservas Personalizado</h3>
                                                <p className="text-xs text-slate-400 mt-1">Habilita reservas dinámicas en tu perfil por solo $5/mes.</p>
                                            </div>
                                            <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-2xl text-xs font-black uppercase tracking-widest">
                                                $5.00 / mes
                                            </div>
                                        </div>

                                        <div className="border-t border-white/5 pt-4">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Estado del Add-on:</span>
                                            {addonStatus === 'active' ? (
                                                <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                                                    <CheckCircle className="w-5 h-5" />
                                                    ACTIVO (Vence el {expiresAt?.toLocaleDateString()})
                                                </div>
                                            ) : addonStatus === 'pending_approval' ? (
                                                <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                                                    <Info className="w-5 h-5 animate-pulse" />
                                                    PENDIENTE DE APROBACIÓN MANUAL
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-400 font-black text-sm">
                                                    <Lock className="w-5 h-5" />
                                                    INACTIVO
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {addonStatus !== 'active' && addonStatus !== 'pending_approval' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Automatic Checkout */}
                                            <div className="p-5 bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-white/5 rounded-3xl space-y-4 text-center">
                                                <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center mx-auto">
                                                    <CreditCard className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Pago Automático</h4>
                                                    <p className="text-[10px] text-slate-400 mt-1">Activa al instante usando tarjetas o métodos locales en Ecuador vía dLocal Go.</p>
                                                </div>
                                                <button
                                                    onClick={handleDlocalCheckout}
                                                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
                                                >
                                                    Pagar con dLocal Go
                                                </button>
                                            </div>

                                            {/* Manual Bank Transfer */}
                                            <div className="p-5 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-white/5 rounded-3xl space-y-4 text-center">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mx-auto">
                                                    <Banknote className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Transferencia Manual</h4>
                                                    <p className="text-[10px] text-slate-400 mt-1">Realiza tu transferencia y sube el comprobante de pago para aprobación del admin.</p>
                                                </div>
                                                <div className="space-y-3">
                                                    <OptimizedImageUploader
                                                        onImageProcessed={(url) => setReceiptUrl(url)}
                                                        path={`uploads/${user?.id || 'anonymous'}/receipts`}
                                                        className="h-24"
                                                    />
                                                    <button
                                                        onClick={handleManualPaymentSubmit}
                                                        disabled={submittingManual}
                                                        className="w-full py-3 bg-slate-800 text-slate-200 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all"
                                                    >
                                                        {submittingManual ? 'Subiendo...' : 'Enviar Comprobante'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'config' && (
                                <div className="space-y-6">
                                    <div className="p-6 bg-slate-800/40 border border-white/5 rounded-3xl space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Giro Comercial (Tipo de Reserva)</label>
                                            <select
                                                value={bookingType}
                                                onChange={(e) => setBookingType(e.target.value as any)}
                                                className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white"
                                            >
                                                <option value="rooms">Habitaciones / Alojamiento</option>
                                                <option value="tables">Mesas / Restaurante</option>
                                                <option value="appointments">Turnos / Citas / Actividades</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                                            <div>
                                                <h4 className="text-sm font-black text-white">Habilitar Reservas</h4>
                                                <p className="text-[10px] text-slate-500">Muestra u oculta el botón de reservas en tu perfil público.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsEnabled(!isEnabled)}
                                                className={`w-12 h-6 rounded-full transition-all relative ${isEnabled ? 'bg-orange-500' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${isEnabled ? 'left-[calc(100%-1.35rem)]' : 'left-0.5'}`} />
                                            </button>
                                        </div>

                                        <div className="border-t border-white/5 pt-6 space-y-4">
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-wider">Datos de Cuenta Bancaria</h4>
                                                <p className="text-[10px] text-slate-500 mt-1">Configura una cuenta para que tus clientes puedan realizar pagos o transferencias directas para sus reservas.</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Banco</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: Banco Pichincha"
                                                        value={bankName}
                                                        onChange={(e) => setBankName(e.target.value)}
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-orange-500/50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Tipo de Cuenta</label>
                                                    <select
                                                        value={accountType}
                                                        onChange={(e) => setAccountType(e.target.value)}
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-orange-500/50"
                                                    >
                                                        <option value="Ahorros">Ahorros</option>
                                                        <option value="Corriente">Corriente</option>
                                                        <option value="Virtual / Digital">Virtual / Digital</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Número de Cuenta</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: 2201234567"
                                                        value={accountNumber}
                                                        onChange={(e) => setAccountNumber(e.target.value)}
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-orange-500/50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Titular de la Cuenta</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Nombre del beneficiario"
                                                        value={accountHolder}
                                                        onChange={(e) => setAccountHolder(e.target.value)}
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-orange-500/50"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Identificación (C.I. / RUC)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: 1712345678"
                                                        value={holderId}
                                                        onChange={(e) => setHolderId(e.target.value)}
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-orange-500/50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Email de Notificación</label>
                                                    <input
                                                        type="email"
                                                        placeholder="Ej: pagos@negocio.com"
                                                        value={accountEmail}
                                                        onChange={(e) => setAccountEmail(e.target.value)}
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-orange-500/50"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Servicios Adicionales Section */}
                                        <div className="border-t border-white/5 pt-6 space-y-4">
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-wider">Servicios Adicionales</h4>
                                                <p className="text-[10px] text-slate-500 mt-1">Configura los servicios extras que tus clientes pueden añadir a sus reservas (desayuno, wifi, traslados, etc.).</p>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3 items-end">
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Nombre del Servicio</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: Desayuno Buffet"
                                                        value={newExtraServiceName}
                                                        onChange={(e) => setNewExtraServiceName(e.target.value)}
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-orange-500/50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Precio ($)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={newExtraServicePrice || ''}
                                                        onChange={(e) => setNewExtraServicePrice(parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-orange-500/50"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!newExtraServiceName.trim()) {
                                                        showToast('Por favor escribe el nombre del servicio.', 'error');
                                                        return;
                                                    }
                                                    const updated = [...extraServicesList, {
                                                        id: Math.random().toString(36).substring(7),
                                                        name: newExtraServiceName.trim(),
                                                        price: newExtraServicePrice
                                                    }];
                                                    setExtraServicesList(updated);
                                                    setNewExtraServiceName('');
                                                    setNewExtraServicePrice(0);
                                                    showToast('Servicio añadido a la lista temporal. Haz clic en "Guardar Configuración" para persistir.', 'info');
                                                }}
                                                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                            >
                                                Agregar Servicio
                                            </button>

                                            {extraServicesList.length > 0 && (
                                                <div className="space-y-2 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                                                    {extraServicesList.map((service) => (
                                                        <div key={service.id} className="flex justify-between items-center text-xs text-slate-300">
                                                             <span>{service.name} &middot; <strong className="text-orange-400">${service.price.toFixed(2)}</strong></span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = extraServicesList.filter((s) => s.id !== service.id);
                                                                    setExtraServicesList(updated);
                                                                    showToast('Servicio removido. Recuerda guardar la configuración.', 'info');
                                                                }}
                                                                className="text-red-500 hover:text-red-400 text-[10px] font-bold"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleUpdateConfig}
                                            className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs"
                                        >
                                            Guardar Configuración
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'inventory' && (
                                <div className="space-y-6">
                                    {/* Add inventory item form */}
                                    <form onSubmit={handleAddInventory} className="p-6 bg-slate-800/40 border border-white/5 rounded-3xl space-y-4">
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                            Agregar Nuevo {bookingType === 'rooms' ? 'Tipo de Habitación' : bookingType === 'tables' ? 'Mesa / Zona' : 'Servicio / Clase'}
                                        </h3>

                                        {bookingType === 'rooms' && (
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Nombre de la Habitación (Ej: Suite Premium)"
                                                    value={roomType}
                                                    onChange={(e) => setRoomType(e.target.value)}
                                                    required
                                                    className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white"
                                                />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="number"
                                                        placeholder="Capacidad total de inventario"
                                                        value={roomCapacity}
                                                        onChange={(e) => setRoomCapacity(parseInt(e.target.value) || 1)}
                                                        required
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Precio por noche ($ USD)"
                                                        value={roomPrice}
                                                        onChange={(e) => setRoomPrice(parseFloat(e.target.value) || 0)}
                                                        required
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider text-left block">Imagen de la Habitación</label>
                                                    <OptimizedImageUploader
                                                        onImageProcessed={(url) => setRoomImageUrl(url)}
                                                        currentImageUrl={roomImageUrl}
                                                        path={`uploads/${user?.id || 'anonymous'}/rooms`}
                                                        className="h-20"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {bookingType === 'tables' && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Zona (Ej: Terraza)"
                                                        value={tableZone}
                                                        onChange={(e) => setTableZone(e.target.value)}
                                                        required
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Identificador (Ej: Mesa 4)"
                                                        value={tableIdentifier}
                                                        onChange={(e) => setTableIdentifier(e.target.value)}
                                                        required
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white"
                                                    />
                                                </div>
                                                <input
                                                    type="number"
                                                    placeholder="Max Comensales"
                                                    value={tableDiners}
                                                    onChange={(e) => setTableDiners(parseInt(e.target.value) || 2)}
                                                    required
                                                    className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white"
                                                />
                                            </div>
                                        )}

                                        {bookingType === 'appointments' && (
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Nombre del Servicio o Actividad (Ej: Clase de Surf Grupal)"
                                                    value={serviceName}
                                                    onChange={(e) => setServiceName(e.target.value)}
                                                    required
                                                    className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white"
                                                />
                                                <div className="grid grid-cols-3 gap-3">
                                                    <input
                                                        type="number"
                                                        placeholder="Duración (minutos)"
                                                        value={serviceDuration}
                                                        onChange={(e) => setServiceDuration(parseInt(e.target.value) || 60)}
                                                        required
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Cupos / Turno"
                                                        value={serviceSpots}
                                                        onChange={(e) => setServiceSpots(parseInt(e.target.value) || 5)}
                                                        required
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Precio ($)"
                                                        value={servicePrice}
                                                        onChange={(e) => setServicePrice(parseFloat(e.target.value) || 0)}
                                                        required
                                                        className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Agregar Item
                                        </button>
                                    </form>

                                    {/* Inventory list */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Inventario Registrado</h3>
                                        {inventoryItems.length === 0 ? (
                                            <p className="text-xs text-slate-600">No hay elementos en tu inventario. Crea uno arriba.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {inventoryItems.map((item) => (
                                                    <div key={item.id} className="p-4 bg-slate-800/40 border border-white/5 rounded-2xl flex flex-col gap-3">
                                                        {editingInventoryId === item.id ? (
                                                            <div className="space-y-3">
                                                                {bookingType === 'rooms' && (
                                                                    <div className="space-y-4 text-left">
                                                                        <div className="space-y-2">
                                                                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Nombre de la Habitación</label>
                                                                            <input
                                                                                type="text"
                                                                                value={editInvFields.room_type || ''}
                                                                                onChange={e => setEditInvFields({ ...editInvFields, room_type: e.target.value })}
                                                                                className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div>
                                                                                <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Habitaciones Totales</label>
                                                                                <input
                                                                                    type="number"
                                                                                    value={editInvFields.total_capacity || 0}
                                                                                    onChange={e => setEditInvFields({ ...editInvFields, total_capacity: parseInt(e.target.value) || 0 })}
                                                                                    className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Precio base ($/noche)</label>
                                                                                <input
                                                                                    type="number"
                                                                                    value={editInvFields.price_per_night || 0}
                                                                                    onChange={e => setEditInvFields({ ...editInvFields, price_per_night: parseFloat(e.target.value) || 0 })}
                                                                                    className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Imagen de la Habitación</label>
                                                                            <OptimizedImageUploader
                                                                                onImageProcessed={(url) => setEditInvFields({ ...editInvFields, image_url: url })}
                                                                                currentImageUrl={editInvFields.image_url || ''}
                                                                                path={`uploads/${user?.id || 'anonymous'}/rooms`}
                                                                                className="h-20"
                                                                            />
                                                                        </div>

                                                                        {/* Custom Rates Management Section */}
                                                                        <div className="border-t border-white/5 pt-3 space-y-2">
                                                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Gestión de Tarifas Especiales</span>
                                                                            <div className="grid grid-cols-3 gap-2">
                                                                                <div>
                                                                                    <label className="text-[7px] font-bold uppercase text-slate-500 block mb-0.5">Desde</label>
                                                                                    <input
                                                                                        type="date"
                                                                                        value={newRateStart}
                                                                                        onChange={e => setNewRateStart(e.target.value)}
                                                                                        className="bg-slate-850 border border-white/5 rounded-xl p-1.5 text-[9px] text-white outline-none w-full"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[7px] font-bold uppercase text-slate-500 block mb-0.5">Hasta</label>
                                                                                    <input
                                                                                        type="date"
                                                                                        value={newRateEnd}
                                                                                        onChange={e => setNewRateEnd(e.target.value)}
                                                                                        className="bg-slate-850 border border-white/5 rounded-xl p-1.5 text-[9px] text-white outline-none w-full"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[7px] font-bold uppercase text-slate-500 block mb-0.5">Precio ($)</label>
                                                                                    <input
                                                                                        type="number"
                                                                                        placeholder="Tarifa"
                                                                                        value={newRatePrice || ''}
                                                                                        onChange={e => setNewRatePrice(parseFloat(e.target.value) || 0)}
                                                                                        className="bg-slate-850 border border-white/5 rounded-xl p-1.5 text-[9px] text-white outline-none w-full"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (!newRateStart || !newRateEnd || newRatePrice <= 0) return;
                                                                                    const currentRates = editInvFields.custom_rates || [];
                                                                                    const updated = [...currentRates, {
                                                                                        id: Math.random().toString(36).substring(7),
                                                                                        start: newRateStart,
                                                                                        end: newRateEnd,
                                                                                        price: newRatePrice
                                                                                    }];
                                                                                    setEditInvFields({ ...editInvFields, custom_rates: updated });
                                                                                    setNewRateStart('');
                                                                                    setNewRateEnd('');
                                                                                    setNewRatePrice(0);
                                                                                }}
                                                                                className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                                                                            >
                                                                                Agregar Tarifa
                                                                            </button>

                                                                            {/* Custom Rates List */}
                                                                            {editInvFields.custom_rates && editInvFields.custom_rates.length > 0 && (
                                                                                <div className="space-y-1 mt-1 bg-slate-900/40 p-2 rounded-xl border border-white/5 max-h-24 overflow-y-auto">
                                                                                    {editInvFields.custom_rates.map((rate: any) => (
                                                                                        <div key={rate.id} className="flex justify-between items-center text-[9px] text-slate-300">
                                                                                            <span>Del {rate.start} al {rate.end} &middot; <strong className="text-orange-400">${rate.price}/noche</strong></span>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    const updated = editInvFields.custom_rates.filter((r: any) => r.id !== rate.id);
                                                                                                    setEditInvFields({ ...editInvFields, custom_rates: updated });
                                                                                                }}
                                                                                                className="text-red-500 hover:text-red-400 font-bold ml-2"
                                                                                            >
                                                                                                Eliminar
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Blocked Dates/Rooms Management Section */}
                                                                        <div className="border-t border-white/5 pt-3 space-y-2">
                                                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Bloquear Fechas y Habitaciones</span>
                                                                            <div className="grid grid-cols-3 gap-2">
                                                                                <div>
                                                                                    <label className="text-[7px] font-bold uppercase text-slate-500 block mb-0.5">Desde</label>
                                                                                    <input
                                                                                        type="date"
                                                                                        value={newBlockStart}
                                                                                        onChange={e => setNewBlockStart(e.target.value)}
                                                                                        className="bg-slate-850 border border-white/5 rounded-xl p-1.5 text-[9px] text-white outline-none w-full"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[7px] font-bold uppercase text-slate-500 block mb-0.5">Hasta</label>
                                                                                    <input
                                                                                        type="date"
                                                                                        value={newBlockEnd}
                                                                                        onChange={e => setNewBlockEnd(e.target.value)}
                                                                                        className="bg-slate-850 border border-white/5 rounded-xl p-1.5 text-[9px] text-white outline-none w-full"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[7px] font-bold uppercase text-slate-500 block mb-0.5">Cupos Libres</label>
                                                                                    <input
                                                                                        type="number"
                                                                                        placeholder="0 = Bloqueado"
                                                                                        value={newBlockCapacity}
                                                                                        onChange={e => setNewBlockCapacity(parseInt(e.target.value) || 0)}
                                                                                        className="bg-slate-850 border border-white/5 rounded-xl p-1.5 text-[9px] text-white outline-none w-full"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-[8px] text-slate-500 leading-normal">"Cupos Libres" indica cuántas habitaciones quedan disponibles en ese período (0 = Bloqueo total).</p>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (!newBlockStart || !newBlockEnd) return;
                                                                                    const currentBlocks = editInvFields.blocked_dates || [];
                                                                                    const updated = [...currentBlocks, {
                                                                                        id: Math.random().toString(36).substring(7),
                                                                                        start: newBlockStart,
                                                                                        end: newBlockEnd,
                                                                                        capacity: newBlockCapacity
                                                                                    }];
                                                                                    setEditInvFields({ ...editInvFields, blocked_dates: updated });
                                                                                    setNewBlockStart('');
                                                                                    setNewBlockEnd('');
                                                                                    setNewBlockCapacity(0);
                                                                                }}
                                                                                className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                                                                            >
                                                                                Agregar Bloqueo
                                                                            </button>

                                                                            {/* Blocked Dates List */}
                                                                            {editInvFields.blocked_dates && editInvFields.blocked_dates.length > 0 && (
                                                                                <div className="space-y-1 mt-1 bg-slate-900/40 p-2 rounded-xl border border-white/5 max-h-24 overflow-y-auto">
                                                                                    {editInvFields.blocked_dates.map((block: any) => (
                                                                                        <div key={block.id} className="flex justify-between items-center text-[9px] text-slate-300">
                                                                                            <span>Del {block.start} al {block.end} &middot; <strong className="text-orange-400">{block.capacity === 0 ? 'Bloqueo Total' : `Disponibles: ${block.capacity}`}</strong></span>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    const updated = editInvFields.blocked_dates.filter((b: any) => b.id !== block.id);
                                                                                                    setEditInvFields({ ...editInvFields, blocked_dates: updated });
                                                                                                }}
                                                                                                className="text-red-500 hover:text-red-400 font-bold ml-2"
                                                                                            >
                                                                                                Eliminar
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {bookingType === 'tables' && (
                                                                    <div className="space-y-2 text-left">
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={editInvFields.zone_name || ''}
                                                                                onChange={e => setEditInvFields({ ...editInvFields, zone_name: e.target.value })}
                                                                                className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                value={editInvFields.table_identifier || ''}
                                                                                onChange={e => setEditInvFields({ ...editInvFields, table_identifier: e.target.value })}
                                                                                className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                            />
                                                                        </div>
                                                                        <input
                                                                            type="number"
                                                                            value={editInvFields.max_diners || 0}
                                                                            onChange={e => setEditInvFields({ ...editInvFields, max_diners: parseInt(e.target.value) || 0 })}
                                                                            className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                        />
                                                                    </div>
                                                                )}
                                                                {bookingType === 'appointments' && (
                                                                    <div className="space-y-2 text-left">
                                                                        <input
                                                                            type="text"
                                                                            value={editInvFields.service_name || ''}
                                                                            onChange={e => setEditInvFields({ ...editInvFields, service_name: e.target.value })}
                                                                            className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                        />
                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            <input
                                                                                type="number"
                                                                                value={editInvFields.duration_minutes || 0}
                                                                                onChange={e => setEditInvFields({ ...editInvFields, duration_minutes: parseInt(e.target.value) || 0 })}
                                                                                className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                            />
                                                                            <input
                                                                                type="number"
                                                                                value={editInvFields.max_spots_per_slot || 0}
                                                                                onChange={e => setEditInvFields({ ...editInvFields, max_spots_per_slot: parseInt(e.target.value) || 0 })}
                                                                                className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                            />
                                                                            <input
                                                                                type="number"
                                                                                value={editInvFields.price || 0}
                                                                                onChange={e => setEditInvFields({ ...editInvFields, price: parseFloat(e.target.value) || 0 })}
                                                                                className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                            />
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Profesional / Personal asignado (Opcional)"
                                                                            value={editInvFields.assigned_staff || ''}
                                                                            onChange={e => setEditInvFields({ ...editInvFields, assigned_staff: e.target.value })}
                                                                            className="w-full bg-slate-850 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none"
                                                                        />
                                                                        <div className="space-y-1">
                                                                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Días laborables</label>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((day) => {
                                                                                    const currentDays: string[] = editInvFields.working_days || [];
                                                                                    const isChecked = currentDays.includes(day);
                                                                                    return (
                                                                                        <button
                                                                                            type="button"
                                                                                            key={day}
                                                                                            onClick={() => {
                                                                                                const updated = isChecked
                                                                                                    ? currentDays.filter(d => d !== day)
                                                                                                    : [...currentDays, day];
                                                                                                setEditInvFields({ ...editInvFields, working_days: updated });
                                                                                            }}
                                                                                            className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${isChecked ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20' : 'bg-slate-800 text-slate-400 border-white/5'}`}
                                                                                        >
                                                                                            {day.substring(0, 3)}
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div>
                                                                                <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Hora Inicio</label>
                                                                                <input
                                                                                    type="time"
                                                                                    value={editInvFields.work_start_time || '08:00'}
                                                                                    onChange={e => setEditInvFields({ ...editInvFields, work_start_time: e.target.value })}
                                                                                    className="w-full bg-slate-850 border border-white/5 rounded-xl py-1 px-2 text-xs text-white outline-none"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Hora Fin</label>
                                                                                <input
                                                                                    type="time"
                                                                                    value={editInvFields.work_end_time || '17:00'}
                                                                                    onChange={e => setEditInvFields({ ...editInvFields, work_end_time: e.target.value })}
                                                                                    className="w-full bg-slate-850 border border-white/5 rounded-xl py-1 px-2 text-xs text-white outline-none"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleSaveEditInventory(item)}
                                                                        className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 hover:shadow-lg transition-all"
                                                                    >
                                                                        <Save className="w-3.5 h-3.5" /> Guardar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingInventoryId(null)}
                                                                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between w-full">
                                                                <div>
                                                                    {bookingType === 'rooms' && (
                                                                        <div className="flex items-center gap-3">
                                                                            {item.image_url && (
                                                                                <img
                                                                                    src={item.image_url}
                                                                                    alt={item.room_type}
                                                                                    className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                                                                                />
                                                                            )}
                                                                            <div className="text-left">
                                                                                <p className="text-xs font-bold text-white">{item.room_type}</p>
                                                                                <p className="text-[10px] text-slate-500 mt-0.5">Inventario: {item.total_capacity} habitaciones · ${item.price_per_night}/noche</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {bookingType === 'tables' && (
                                                                        <div className="text-left">
                                                                            <p className="text-xs font-bold text-white">{item.table_identifier}</p>
                                                                            <p className="text-[10px] text-slate-500 mt-0.5">Zona: {item.zone_name} · Max {item.max_diners} personas</p>
                                                                        </div>
                                                                    )}
                                                                    {bookingType === 'appointments' && (
                                                                        <div className="text-left">
                                                                            <p className="text-xs font-bold text-white">{item.service_name}</p>
                                                                            <p className="text-[10px] text-slate-500 mt-0.5">Duración: {item.duration_minutes} min · Cupos: {item.max_spots_per_slot} · ${item.price}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-1 shrink-0">
                                                                    <button
                                                                        onClick={() => handleStartEditInventory(item)}
                                                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteInventory(item.id)}
                                                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'bookings' && (
                                <div className="space-y-4 text-left">
                                    {/* Segmented Controls for Sub-tabs */}
                                    <div className="flex gap-2 p-1 bg-slate-950/40 rounded-2xl border border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBookingFilter('active');
                                                setSelectedDateFilter(null);
                                            }}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${bookingFilter === 'active' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            Activas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBookingFilter('completed');
                                                setSelectedDateFilter(null);
                                            }}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${bookingFilter === 'completed' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            Terminadas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBookingFilter('cancelled');
                                                setSelectedDateFilter(null);
                                            }}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${bookingFilter === 'cancelled' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            Canceladas
                                        </button>
                                    </div>

                                    {/* Weekly Calendar Component */}
                                    <div className="bg-slate-800/20 border border-white/5 p-4 rounded-3xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Calendario Semanal</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleGoToToday}
                                                    type="button"
                                                    className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-bold text-slate-300 transition-all"
                                                >
                                                    Hoy
                                                </button>
                                                <div className="flex border border-white/5 bg-slate-950/20 rounded-xl overflow-hidden">
                                                    <button type="button" onClick={handlePrevWeek} className="p-1.5 hover:bg-white/5 transition-colors">
                                                        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                                                    </button>
                                                    <button type="button" onClick={handleNextWeek} className="p-1.5 hover:bg-white/5 transition-colors">
                                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-7 gap-1">
                                            {weekDays.map((day, idx) => {
                                                const year = day.getFullYear();
                                                const month = String(day.getMonth() + 1).padStart(2, '0');
                                                const dateNum = String(day.getDate()).padStart(2, '0');
                                                const dateStr = `${year}-${month}-${dateNum}`;
                                                
                                                const isSelected = selectedDateFilter === dateStr;
                                                const isToday = new Date().toDateString() === day.toDateString();
                                                const count = bookingCountsByDate[dateStr] || 0;
                                                
                                                // Short name of day in Spanish
                                                const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                                                const dayName = dayNames[day.getDay()];

                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setSelectedDateFilter(isSelected ? null : dateStr)}
                                                        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative border ${isSelected ? 'bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-md shadow-orange-500/5' : 'bg-slate-950/20 border-white/5 hover:bg-white/5 text-slate-400'}`}
                                                    >
                                                        <span className="text-[8px] uppercase font-black opacity-60">{dayName}</span>
                                                        <span className={`text-xs font-black mt-1 ${isToday && !isSelected ? 'text-orange-500' : ''}`}>{day.getDate()}</span>
                                                        
                                                        {/* Booking Count indicator */}
                                                        {count > 0 && (
                                                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-[9px] font-black text-white flex items-center justify-center border border-slate-900 shadow-sm animate-scaleIn">
                                                                {count}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        
                                        {selectedDateFilter && (
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 bg-slate-950/20 px-3 py-2 rounded-xl">
                                                <span>Filtrado por fecha: <strong>{new Date(`${selectedDateFilter}T12:00:00`).toLocaleDateString('es-EC', { dateStyle: 'medium' })}</strong></span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedDateFilter(null)}
                                                    className="font-bold text-orange-400 hover:underline"
                                                >
                                                    Mostrar todas
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                                            {bookingFilter === 'active' ? 'Reservas Activas' : bookingFilter === 'completed' ? 'Historial de Reservas Terminadas' : 'Reservas Canceladas'}
                                        </h3>
                                        <span className="text-[10px] text-slate-600 font-bold">
                                            {filteredBookings.length} de {bookings.filter(b => bookingFilter === 'active' ? (b.status === 'pending' || b.status === 'confirmed' || !b.status) : b.status === bookingFilter).length}
                                        </span>
                                    </div>

                                    {sortedFilteredBookings.length === 0 ? (
                                        <div className="py-10 text-center bg-slate-800/10 border border-white/5 rounded-3xl">
                                            <CalendarDays className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                            <p className="text-xs text-slate-600">No hay reservas para mostrar con los filtros seleccionados.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {sortedFilteredBookings.map((booking) => {
                                                const isExpanded = expandedBookingId === booking.id;
                                                const isEditing = editingBookingId === booking.id;
                                                const draft = editState[booking.id] || {};
                                                const statusColor = booking.status === 'confirmed'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : booking.status === 'completed'
                                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        : booking.status === 'cancelled'
                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                                                return (
                                                    <div key={booking.id} className={`bg-slate-800/40 border rounded-3xl overflow-hidden transition-all duration-300 ${isEditing ? 'border-orange-500/40 shadow-lg shadow-orange-500/5' : 'border-white/5 hover:border-white/10'}`}>
                                                        {/* Card Header — always visible */}
                                                        <div
                                                            className="p-4 cursor-pointer select-none"
                                                            onClick={() => {
                                                                if (isEditing) return;
                                                                setExpandedBookingId(isExpanded ? null : booking.id);
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-8 h-8 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                                                        {booking.bookingType === 'rooms' ? <Hotel className="w-4 h-4 text-orange-400" /> : booking.bookingType === 'tables' ? <Utensils className="w-4 h-4 text-orange-400" /> : <CalendarDays className="w-4 h-4 text-orange-400" />}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-black text-white truncate">{booking.clientName || 'Sin nombre'}</p>
                                                                        <p className="text-[10px] text-slate-500 truncate">{booking.clientEmail}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${statusColor}`}>
                                                                        {booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'completed' ? 'Terminada' : booking.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                                                                    </span>
                                                                    {!isEditing && (
                                                                        isExpanded
                                                                            ? <ChevronUp className="w-4 h-4 text-slate-500" />
                                                                            : <ChevronDown className="w-4 h-4 text-slate-500" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* Mini info preview when collapsed */}
                                                            {!isExpanded && !isEditing && (
                                                                <p className="text-[10px] text-slate-500 mt-2 pl-11">
                                                                    {booking.reservedItemName || (booking.bookingType === 'rooms' ? 'Habitación' : booking.bookingType === 'tables' ? 'Mesa' : 'Servicio')} · {formatBookingDate(booking.startTime)}
                                                                    {booking.notes && <span className="ml-2 text-orange-400/70">📝 Nota</span>}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Expanded Read-only Details */}
                                                        {isExpanded && !isEditing && (
                                                            <div className="px-4 pb-4 space-y-4 border-t border-white/5">
                                                                <div className="pt-4 grid grid-cols-2 gap-3 text-xs">
                                                                    <div className="space-y-2.5">
                                                                        <div className="flex items-center gap-2 text-slate-400">
                                                                            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                                            <span>{booking.clientPhone || '—'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-slate-400">
                                                                            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                                            <span className="truncate">{booking.clientEmail || '—'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-slate-400">
                                                                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                                            <span>{booking.spotsRequested || 1} {booking.bookingType === 'rooms' ? 'hab.' : booking.bookingType === 'tables' ? 'personas' : 'cupos'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2.5">
                                                                        {booking.bookingType === 'rooms' ? (
                                                                            <>
                                                                                <div className="flex items-center gap-2 text-slate-400">
                                                                                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                                                    <span>Check-in: <strong className="text-slate-200">{formatBookingDate(booking.startTime)}</strong></span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 text-slate-400">
                                                                                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                                                    <span>Check-out: <strong className="text-slate-200">{formatBookingDate(booking.endTime)}</strong></span>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2 text-slate-400">
                                                                                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                                                <span><strong className="text-slate-200">{formatBookingDate(booking.startTime)}</strong></span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center gap-2 text-slate-400">
                                                                            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                                            <span className="truncate">{booking.reservedItemName || '—'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Notes display */}
                                                                {booking.notes && (
                                                                    <div className="p-3 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                                            <FileText className="w-3.5 h-3.5 text-orange-400" />
                                                                            <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">Nota</span>
                                                                        </div>
                                                                        <p className="text-xs text-slate-300 leading-relaxed">{booking.notes}</p>
                                                                    </div>
                                                                )}

                                                                {/* Action buttons */}
                                                                <div className="flex flex-wrap gap-2 pt-1">
                                                                    {/* WhatsApp */}
                                                                    <button
                                                                        onClick={() => handleWhatsAppReminder(booking)}
                                                                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-sm shadow-emerald-500/20"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.451L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.102-2.884-6.964C16.59 1.962 14.12 1.025 11.99 1.025 6.556 1.025 2.133 5.448 2.13 10.887c-.001 1.701.453 3.361 1.311 4.8l-.364 1.328 1.395-.365zm11.233-6.52c-.287-.144-1.7-.84-1.962-.935-.264-.096-.456-.144-.648.144-.192.288-.744.936-.912 1.129-.168.193-.336.216-.624.072-.288-.144-1.217-.449-2.317-1.43-.856-.764-1.433-1.709-1.6-1.998-.169-.289-.018-.445.125-.587.13-.129.289-.336.433-.505.144-.168.192-.288.288-.48.096-.193.048-.361-.024-.505-.072-.144-.648-1.56-.888-2.136-.233-.56-.47-.482-.648-.491-.168-.009-.36-.01-.552-.01-.192 0-.504.072-.768.36-.264.288-1.008.985-1.008 2.4 0 1.416 1.032 2.784 1.176 2.976.144.193 2.033 3.103 4.925 4.35.688.297 1.224.474 1.644.608.691.22 1.32.19 1.815.116.552-.082 1.7-.696 1.944-1.37.24-.672.24-1.25.168-1.37-.072-.12-.264-.192-.552-.336z" /></svg>
                                                                        WhatsApp
                                                                    </button>

                                                                    {/* Edit */}
                                                                    <button
                                                                        onClick={() => { handleStartEdit(booking); }}
                                                                        className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" /> Editar
                                                                    </button>

                                                                    {/* Confirm/Cancel */}
                                                                    {booking.status === 'pending' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                                                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                                            >
                                                                                <Check className="w-3.5 h-3.5" /> Confirmar
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                                                                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                                            >
                                                                                <XCircle className="w-3.5 h-3.5" /> Rechazar
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {booking.status === 'confirmed' && (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                                                                className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                                            >
                                                                                <CheckCircle className="w-3.5 h-3.5" /> Terminar
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                                                                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                                            >
                                                                                <XCircle className="w-3.5 h-3.5" /> Cancelar
                                                                            </button>
                                                                        </>
                                                                    )}

                                                                    {/* Delete */}
                                                                    <button
                                                                        onClick={() => handleDeleteBooking(booking.id)}
                                                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ml-auto"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ── EDIT MODE ── */}
                                                        {isEditing && (
                                                            <div className="px-4 pb-4 space-y-4 border-t border-orange-500/20">
                                                                <div className="pt-4 flex items-center justify-between">
                                                                    <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider flex items-center gap-1.5">
                                                                        <Edit2 className="w-3.5 h-3.5" /> Editando reserva
                                                                    </span>
                                                                    <button
                                                                        onClick={() => setEditingBookingId(null)}
                                                                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-all"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>

                                                                {/* Client data */}
                                                                <div className="space-y-2">
                                                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Datos del cliente</p>
                                                                    <div className="grid grid-cols-1 gap-2">
                                                                        <div className="relative">
                                                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Nombre completo"
                                                                                value={draft.clientName || ''}
                                                                                onChange={e => handleEditChange(booking.id, 'clientName', e.target.value)}
                                                                                className="w-full bg-slate-800 border border-white/5 focus:border-orange-500/40 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white outline-none transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                                                            <input
                                                                                type="email"
                                                                                placeholder="Correo electrónico"
                                                                                value={draft.clientEmail || ''}
                                                                                onChange={e => handleEditChange(booking.id, 'clientEmail', e.target.value)}
                                                                                className="w-full bg-slate-800 border border-white/5 focus:border-orange-500/40 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white outline-none transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                                                            <input
                                                                                type="tel"
                                                                                placeholder="WhatsApp / Teléfono"
                                                                                value={draft.clientPhone || ''}
                                                                                onChange={e => handleEditChange(booking.id, 'clientPhone', e.target.value)}
                                                                                className="w-full bg-slate-800 border border-white/5 focus:border-orange-500/40 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white outline-none transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div>
                                                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">{booking.bookingType === 'rooms' ? 'Habitaciones' : 'Cupos'}</label>
                                                                                <input
                                                                                    type="number" min="1" max="20"
                                                                                    value={draft.spotsRequested || 1}
                                                                                    onChange={e => handleEditChange(booking.id, 'spotsRequested', e.target.value)}
                                                                                    className="w-full bg-slate-800 border border-white/5 focus:border-orange-500/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Estado</label>
                                                                                <select
                                                                                    value={draft.status || 'pending'}
                                                                                    onChange={e => handleEditChange(booking.id, 'status', e.target.value)}
                                                                                    className="w-full bg-slate-800 border border-white/5 focus:border-orange-500/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                                                                                >
                                                                                    <option value="pending">Pendiente</option>
                                                                                    <option value="confirmed">Confirmada</option>
                                                                                    <option value="cancelled">Cancelada</option>
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Reschedule */}
                                                                <div className="space-y-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                                                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                                                                        <RotateCcw className="w-3.5 h-3.5" /> Reagendar (opcional)
                                                                    </p>
                                                                    {booking.bookingType === 'rooms' ? (
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div>
                                                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Nuevo Check-in</label>
                                                                                <input
                                                                                    type="date"
                                                                                    value={draft.newStartDate || ''}
                                                                                    onChange={e => handleEditChange(booking.id, 'newStartDate', e.target.value)}
                                                                                    className="w-full bg-slate-800 border border-white/5 focus:border-blue-500/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Nuevo Check-out</label>
                                                                                <input
                                                                                    type="date"
                                                                                    value={draft.newEndDate || ''}
                                                                                    onChange={e => handleEditChange(booking.id, 'newEndDate', e.target.value)}
                                                                                    className="w-full bg-slate-800 border border-white/5 focus:border-blue-500/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div>
                                                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Nueva Fecha</label>
                                                                                <input
                                                                                    type="date"
                                                                                    value={draft.newStartDate || ''}
                                                                                    onChange={e => handleEditChange(booking.id, 'newStartDate', e.target.value)}
                                                                                    className="w-full bg-slate-800 border border-white/5 focus:border-blue-500/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Nueva Hora</label>
                                                                                <input
                                                                                    type="time"
                                                                                    value={draft.newStartTime || ''}
                                                                                    onChange={e => handleEditChange(booking.id, 'newStartTime', e.target.value)}
                                                                                    className="w-full bg-slate-800 border border-white/5 focus:border-blue-500/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Notes */}
                                                                <div className="space-y-2">
                                                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                                                                        <FileText className="w-3.5 h-3.5" /> Notas internas
                                                                    </p>
                                                                    <textarea
                                                                        placeholder="Añade notas sobre esta reserva (solo visibles para ti)..."
                                                                        value={draft.notes || ''}
                                                                        onChange={e => handleEditChange(booking.id, 'notes', e.target.value)}
                                                                        rows={3}
                                                                        className="w-full bg-slate-800 border border-white/5 focus:border-orange-500/40 rounded-2xl px-3 py-2.5 text-xs text-white outline-none resize-none transition-all placeholder:text-slate-600"
                                                                    />
                                                                </div>

                                                                {/* Save / Cancel / Delete */}
                                                                <div className="flex gap-2 pt-1">
                                                                    <button
                                                                        onClick={() => handleSaveEdit(booking)}
                                                                        disabled={savingEdit}
                                                                        className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 transition-all"
                                                                    >
                                                                        {savingEdit ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                                        {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingBookingId(null)}
                                                                        className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteBooking(booking.id)}
                                                                        className="px-4 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/30 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {whatsappConfigBooking && (
                <div className="fixed inset-0 z-[5000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 p-6 rounded-[2.5rem] shadow-2xl space-y-6 text-left relative">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <svg className="w-5 h-5 fill-emerald-400" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.451L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.102-2.884-6.964C16.59 1.962 14.12 1.025 11.99 1.025 6.556 1.025 2.133 5.448 2.13 10.887c-.001 1.701.453 3.361 1.311 4.8l-.364 1.328 1.395-.365zm11.233-6.52c-.287-.144-1.7-.84-1.962-.935-.264-.096-.456-.144-.648.144-.192.288-.744.936-.912 1.129-.168.193-.336.216-.624.072-.288-.144-1.217-.449-2.317-1.43-.856-.764-1.433-1.709-1.6-1.998-.169-.289-.018-.445.125-.587.13-.129.289-.336.433-.505.144-.168.192-.288.288-.48.096-.193.048-.361-.024-.505-.072-.144-.648-1.56-.888-2.136-.233-.56-.47-.482-.648-.491-.168-.009-.36-.01-.552-.01-.192 0-.504.072-.768.36-.264.288-1.008.985-1.008 2.4 0 1.416 1.032 2.784 1.176 2.976.144.193 2.033 3.103 4.925 4.35.688.297 1.224.474 1.644.608.691.22 1.32.19 1.815.116.552-.082 1.7-.696 1.944-1.37.24-.672.24-1.25.168-1.37-.072-.12-.264-.192-.552-.336z" /></svg>
                                Configurar Recordatorio
                            </h3>
                            <button onClick={() => setWhatsappConfigBooking(null)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-slate-400">
                                Personaliza el mensaje de WhatsApp que enviarás a <strong className="text-white">{whatsappConfigBooking.clientName}</strong>.
                            </p>

                            {/* Checkbox for Payment Info */}
                            <div className="flex items-start justify-between p-3.5 bg-slate-800/40 border border-white/5 rounded-2xl">
                                <div className="space-y-0.5 max-w-[80%]">
                                    <label className="text-xs font-black text-white cursor-pointer select-none" htmlFor="toggle-payment">
                                        Enviar Cuenta de Cobro
                                    </label>
                                    <p className="text-[10px] text-slate-500">
                                        {bankName && accountNumber
                                            ? `Incluye los datos de transferencia del banco ${bankName}.`
                                            : 'No has configurado una cuenta bancaria en la pestaña de Configuración.'}
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="toggle-payment"
                                    disabled={!(bankName && accountNumber)}
                                    checked={includePaymentInfo}
                                    onChange={(e) => setIncludePaymentInfo(e.target.checked)}
                                    className="w-4 h-4 mt-1 accent-orange-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Checkbox for Calendar Link */}
                            <div className="flex items-start justify-between p-3.5 bg-slate-800/40 border border-white/5 rounded-2xl">
                                <div className="space-y-0.5 max-w-[80%]">
                                    <label className="text-xs font-black text-white cursor-pointer select-none" htmlFor="toggle-calendar">
                                        Enviar Enlace de Calendario
                                    </label>
                                    <p className="text-[10px] text-slate-500">
                                        Incluye un enlace rápido para que el cliente añada el evento a Google Calendar.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="toggle-calendar"
                                    checked={includeCalendarLink}
                                    onChange={(e) => setIncludeCalendarLink(e.target.checked)}
                                    className="w-4 h-4 mt-1 accent-orange-500 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 border-t border-white/5 pt-4">
                            <button
                                onClick={() => executeWhatsAppSend(whatsappConfigBooking, includePaymentInfo, includeCalendarLink)}
                                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                            >
                                Enviar WhatsApp
                            </button>
                            <button
                                onClick={() => setWhatsappConfigBooking(null)}
                                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
