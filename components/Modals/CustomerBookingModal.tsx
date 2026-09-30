import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, Users, CheckCircle, MessageCircle, Store, Scissors, Sparkles, MapPin, DollarSign, Layers, ChevronRight, ShieldCheck
} from 'lucide-react';
import { Business, ResourceItem, BusinessServiceItem, BusinessReservation, ShiftSlot } from '../../types';
import {
  getBusinessResources, saveBusinessReservation,
  getBusinessServices, saveBusinessShift, getBusinessShifts,
  checkResourceAvailability, checkShiftAvailability
} from '../../services/businessOSService';
import { useToast } from '../../context/ToastContext';

interface CustomerBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  initialMode?: 'reservas' | 'turnos';
}

export const CustomerBookingModal: React.FC<CustomerBookingModalProps> = ({
  isOpen,
  onClose,
  business,
  initialMode
}) => {
  const { showToast } = useToast();

  // Determine mode based on business settings or category
  const isTurnoCat = (business.category || '').toLowerCase().includes('bar') ||
                     (business.category || '').toLowerCase().includes('surf') ||
                     (business.category || '').toLowerCase().includes('salud') ||
                     (business.category || '').toLowerCase().includes('barber') ||
                     (business.category || '').toLowerCase().includes('spa');

  const configuredMode = business.bookingMode && business.bookingMode !== 'none'
    ? business.bookingMode
    : (initialMode || (isTurnoCat ? 'turnos' : 'reservas'));

  const [bookingType, setBookingType] = useState<'reservas' | 'turnos'>(configuredMode);

  // Resources & Services state
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [services, setServices] = useState<BusinessServiceItem[]>([]);

  // Selection states for Reservas (Accommodations)
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [startDate, setStartDate] = useState<string>('2026-11-01');
  const [endDate, setEndDate] = useState<string>('2026-11-03');
  const [guestsCount, setGuestsCount] = useState<number>(2);

  // Selection states for Turnos (Shifts)
  const [selectedService, setSelectedService] = useState<BusinessServiceItem | null>(null);
  const [shiftDate, setShiftDate] = useState<string>('2026-10-24');
  const [shiftTime, setShiftTime] = useState<string>('10:00');

  // Customer contact info
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  useEffect(() => {
    if (business && business.id) {
      const res = getBusinessResources(business.id);
      setResources(res);
      if (res.length > 0) setSelectedResource(res[0]);

      const srv = getBusinessServices(business.id);
      setServices(srv);
      if (srv.length > 0) setSelectedService(srv[0]);
    }
  }, [business]);

  useEffect(() => {
    if (configuredMode) {
      setBookingType(configuredMode);
    }
  }, [configuredMode]);

  if (!isOpen) return null;

  const phoneTarget = (business.whatsapp || business.phone || '').replace(/\D/g, '');

  // Calculate nights & total for Reservas
  const calculateNights = () => {
    try {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    } catch (e) {
      return 1;
    }
  };

  const nights = calculateNights();
  const reservationTotal = selectedResource ? selectedResource.price * nights : 0;

  // Handle Confirm Reserva (Hospedaje)
  const handleConfirmReserva = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !selectedResource) {
      showToast('Por favor completa tu nombre y elige una unidad', 'warning');
      return;
    }

    const avail = checkResourceAvailability(selectedResource.id, startDate, endDate, business.id);
    let finalStatus: 'confirmed' | 'pending' = 'confirmed';
    let finalNotes = customerNotes || '';

    if (!avail.isAvailable) {
      finalStatus = 'pending';
      const warningTag = `⚠️ Conflicto de fechas: ${avail.reason}`;
      finalNotes = finalNotes ? `${finalNotes} (${warningTag})` : warningTag;
    }

    const code = `RES${Math.floor(10000 + Math.random() * 90000)}`;
    const newResv: BusinessReservation = {
      id: `resv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      reservationCode: code,
      businessId: business.id,
      resourceId: selectedResource.id,
      resourceName: selectedResource.name,
      customerName,
      customerPhone: customerPhone || '+593 99 000 0000',
      startDate,
      endDate,
      status: finalStatus,
      guestsCount,
      totalPrice: reservationTotal,
      paymentStatus: 'pending',
      notes: finalNotes,
      createdAt: Date.now()
    };

    saveBusinessReservation(newResv);
    window.dispatchEvent(new CustomEvent('montapulse_business_data_changed', { detail: { businessId: business.id } }));

    if (avail.isAvailable) {
      showToast(`¡Reserva ${code} confirmada! Abriendo WhatsApp...`, 'success');
    } else {
      showToast(`⚠️ Fechas ocupadas. La solicitud ${code} se guardó como pendiente. Abriendo WhatsApp...`, 'warning');
    }

    // Launch WhatsApp
    const msg = `Hola *${business.name}*! 👋 Quisiera solicitar la reserva de *${selectedResource.name}* para ${guestsCount} persona(s).\n\n📅 *Fechas:* del ${startDate} al ${endDate} (${nights} noche/s)\n👤 *Cliente:* ${customerName}\n📱 *Teléfono:* ${customerPhone || 'No especificado'}\n💵 *Total Estimado:* US$ ${reservationTotal}\n🔖 *Código:* #${code}\n${finalNotes ? `📝 *Nota:* ${finalNotes}` : ''}`;
    const waLink = `https://wa.me/${phoneTarget || '593990000000'}?text=${encodeURIComponent(msg)}`;
    window.open(waLink, '_blank');
    onClose();
  };

  // Handle Confirm Turno (Citas/Agenda)
  const handleConfirmTurno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !selectedService) {
      showToast('Por favor completa tu nombre y elige un servicio', 'warning');
      return;
    }

    const avail = checkShiftAvailability(shiftTime, shiftDate, business.id);
    let finalStatus: 'confirmed' | 'cancelled' | 'in_progress' | 'completed' = 'confirmed';
    let finalNotes = customerNotes || '';

    if (!avail.isAvailable) {
      finalStatus = 'cancelled';
      const warningTag = `⚠️ Conflicto de horario: ${avail.reason}`;
      finalNotes = finalNotes ? `${finalNotes} (${warningTag})` : warningTag;
    }

    const newShift: ShiftSlot = {
      id: `sh-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      businessId: business.id,
      time: shiftTime,
      serviceName: selectedService.name,
      customerName,
      staffName: 'Atención General',
      stationName: 'Puesto Principal',
      durationMin: selectedService.durationMin,
      price: selectedService.price,
      status: finalStatus,
      dateStr: shiftDate,
      notes: finalNotes
    };

    saveBusinessShift(newShift);
    window.dispatchEvent(new CustomEvent('montapulse_business_data_changed', { detail: { businessId: business.id } }));

    if (avail.isAvailable) {
      showToast(`¡Turno agendado para ${shiftTime}! Abriendo WhatsApp...`, 'success');
    } else {
      showToast(`⚠️ Horario ocupado. Solicitud enviada a WhatsApp...`, 'warning');
    }

    // Launch WhatsApp
    const msg = `Hola *${business.name}*! 👋 Quisiera solicitar un turno para *${selectedService.name}*.\n\n📅 *Fecha:* ${shiftDate}\n⏰ *Hora:* ${shiftTime}\n⏱️ *Duración:* ${selectedService.durationMin} min\n👤 *Cliente:* ${customerName}\n📱 *Teléfono:* ${customerPhone || 'No especificado'}\n💵 *Precio:* US$ ${selectedService.price}\n${finalNotes ? `📝 *Nota:* ${finalNotes}` : ''}`;
    const waLink = `https://wa.me/${phoneTarget || '593990000000'}?text=${encodeURIComponent(msg)}`;
    window.open(waLink, '_blank');
    onClose();
  };

  const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '15:00', '15:30', '16:00', '16:30', '17:00', '18:00'];

  return (
    <div className="fixed inset-0 z-[7000] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn font-sans text-slate-800 dark:text-white">
      <div className="w-full max-w-xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-600 via-emerald-600 to-[#00a896] text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black">
              {bookingType === 'reservas' ? <Store className="w-5 h-5 text-white" /> : <Scissors className="w-5 h-5 text-white" />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-200">
                MÓDULO OFICIAL DE {bookingType === 'reservas' ? 'RESERVAS' : 'TURNOS'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black leading-none">{business.name}</h2>
            </div>
          </div>
          <p className="text-xs text-teal-100 font-medium">
            {bookingType === 'reservas' ? 'Elige tu habitación o cabaña y reserva directamente.' : 'Selecciona tu servicio y horario de atención deseado.'}
          </p>

          {/* Mode Switcher if business supports both */}
          {((business.plan as any) === 'ELITE' || (business.plan as any) === 'PRO') && (
            <div className="flex gap-2 mt-4 p-1 bg-black/20 rounded-xl backdrop-blur-md w-fit">
              <button
                type="button"
                onClick={() => setBookingType('reservas')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                  bookingType === 'reservas' ? 'bg-white text-slate-900 shadow-md' : 'text-white/80 hover:text-white'
                }`}
              >
                🛏️ Reservar Estadía
              </button>
              <button
                type="button"
                onClick={() => setBookingType('turnos')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                  bookingType === 'turnos' ? 'bg-white text-slate-900 shadow-md' : 'text-white/80 hover:text-white'
                }`}
              >
                ✂️ Pedir Turno
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">

          {/* ── MODE 1: RESERVAS DE HABITACIONES / CABAÑAS ── */}
          {bookingType === 'reservas' && (
            <form onSubmit={handleConfirmReserva} className="space-y-5">
              
              {/* Resource Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">1. Selecciona la unidad</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resources.map((res) => {
                    const isSelected = selectedResource?.id === res.id;
                    const avail = checkResourceAvailability(res.id, startDate, endDate, business.id);
                    return (
                      <div
                        key={res.id}
                        onClick={() => {
                          if (!avail.isAvailable) {
                            showToast(`⚠️ ${avail.reason}`, 'warning');
                          }
                          setSelectedResource(res);
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          !avail.isAvailable
                            ? 'border-rose-300 bg-rose-50/50 dark:bg-rose-900/10 opacity-85'
                            : isSelected
                            ? 'border-[#00a896] bg-teal-50/50 dark:bg-teal-500/10 shadow-md'
                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                        }`}
                      >
                        {res.imageUrl && (
                          <img
                            src={res.imageUrl}
                            alt={res.name}
                            className="w-full h-28 object-cover rounded-xl border border-slate-200 dark:border-white/10 shadow-xs"
                          />
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-black text-sm">{res.name}</h4>
                            {!avail.isAvailable ? (
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[9px] font-black uppercase">
                                🔴 No disponible en estas fechas
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase">
                                🟢 Disponible
                              </span>
                            )}
                          </div>
                          {isSelected && <CheckCircle className={`w-4 h-4 shrink-0 ${!avail.isAvailable ? 'text-rose-500' : 'text-[#00a896]'}`} />}
                        </div>
                        <p className="text-xs font-bold text-slate-500">US$ {res.price} / {res.pricePeriod}</p>
                        <div className="flex flex-wrap gap-1">
                          {res.features.map((f, i) => (
                            <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dates & Guests */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">2. Fechas y Huéspedes</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Check-in</span>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Check-out</span>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Huéspedes</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={guestsCount}
                      onChange={e => setGuestsCount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">3. Tus Datos de Contacto</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre completo *"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-xs font-bold"
                  />
                  <input
                    type="text"
                    required
                    placeholder="WhatsApp (+593 99...)"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-xs font-bold"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Comentario o requerimiento adicional (opcional)"
                  value={customerNotes}
                  onChange={e => setCustomerNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-xs font-bold mt-2"
                />
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500">Resumen de Estadía</p>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                    {selectedResource?.name} • {nights} {nights === 1 ? 'noche' : 'noches'}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#00a896]">US$ {reservationTotal}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                Confirmar y Enviar Reserva por WhatsApp
              </button>
            </form>
          )}

          {/* ── MODE 2: TURNOS / CITAS Y SERVICIOS ── */}
          {bookingType === 'turnos' && (
            <form onSubmit={handleConfirmTurno} className="space-y-5">
              
              {/* Service Catalog Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">1. Selecciona el servicio</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((srv) => {
                    const isSelected = selectedService?.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-[#1e1e38] bg-indigo-50/50 dark:bg-indigo-500/10 shadow-md'
                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#1e1e38] text-white flex items-center justify-center font-black shrink-0">
                            <Scissors className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-sm">{srv.name}</h4>
                            <p className="text-xs text-slate-400">⏱ {srv.durationMin} min</p>
                          </div>
                        </div>
                        <span className="text-base font-black text-indigo-600 dark:text-indigo-400">${srv.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time Slot Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">2. Elige Fecha y Hora</label>
                <div className="space-y-3">
                  <input
                    type="date"
                    required
                    value={shiftDate}
                    onChange={e => setShiftDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-xs font-bold"
                  />
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {TIME_SLOTS.map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setShiftTime(t)}
                        className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          shiftTime === t
                            ? 'bg-[#1e1e38] text-white shadow-md'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">3. Tus Datos</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre completo *"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-xs font-bold"
                  />
                  <input
                    type="text"
                    required
                    placeholder="WhatsApp (+593 99...)"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-xs font-bold"
                  />
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500">Resumen del Turno</p>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                    {selectedService?.name} • {shiftDate} a las {shiftTime}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">US$ {selectedService?.price}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-[#1e1e38] hover:bg-[#2e2e56] text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                Agendar y Enviar Turno por WhatsApp
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
