import React from 'react';
import { X } from 'lucide-react';
import { useData } from '../../context/DataContext';

export const PaymentEditModal: React.FC = () => {
    const { paymentDetails, setPaymentDetails, setShowPaymentEdit, handleUpdatePaymentDetails } = useData();

    if (!paymentDetails) return null;

    return (
        <div className="fixed inset-0 z-[2100] bg-slate-900/80 backdrop-blur-md flex items-end justify-center">
            <div className="w-full max-w-lg bg-slate-900 rounded-t-[3.5rem] p-8 pb-12 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-white">Editar Formas de Pago</h2>
                    <button onClick={() => setShowPaymentEdit(false)} className="p-2 rounded-full hover:bg-slate-800">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Región/Banco (Header)</label>
                        <input
                            type="text"
                            value={paymentDetails.bankRegion}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, bankRegion: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                            placeholder="Ej: Pichincha (Ecuador)"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Nombre del Banco</label>
                            <input
                                type="text"
                                value={paymentDetails.bankName}
                                onChange={(e) => setPaymentDetails({ ...paymentDetails, bankName: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Tipo de Cuenta</label>
                            <input
                                type="text"
                                value={paymentDetails.accountType}
                                onChange={(e) => setPaymentDetails({ ...paymentDetails, accountType: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Número de Cuenta</label>
                        <input
                            type="text"
                            value={paymentDetails.accountNumber}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, accountNumber: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Información de Contacto</label>
                        <input
                            type="text"
                            value={paymentDetails.contactInfo}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, contactInfo: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                            placeholder="Nombre del titular o CI"
                        />
                    </div>

                    <button
                        onClick={handleUpdatePaymentDetails}
                        className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl hover:bg-sky-600 transition"
                    >
                        Guardar Información de Pago
                    </button>
                </div>
            </div>
        </div>
    );
};
