import React, { useState, useEffect } from 'react';
import { googleApiService, Contacto } from '../services/googleApiService';

interface ContactListProps {
  defaultTenant?: string;
}

export default function ContactList({ defaultTenant = 'montapulse' }: ContactListProps) {
  const [tenantId, setTenantId] = useState<string>(defaultTenant);
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Modal de recordatorio
  const [activeContact, setActiveContact] = useState<Contacto | null>(null);
  const [reminderTitle, setReminderTitle] = useState<string>('');
  const [reminderDesc, setReminderDesc] = useState<string>('');
  const [reminderDate, setReminderDate] = useState<string>('');
  const [reminderStatus, setReminderStatus] = useState<string>('');

  const fetchContacts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await googleApiService.getContacts(tenantId);
      setContacts(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener los contactos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [tenantId]);

  const filteredContacts = contacts.filter((c) => {
    const search = searchTerm.toLowerCase();
    return (
      (c.nombre && c.nombre.toLowerCase().includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search)) ||
      (c.id && c.id.toString().toLowerCase().includes(search))
    );
  });

  const handleOpenReminder = (contact: Contacto) => {
    setActiveContact(contact);
    setReminderTitle(`Cobro pendiente: ${contact.nombre}`);
    setReminderDesc(`Recordatorio de pago para el socio ${contact.id || ''}. Correo: ${contact.email || 'N/A'}`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReminderDate(tomorrow.toISOString().split('T')[0]);
    setReminderStatus('');
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl max-w-5xl mx-auto my-6 text-slate-100 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Directorio de Contactos</h2>
          <p className="text-sm text-slate-400 mt-1">Gestión multi-tenant de clientes y socios</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-700">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tenant:</label>
          <select 
            value={tenantId} 
            onChange={(e) => setTenantId(e.target.value)} 
            className="bg-transparent text-blue-400 font-bold outline-none cursor-pointer text-sm"
            disabled={loading}
          >
            <option value="montapulse" className="bg-slate-800 text-slate-100">Montapulse</option>
            <option value="junta_agua" className="bg-slate-800 text-slate-100">Junta de Agua</option>
            <option value="trueque" className="bg-slate-800 text-slate-100">Trueque</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, correo o ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 outline-none focus:border-blue-500 transition-colors text-sm"
        />
        <button 
          onClick={fetchContacts} 
          className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium px-4 py-2 rounded-xl border border-slate-600 text-sm transition-all" 
          disabled={loading}
        >
          {loading ? 'Cargando...' : '🔄 Actualizar'}
        </button>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm mb-6">⚠️ {error}</div>}

      <div className="overflow-x-auto border border-slate-700 rounded-xl bg-slate-900">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/50">
              <th className="p-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">ID</th>
              <th className="p-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Nombre</th>
              <th className="p-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Correo</th>
              <th className="p-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Teléfono</th>
              <th className="p-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact, idx) => (
                <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/35 transition-colors">
                  <td className="p-4 text-sm font-semibold text-slate-400">{contact.id || contact.id || idx + 1}</td>
                  <td className="p-4 text-sm text-slate-200 font-medium">{contact.nombre}</td>
                  <td className="p-4 text-sm text-slate-400">{contact.email || '-'}</td>
                  <td className="p-4 text-sm text-slate-400">{contact.telefono || '-'}</td>
                  <td className="p-4 text-sm">
                    <button 
                      onClick={() => handleOpenReminder(contact)}
                      className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-semibold text-xs px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all"
                    >
                      📅 Cobro
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                  {loading ? 'Cargando registros...' : 'No se encontraron contactos para este tenant.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {activeContact && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Agendar Recordatorio</h3>
              <button onClick={() => setActiveContact(null)} className="text-slate-400 hover:text-white text-2xl font-bold">&times;</button>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Título</label>
                <input type="text" value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-blue-500 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Fecha</label>
                <input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-blue-500 text-sm" required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveContact(null)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium px-4 py-2 rounded-xl text-xs">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs">Crear Evento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
