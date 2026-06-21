import React, { useState, useEffect } from 'react';
import { Lock, Hotel, Utensils, CalendarDays, Calendar, Users, Clock, X, Info, Sparkles, ShieldCheck } from 'lucide-react';
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
                // Estimate end time or keep same for simple slots
                endTime = `${startDate}T${timeSlot}:00`; 
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
                    spotsRequested
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showToast('¡Reserva creada con éxito! Esperando confirmación.', 'success');
                setIsModalOpen(false);
            } else {
                showToast(result.error || result.message || 'Error al crear la reserva.', 'error');
            }
        } catch (error) {
            console.error('Error submitting booking:', error);
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
                                        {bookingType === 'rooms' ? 'Reservar Habitación' : bookingType === 'tables' ? 'Reservar Mesa' : 'Agendar Cita / Servicio'}
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
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Check-in</label>
                                                <input 
                                                    type="date" 
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    required
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Check-out</label>
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
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Habitaciones solicitadas</label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="10" 
                                                value={spotsRequested}
                                                onChange={(e) => setSpotsRequested(parseInt(e.target.value) || 1)}
                                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none" 
                                            />
                                        </div>
                                    </div>
                                )}

                                {bookingType === 'tables' && (
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
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Hora</label>
                                                <select 
                                                    value={timeSlot} 
                                                    onChange={(e) => setTimeSlot(e.target.value)}
                                                    required
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none"
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    <option value="12:00">12:00 PM</option>
                                                    <option value="13:30">01:30 PM</option>
                                                    <option value="15:00">03:00 PM</option>
                                                    <option value="19:00">07:00 PM</option>
                                                    <option value="20:30">08:30 PM</option>
                                                    <option value="22:00">10:00 PM</option>
                                                </select>
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
                                                {inventoryItems.map((item) => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.table_identifier} ({item.zone_name} - Max {item.max_diners} personas)
                                                    </option>
                                                ))}
                                            </select>
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
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Turno</label>
                                                <select 
                                                    value={timeSlot} 
                                                    onChange={(e) => setTimeSlot(e.target.value)}
                                                    required
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none"
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    <option value="09:00">09:00 AM</option>
                                                    <option value="10:30">10:30 AM</option>
                                                    <option value="14:00">02:00 PM</option>
                                                    <option value="16:00">04:00 PM</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">Servicio / Experiencia</label>
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
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || inventoryItems.length === 0}
                                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs mt-6 hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? 'Reservando...' : 'Confirmar Reserva'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
