import React, { useState, useEffect } from 'react';
import { Lock, Hotel, Utensils, CalendarDays, Calendar, Users, Clock, X, Info, Sparkles, ShieldCheck, CheckCircle } from 'lucide-react';
import { db } from '../firebase.config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface BookingWidgetProps {
    businessId: string;
}

export const BookingWidget: React.FC<BookingWidgetProps> = ({ businessId }) => {
    const { user } = useAuthContext();
    const { showToast } = useToast();
    const [isAddonActive, setIsAddonActive] = useState(false);
    const [bookingType, setBookingType] = useState<'rooms' | 'tables' | 'appointments'>('rooms');
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [clientName, setClientName] = useState(user ? `${user.name || ''} ${user.surname || ''}`.trim() : '');
    const [clientEmail, setClientEmail] = useState(user?.email || '');
    const [clientPhone, setClientPhone] = useState((user as any)?.phone || '');
    const [spotsRequested, setSpotsRequested] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [timeSlot, setTimeSlot] = useState('');
    
    // Inventory and selected item
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [bankDetails, setBankDetails] = useState<{
        bankName?: string;
        accountType?: string;
        accountNumber?: string;
        accountHolder?: string;
        holderId?: string;
        accountEmail?: string;
    } | null>(null);
    const [bookingSuccessDetails, setBookingSuccessDetails] = useState<{
        bookingId: string;
        totalPrice: number;
    } | null>(null);
    const [bookedTableIds, setBookedTableIds] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    
    // Appointment Availability Check States
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'full' | 'conflict_working_hours' | 'conflict_working_days' | null>(null);
    const [availableSpotsLeft, setAvailableSpotsLeft] = useState<number | null>(null);

    // Room Availability and Custom Rates Check States
    const [roomPriceQuote, setRoomPriceQuote] = useState<number | null>(null);
    const [roomAvailabilityStatus, setRoomAvailabilityStatus] = useState<'available' | 'full' | 'blocked' | null>(null);
    const [checkingRoomAvailability, setCheckingRoomAvailability] = useState(false);
    const [roomCapacityLeft, setRoomCapacityLeft] = useState<number | null>(null);
    const [extraServices, setExtraServices] = useState<string[]>([]);
    const [extraServicesConfigList, setExtraServicesConfigList] = useState<any[]>([]);
    const [staffAssigned, setStaffAssigned] = useState('');
    const [conflictMsg, setConflictMsg] = useState<string | null>(null);
    const [forceSubmit, setForceSubmit] = useState(false);

    useEffect(() => {
        const checkAddonAndConfig = async () => {
            try {
                setLoading(true);
                // 1. Check addon status
                const addonRef = doc(db, 'booking_addons', businessId);
                const addonSnap = await getDoc(addonRef);
                
                if (addonSnap.exists()) {
                    const addonData = addonSnap.data();
                    const now = new Date();
                    const expiresAt = addonData.expiresAt?.toDate ? addonData.expiresAt.toDate() : new Date(addonData.expiresAt);
                    
                    if (addonData.status === 'active' && expiresAt > now) {
                        setIsAddonActive(true);
                    } else {
                        setIsAddonActive(false);
                    }
                } else {
                    setIsAddonActive(false);
                }

                // 2. Fetch booking config
                const configRef = doc(db, 'booking_configs', businessId);
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    const configData = configSnap.data();
                    setBookingType(configData.bookingType || 'rooms');
                    setIsEnabled(configData.isEnabled || false);
                    setExtraServicesConfigList(configData.extraServices || []);
                    if (configData.bankName && configData.accountNumber) {
                        setBankDetails({
                            bankName: configData.bankName,
                            accountType: configData.accountType,
                            accountNumber: configData.accountNumber,
                            accountHolder: configData.accountHolder,
                            holderId: configData.holderId,
                            accountEmail: configData.accountEmail
                        });
                    } else {
                        setBankDetails(null);
                    }
                }
            } catch (err) {
                console.error('Error fetching booking configuration:', err);
            } finally {
                setLoading(false);
            }
        };

        checkAddonAndConfig();
    }, [businessId]);

    // Load inventories when modal opens
    useEffect(() => {
        if (!isModalOpen || !isAddonActive || !isEnabled) return;

        const loadInventory = async () => {
            try {
                let colName = '';
                if (bookingType === 'rooms') colName = 'room_inventories';
                else if (bookingType === 'tables') colName = 'table_inventories';
                else if (bookingType === 'appointments') colName = 'slot_inventories';

                if (colName) {
                    const q = query(collection(db, colName), where('businessId', '==', businessId));
                    const snap = await getDocs(q);
                    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setInventoryItems(items);
                    if (items.length > 0) {
                        setSelectedItemId(items[0].id);
                    }
                }
            } catch (err) {
                console.error('Error loading inventory:', err);
            }
        };

        loadInventory();
    }, [isModalOpen, bookingType, isAddonActive, isEnabled, businessId]);

    // Load booked tables for selected date and hour slot
    useEffect(() => {
        if (bookingType !== 'tables' || !startDate || !timeSlot) {
            setBookedTableIds([]);
            return;
        }

        const fetchAvailability = async () => {
            try {
                const q = query(
                    collection(db, 'table_availability'),
                    where('date', '==', startDate),
                    where('timeSlot', '==', timeSlot)
                );
                const snap = await getDocs(q);
                const ids = snap.docs.map(doc => doc.data().tableId);
                setBookedTableIds(ids);

                // Auto-select first available table
                const available = inventoryItems.filter(item => !ids.includes(item.id));
                if (available.length > 0) {
                    setSelectedItemId(available[0].id);
                } else {
                    setSelectedItemId('');
                }
            } catch (err) {
                console.error('Error fetching table availability:', err);
            }
        };

        fetchAvailability();
    }, [bookingType, startDate, timeSlot, inventoryItems.length]);

    // Auto-prefill assigned staff when service changes
    useEffect(() => {
        if (bookingType === 'appointments' && selectedItemId && inventoryItems.length > 0) {
            const item = inventoryItems.find(i => i.id === selectedItemId);
            if (item && item.assigned_staff) {
                setStaffAssigned(item.assigned_staff);
            } else {
                setStaffAssigned('');
            }
        }
    }, [selectedItemId, inventoryItems, bookingType]);

    // Check availability for appointments
    useEffect(() => {
        if (bookingType !== 'appointments' || !startDate || !timeSlot || !selectedItemId) {
            setAvailabilityStatus(null);
            setAvailableSpotsLeft(null);
            return;
        }

        const checkSlotAvailability = async () => {
            setCheckingAvailability(true);
            setAvailabilityStatus(null);
            try {
                const selectedItem = inventoryItems.find(item => item.id === selectedItemId);
                if (!selectedItem) {
                    setCheckingAvailability(false);
                    return;
                }

                // 1. Check working days
                if (selectedItem.working_days && selectedItem.working_days.length > 0) {
                    const daysOfWeekSpanish = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                    const [year, month, day] = startDate.split('-').map(Number);
                    const dateObj = new Date(year, month - 1, day);
                    const dayOfWeekName = daysOfWeekSpanish[dateObj.getDay()];
                    if (!selectedItem.working_days.includes(dayOfWeekName)) {
                        setAvailabilityStatus('conflict_working_days');
                        setCheckingAvailability(false);
                        return;
                    }
                }

                // 2. Check working hours
                if (selectedItem.work_start_time && selectedItem.work_end_time) {
                    if (timeSlot < selectedItem.work_start_time || timeSlot > selectedItem.work_end_time) {
                        setAvailabilityStatus('conflict_working_hours');
                        setCheckingAvailability(false);
                        return;
                    }
                }

                // 3. Query bookings for this slot and service (no inequality filter to avoid requiring composite indexes)
                const q = query(
                    collection(db, 'bookings'),
                    where('businessId', '==', businessId),
                    where('inventoryItemId', '==', selectedItemId)
                );
                
                const snap = await getDocs(q);
                let bookedSpots = 0;
                
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'cancelled') return;
                    
                    const bTime = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
                    
                    const bTimeStr = bTime.toTimeString().substring(0, 5);
                    const bDateStr = bTime.toISOString().split('T')[0];
                    
                    if (bDateStr === startDate && bTimeStr === timeSlot) {
                        bookedSpots += (data.spotsRequested || 1);
                    }
                });

                const maxSpots = selectedItem.max_spots_per_slot || 5;
                const left = maxSpots - bookedSpots;
                setAvailableSpotsLeft(left);
                
                if (left >= spotsRequested) {
                    setAvailabilityStatus('available');
                } else {
                    setAvailabilityStatus('full');
                }
            } catch (err) {
                console.error('Error checking slot availability:', err);
            } finally {
                setCheckingAvailability(false);
            }
        };

        checkSlotAvailability();
    }, [startDate, timeSlot, selectedItemId, spotsRequested, inventoryItems, bookingType, businessId]);

    // Check availability and calculate price quote for rooms/accommodations
    useEffect(() => {
        if (bookingType !== 'rooms' || !startDate || !endDate || !selectedItemId) {
            setRoomAvailabilityStatus(null);
            setRoomPriceQuote(null);
            setRoomCapacityLeft(null);
            return;
        }

        const checkRoomAvailability = async () => {
            setCheckingRoomAvailability(true);
            setRoomAvailabilityStatus(null);
            try {
                const selectedItem = inventoryItems.find(item => item.id === selectedItemId);
                if (!selectedItem) {
                    setCheckingRoomAvailability(false);
                    return;
                }

                const s = new Date(`${startDate}T12:00:00`);
                const e = new Date(`${endDate}T10:00:00`);

                if (isNaN(s.getTime()) || isNaN(e.getTime()) || s >= e) {
                    setRoomAvailabilityStatus(null);
                    setCheckingRoomAvailability(false);
                    return;
                }

                // 1. Fetch all bookings of this room type
                const q = query(
                    collection(db, 'bookings'),
                    where('businessId', '==', businessId),
                    where('inventoryItemId', '==', selectedItemId)
                );
                const snap = await getDocs(q);
                const activeBookings = snap.docs
                    .map(doc => doc.data())
                    .filter(b => b.status !== 'cancelled');

                // 2. Loop through each night of the requested stay
                let totalQuote = 0;
                let minCapacityLeft = Infinity;
                const current = new Date(s);

                const defaultPrice = selectedItem.price_per_night || 0;
                const defaultCapacity = selectedItem.total_capacity || 1;

                while (current < e) {
                    const year = current.getFullYear();
                    const month = String(current.getMonth() + 1).padStart(2, '0');
                    const dateNum = String(current.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${dateNum}`;

                    // Check custom rate for this night
                    const customRate = selectedItem.custom_rates?.find((r: any) => dateStr >= r.start && dateStr <= r.end);
                    const nightPrice = customRate ? customRate.price : defaultPrice;
                    totalQuote += nightPrice;

                    // Check custom capacity/block for this night
                    const block = selectedItem.blocked_dates?.find((b: any) => dateStr >= b.start && dateStr <= b.end);
                    const nightCapacity = block ? block.capacity : defaultCapacity;

                    if (nightCapacity === 0) {
                        minCapacityLeft = 0;
                    } else {
                        // Count how many rooms are already booked on this night
                        const nightDate = new Date(current);
                        let bookedOnNight = 0;

                        activeBookings.forEach(b => {
                            const bStart = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime);
                            const bEnd = b.endTime?.toDate ? b.endTime.toDate() : new Date(b.endTime);

                            const bStartClean = new Date(bStart);
                            bStartClean.setHours(12, 0, 0, 0);
                            const bEndClean = new Date(bEnd);
                            bEndClean.setHours(10, 0, 0, 0);

                            const nightDateClean = new Date(nightDate);
                            nightDateClean.setHours(12, 0, 0, 0);

                            if (bStartClean <= nightDateClean && bEndClean > nightDateClean) {
                                bookedOnNight += (b.spotsRequested || 1);
                            }
                        });

                        const capacityLeft = nightCapacity - bookedOnNight;
                        if (capacityLeft < minCapacityLeft) {
                            minCapacityLeft = capacityLeft;
                        }
                    }

                    current.setDate(current.getDate() + 1);
                }

                let servicesTotal = 0;
                extraServices.forEach(selectedName => {
                    const found = extraServicesConfigList.find(s => s.name === selectedName);
                    if (found) {
                        servicesTotal += (found.price || 0);
                    }
                });

                const diffTime = Math.abs(e.getTime() - s.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                const servicesPrice = servicesTotal * diffDays * spotsRequested;

                setRoomPriceQuote((totalQuote * spotsRequested) + servicesPrice);
                setRoomCapacityLeft(minCapacityLeft < 0 ? 0 : minCapacityLeft);

                if (minCapacityLeft <= 0) {
                    setRoomAvailabilityStatus('blocked');
                } else if (minCapacityLeft >= spotsRequested) {
                    setRoomAvailabilityStatus('available');
                } else {
                    setRoomAvailabilityStatus('full');
                }

            } catch (err) {
                console.error('Error checking room availability:', err);
            } finally {
                setCheckingRoomAvailability(false);
            }
        };

        checkRoomAvailability();
    }, [startDate, endDate, selectedItemId, spotsRequested, inventoryItems, bookingType, businessId, extraServices, extraServicesConfigList]);

    // Reset conflict warnings when input parameters change
    useEffect(() => {
        setConflictMsg(null);
        setForceSubmit(false);
    }, [startDate, endDate, timeSlot, selectedItemId, isModalOpen]);

    if (loading) {
        return (
            <div className="w-full p-4 bg-slate-800/40 border border-white/5 rounded-3xl animate-pulse flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAddonActive || !isEnabled) {
        return null; // Don't show anything on public profile if booking module is inactive
    }

    const handleOpenModal = () => {
        setBookingSuccessDetails(null);
        setIsModalOpen(true);
    };

    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId) {
            showToast('Por favor selecciona un elemento de la lista.', 'error');
            return;
        }

        setSubmitting(true);

        try {
            let startTime = '';
            let endTime = '';

            if (bookingType === 'rooms') {
                if (!startDate || !endDate) {
                    showToast('Por favor selecciona fechas de Check-in y Check-out.', 'error');
                    setSubmitting(false);
                    return;
                }
                startTime = `${startDate}T12:00:00`;
                endTime = `${endDate}T10:00:00`;
            } else {
                if (!startDate || !timeSlot) {
                    showToast('Por favor selecciona la fecha y la hora/turno.', 'error');
                    setSubmitting(false);
                    return;
                }
                startTime = `${startDate}T${timeSlot}:00`;
                endTime = `${startDate}T${timeSlot}:00`; 
            }

            const selectedItem = inventoryItems.find(item => item.id === selectedItemId);
            let calculatedPrice = 0;
            if (selectedItem) {
                if (bookingType === 'rooms') {
                    calculatedPrice = roomPriceQuote || 0;
                    if (roomAvailabilityStatus !== 'available') {
                        showToast('El alojamiento seleccionado no está disponible en las fechas indicadas.', 'error');
                        setSubmitting(false);
                        return;
                    }
                } else if (bookingType === 'appointments') {
                    const price = selectedItem.price || 0;
                    calculatedPrice = price * spotsRequested;

                    // Validate professional's working days/hours
                    if (selectedItem.working_days && selectedItem.working_days.length > 0) {
                        const daysOfWeekSpanish = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                        const [year, month, day] = startDate.split('-').map(Number);
                        const dateObj = new Date(year, month - 1, day);
                        const dayOfWeekName = daysOfWeekSpanish[dateObj.getDay()];
                        if (!selectedItem.working_days.includes(dayOfWeekName)) {
                            const errorMsg = `El profesional/servicio solo está disponible los días: ${selectedItem.working_days.join(', ')}.`;
                            setConflictMsg(errorMsg);
                            setSubmitting(false);
                            return;
                        }
                    }
                    if (selectedItem.work_start_time && selectedItem.work_end_time) {
                        if (timeSlot < selectedItem.work_start_time || timeSlot > selectedItem.work_end_time) {
                            const errorMsg = `El horario de atención es de ${selectedItem.work_start_time} a ${selectedItem.work_end_time}.`;
                            setConflictMsg(errorMsg);
                            setSubmitting(false);
                            return;
                        }
                    }
                }
            }

            const response = await fetch('/api/bookings/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    businessId,
                    clientName,
                    clientEmail,
                    clientPhone,
                    bookingType,
                    inventoryItemId: selectedItemId,
                    startTime,
                    endTime,
                    spotsRequested,
                    notes,
                    extraServices,
                    staffAssigned,
                    force: false
                })
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                showToast('El servidor de reservas no responde con datos válidos. Por favor, asegúrate de iniciar el backend (npm run server).', 'error');
                setSubmitting(false);
                return;
            }

            const result = await response.json();

            if (response.ok && result.success) {
                showToast('¡Reserva creada con éxito! Esperando confirmación.', 'success');
                setBookingSuccessDetails({
                    bookingId: result.bookingId,
                    totalPrice: calculatedPrice
                });
                setIsModalOpen(false);
                setConflictMsg(null);
            } else {
                if (result.error && (
                    result.error.includes('ocupada') || 
                    result.error.includes('disponible') || 
                    result.error.includes('cupos') || 
                    result.error.includes('horario')
                )) {
                    setConflictMsg(result.error);
                } else {
                    showToast(result.error || result.message || 'Error al crear la reserva.', 'error');
                }
            }
        } catch (error) {
            console.error('Error submitting booking:', error);
            showToast('Error de comunicación con el servidor.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmConflict = async () => {
        setSubmitting(true);
        try {
            let startTime = '';
            let endTime = '';

            if (bookingType === 'rooms') {
                startTime = `${startDate}T12:00:00`;
                endTime = `${endDate}T10:00:00`;
            } else {
                startTime = `${startDate}T${timeSlot}:00`;
                endTime = `${startDate}T${timeSlot}:00`; 
            }

            const selectedItem = inventoryItems.find(item => item.id === selectedItemId);
            let calculatedPrice = 0;
            if (selectedItem) {
                if (bookingType === 'rooms') {
                    const price = selectedItem.price_per_night || 0;
                    if (startDate && endDate) {
                        const s = new Date(startDate);
                        const e = new Date(endDate);
                        const diffTime = Math.abs(e.getTime() - s.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        calculatedPrice = price * spotsRequested * (diffDays || 1);
                    } else {
                        calculatedPrice = price * spotsRequested;
                    }
                } else if (bookingType === 'appointments') {
                    const price = selectedItem.price || 0;
                    calculatedPrice = price * spotsRequested;
                }
            }

            const response = await fetch('/api/bookings/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    businessId,
                    clientName,
                    clientEmail,
                    clientPhone,
                    bookingType,
                    inventoryItemId: selectedItemId,
                    startTime,
                    endTime,
                    spotsRequested,
                    notes,
                    extraServices,
                    staffAssigned,
                    force: true
                })
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                showToast('El servidor de reservas no responde con datos válidos. Por favor, asegúrate de iniciar el backend (npm run server).', 'error');
                setSubmitting(false);
                return;
            }

            const result = await response.json();

            if (response.ok && result.success) {
                showToast('¡Reserva forzada y guardada con éxito!', 'success');
                setBookingSuccessDetails({
                    bookingId: result.bookingId,
                    totalPrice: calculatedPrice
                });
                setIsModalOpen(false);
                setConflictMsg(null);
            } else {
                showToast(result.error || result.message || 'Error al forzar la reserva.', 'error');
            }
        } catch (error) {
            console.error('Error forced booking:', error);
            showToast('Error de comunicación con el servidor.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full">
            <button
                onClick={handleOpenModal}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-orange-500/25 border border-orange-400/20 font-black text-xs uppercase tracking-widest text-white text-center"
            >
                {bookingType === 'rooms' && <Hotel className="w-5 h-5 text-white" />}
                {bookingType === 'tables' && <Utensils className="w-5 h-5 text-white" />}
                {bookingType === 'appointments' && <CalendarDays className="w-5 h-5 text-white" />}
                Reservar Ahora
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-orange-500/20 text-orange-500 rounded-xl">
                                    {bookingType === 'rooms' && <Hotel className="w-5 h-5" />}
                                    {bookingType === 'tables' && <Utensils className="w-5 h-5" />}
                                    {bookingType === 'appointments' && <CalendarDays className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="text-md font-black text-white uppercase tracking-wider">
                                        {bookingType === 'rooms' ? 'Check-in / Check-out' : bookingType === 'tables' ? 'Reserva de Mesa' : 'Turno / Cita'}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Ubicame.info Reservas</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors group"
                            >
                                <X className="w-5 h-5 text-slate-400 group-hover:text-white" />
                            </button>
                        </div>

                        {/* Modal Forms container */}
                        {bookingSuccessDetails ? (
                            <div className="p-6 space-y-6 text-center overflow-y-auto no-scrollbar">
                                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                                    <CheckCircle className="w-8 h-8 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-wider">¡Reserva Solicitada!</h3>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Tu solicitud de reserva ha sido registrada correctamente. El negocio revisará la disponibilidad y se pondrá en contacto contigo.
                                    </p>
                                </div>

                                {bankDetails && bankDetails.bankName && bankDetails.accountNumber ? (
                                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 text-left space-y-4 shadow-inner">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Monto Estimado</span>
                                            <span className="text-lg font-black text-orange-500">${bookingSuccessDetails.totalPrice.toFixed(2)} USD</span>
                                        </div>
                                        
                                        <div className="space-y-2.5">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Banco:</span>
                                                <span className="text-slate-200 font-black">{bankDetails.bankName}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Tipo de Cuenta:</span>
                                                <span className="text-slate-200 font-black">{bankDetails.accountType || 'Ahorros'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Número de Cuenta:</span>
                                                <span className="text-slate-200 font-black tracking-wide">{bankDetails.accountNumber}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Titular:</span>
                                                <span className="text-slate-200 font-black">{bankDetails.accountHolder}</span>
                                            </div>
                                            {bankDetails.holderId && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">C.I. / RUC:</span>
                                                    <span className="text-slate-200 font-black">{bankDetails.holderId}</span>
                                                </div>
                                            )}
                                            {bankDetails.accountEmail && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Email de Notificación:</span>
                                                    <span className="text-slate-200 font-black text-[10px]">{bankDetails.accountEmail}</span>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-[10px] text-amber-400 font-bold text-center bg-amber-500/10 border border-amber-500/20 py-2.5 px-3 rounded-2xl leading-relaxed">
                                            Realiza tu transferencia bancaria y envía el comprobante de pago al negocio para confirmar y asegurar tu reserva.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-4 text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
                                            El negocio te enviará un correo o mensaje de WhatsApp para la confirmación de la reserva.
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setBookingSuccessDetails(null);
                                        setIsModalOpen(false);
                                    }}
                                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:shadow-lg transition-all"
                                >
                                    Entendido / Cerrar
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateBooking} className="p-6 overflow-y-auto space-y-4 no-scrollbar">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-orange-500" />
                                        Datos del Cliente
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <input 
                                            type="text" 
                                            placeholder="Nombre Completo" 
                                            value={clientName} 
                                            onChange={(e) => setClientName(e.target.value)}
                                            required
                                            className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none"
                                        />
                                        <input 
                                            type="email" 
                                            placeholder="Correo Electrónico" 
                                            value={clientEmail} 
                                            onChange={(e) => setClientEmail(e.target.value)}
                                            required
                                            className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none"
                                        />
                                        <input 
                                            type="tel" 
                                            placeholder="WhatsApp / Teléfono" 
                                            value={clientPhone} 
                                            onChange={(e) => setClientPhone(e.target.value)}
                                            required
                                            className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-white/5 pt-4 space-y-3">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-orange-500" />
                                        Detalles de la Reserva
                                    </h4>

                                    {bookingType === 'rooms' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Fecha de ingreso (Check-in)</label>
                                                    <input 
                                                        type="date" 
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        required
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Fecha de salida (Check-out)</label>
                                                    <input 
                                                        type="date" 
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        required
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Tipo de Habitación</label>
                                                <select 
                                                    value={selectedItemId}
                                                    onChange={(e) => setSelectedItemId(e.target.value)}
                                                    required
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none"
                                                >
                                                    {inventoryItems.map((item) => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.room_type} (${item.price_per_night}/noche)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {selectedItemId && inventoryItems.find(item => item.id === selectedItemId)?.image_url && (
                                                <div className="w-full rounded-2xl overflow-hidden border border-white/10 aspect-video relative group">
                                                    <img 
                                                        src={inventoryItems.find(item => item.id === selectedItemId).image_url} 
                                                        alt="Vista de la habitación" 
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                    />
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Habitaciones</label>
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        max="10" 
                                                        value={spotsRequested}
                                                        onChange={(e) => setSpotsRequested(parseInt(e.target.value) || 1)}
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Número de Huéspedes</label>
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        max="20" 
                                                        defaultValue={1}
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                                    />
                                                </div>
                                            </div>
                                            {extraServicesConfigList.length > 0 && (
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Servicios Adicionales</label>
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {extraServicesConfigList.map((service) => (
                                                            <label key={service.id} className="flex items-center gap-2 bg-slate-800/30 border border-white/5 px-4 py-2.5 rounded-2xl text-[10px] text-white cursor-pointer select-none">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={extraServices.includes(service.name)} 
                                                                    onChange={e => {
                                                                        if (e.target.checked) setExtraServices([...extraServices, service.name]);
                                                                        else setExtraServices(extraServices.filter(s => s !== service.name));
                                                                    }}
                                                                    className="accent-orange-500"
                                                                />
                                                                {service.name} {service.price > 0 ? `(+$${service.price.toFixed(2)})` : '(Gratis)'}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Real-time Room Availability and Price Quote Feedback */}
                                            {(startDate && endDate) && (
                                                <div className="mt-3 text-xs space-y-2">
                                                    {checkingRoomAvailability ? (
                                                        <div className="p-3 bg-slate-800/50 border border-white/5 rounded-2xl flex items-center gap-2">
                                                            <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                                                            <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Verificando disponibilidad y tarifas...</p>
                                                        </div>
                                                    ) : roomAvailabilityStatus === 'available' ? (
                                                        <div className="space-y-2">
                                                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2">
                                                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                                                <span>¡Disponible! Quedan {roomCapacityLeft} habitaciones de este tipo.</span>
                                                            </div>
                                                            {roomPriceQuote !== null && (
                                                                <div className="p-3 bg-slate-800/40 border border-white/5 rounded-2xl flex justify-between items-center">
                                                                    <span className="text-slate-400 uppercase font-black text-[9px]">Monto Cotizado (Tarifas Aplicadas):</span>
                                                                    <strong className="text-base font-black text-orange-500">${roomPriceQuote.toFixed(2)} USD</strong>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : roomAvailabilityStatus === 'blocked' ? (
                                                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-2">
                                                            <X className="w-4 h-4 text-red-400 shrink-0" />
                                                            <span>Las fechas seleccionadas están bloqueadas para esta habitación o no hay cupos.</span>
                                                        </div>
                                                    ) : roomAvailabilityStatus === 'full' ? (
                                                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-2">
                                                            <X className="w-4 h-4 text-red-400 shrink-0" />
                                                            <span>No disponible. Sin habitaciones libres para el rango de fechas seleccionado (Quedan {roomCapacityLeft || 0} disponibles).</span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {bookingType === 'tables' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Fecha de la reserva</label>
                                                    <input 
                                                        type="date" 
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        required
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Hora / Turno</label>
                                                    <input 
                                                        type="time" 
                                                        value={timeSlot} 
                                                        onChange={(e) => setTimeSlot(e.target.value)}
                                                        required
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Mesa disponible</label>
                                                <select 
                                                    value={selectedItemId}
                                                    onChange={(e) => setSelectedItemId(e.target.value)}
                                                    required
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none"
                                                >
                                                    {inventoryItems.filter(item => !bookedTableIds.includes(item.id)).length === 0 ? (
                                                        <option value="">No hay mesas disponibles en este horario</option>
                                                    ) : (
                                                        inventoryItems.filter(item => !bookedTableIds.includes(item.id)).map((item) => (
                                                            <option key={item.id} value={item.id}>
                                                                {item.table_identifier} ({item.zone_name} - Max {item.max_diners} personas)
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Número de comensales (Sillas)</label>
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    max={selectedItemId ? (inventoryItems.find(item => item.id === selectedItemId)?.max_diners || 10) : 10} 
                                                    value={spotsRequested}
                                                    onChange={(e) => setSpotsRequested(parseInt(e.target.value) || 1)}
                                                    required
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Notas de alergias o comentarios especiales</label>
                                                <textarea 
                                                    placeholder="Ej: Alergia a los mariscos, mesa cerca de la ventana..." 
                                                    value={notes}
                                                    onChange={e => setNotes(e.target.value)}
                                                    rows={2}
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white outline-none resize-none"
                                                />
                                            </div>
                                        </div>
                                     )}

                                    {bookingType === 'appointments' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Fecha</label>
                                                    <input 
                                                        type="date" 
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        required
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Hora exacta</label>
                                                    <input 
                                                        type="time" 
                                                        value={timeSlot} 
                                                        onChange={(e) => setTimeSlot(e.target.value)}
                                                        required
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Servicio específico</label>
                                                <select 
                                                    value={selectedItemId}
                                                    onChange={(e) => setSelectedItemId(e.target.value)}
                                                    required
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none"
                                                >
                                                    {inventoryItems.map((item) => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.service_name} (${item.price} - {item.duration_minutes} min)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Profesional / Personal asignado (Opcional)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ej: Juan Pérez (dejar en blanco para asignación automática)"
                                                    value={staffAssigned}
                                                    onChange={e => setStaffAssigned(e.target.value)}
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Cupos solicitados</label>
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    max="10" 
                                                    value={spotsRequested}
                                                    onChange={(e) => setSpotsRequested(parseInt(e.target.value) || 1)}
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                                />
                                            </div>
                                            
                                            {/* Real-time Availability Feedback */}
                                            {(startDate && timeSlot) && (
                                                <div className="mt-2 text-xs">
                                                    {checkingAvailability ? (
                                                        <div className="p-3 bg-slate-800/50 border border-white/5 rounded-2xl flex items-center gap-2">
                                                            <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                                                            <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Verificando disponibilidad...</p>
                                                        </div>
                                                    ) : availabilityStatus === 'available' ? (
                                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                                            <span>¡Disponible! Quedan {availableSpotsLeft} cupos libres para este horario.</span>
                                                        </div>
                                                    ) : availabilityStatus === 'full' ? (
                                                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-2">
                                                            <X className="w-4 h-4 text-red-400 shrink-0" />
                                                            <span>No disponible. Cupos insuficientes (Solo quedan {availableSpotsLeft || 0} cupos).</span>
                                                        </div>
                                                    ) : availabilityStatus === 'conflict_working_days' ? (
                                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center gap-2">
                                                            <Info className="w-4 h-4 text-amber-400 shrink-0" />
                                                            <span>Servicio no disponible en este día de la semana.</span>
                                                        </div>
                                                    ) : availabilityStatus === 'conflict_working_hours' ? (
                                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center gap-2">
                                                            <Info className="w-4 h-4 text-amber-400 shrink-0" />
                                                            <span>Fuera del horario de atención de este servicio.</span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {conflictMsg && (
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3 mt-4 text-left">
                                        <div className="flex items-start gap-2.5">
                                            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider">Aviso de Disponibilidad / Conflicto</h5>
                                                <p className="text-[11px] text-slate-300 leading-relaxed mt-1">{conflictMsg}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleConfirmConflict}
                                                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all"
                                            >
                                                Confirmar de todos modos
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setConflictMsg(null);
                                                    setForceSubmit(false);
                                                }}
                                                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                            >
                                                Cambiar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={
                                        submitting || 
                                        inventoryItems.length === 0 || 
                                        (bookingType === 'tables' && startDate && timeSlot && inventoryItems.filter(item => !bookedTableIds.includes(item.id)).length === 0) ||
                                        (bookingType === 'appointments' && startDate && timeSlot && availabilityStatus !== 'available' && !checkingAvailability) ||
                                        (bookingType === 'rooms' && startDate && endDate && roomAvailabilityStatus !== 'available' && !checkingRoomAvailability)
                                    }
                                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs mt-6 hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Reservando...' : 
                                     (bookingType === 'tables' && startDate && timeSlot && inventoryItems.filter(item => !bookedTableIds.includes(item.id)).length === 0) ? 'No hay mesas disponibles' : 
                                     (bookingType === 'appointments' && startDate && timeSlot && availabilityStatus === 'full') ? 'No disponible (Cupos llenos)' :
                                     (bookingType === 'appointments' && startDate && timeSlot && availabilityStatus === 'conflict_working_days') ? 'No disponible este día' :
                                     (bookingType === 'appointments' && startDate && timeSlot && availabilityStatus === 'conflict_working_hours') ? 'Fuera de horario de atención' :
                                     (bookingType === 'rooms' && startDate && endDate && roomAvailabilityStatus === 'blocked') ? 'No disponible (Fechas bloqueadas)' :
                                     (bookingType === 'rooms' && startDate && endDate && roomAvailabilityStatus === 'full') ? 'No disponible (Sin habitaciones)' :
                                     'Confirmar Reserva'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
