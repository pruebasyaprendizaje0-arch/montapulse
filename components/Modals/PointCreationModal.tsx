import React, { useState } from 'react';
import { X, CheckCircle, MapPin, Store, Edit3, Zap } from 'lucide-react';
import { BusinessCategory } from '../../types';
import { MAP_ICONS } from '../../constants';

interface PointCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    category: BusinessCategory;
    icon: string;
    isReference: boolean;
    coordinates: [number, number];
    locality: string;
    sector: string;
  }) => void;
  onCancel: () => void;
  initialData?: {
    name: string;
    description: string;
    category: BusinessCategory;
    icon: string;
    isReference: boolean;
  };
  coordinates: [number, number];
  locality: string;
  sector: string;
}

export const PointCreationModal: React.FC<PointCreationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onCancel,
  initialData,
  coordinates,
  locality,
  sector
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState<BusinessCategory>(initialData?.category || BusinessCategory.OTRO);
  const [icon, setIcon] = useState(initialData?.icon || 'map');
  const [isReference, setIsReference] = useState(initialData?.isReference || false);

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Por favor ingresa un nombre para el punto');
      return;
    }
    
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      icon,
      isReference,
      coordinates,
      locality,
      sector
    });
  };

  const filteredCategories = Object.values(BusinessCategory).filter(cat => 
    isReference 
      ? [BusinessCategory.PARQUE, BusinessCategory.CANCHA, BusinessCategory.MALECON, BusinessCategory.MERCADO, BusinessCategory.PARADA_TAXI, BusinessCategory.PLAYA, BusinessCategory.OTRO].includes(cat)
      : ![BusinessCategory.PARQUE, BusinessCategory.CANCHA, BusinessCategory.MALECON, BusinessCategory.MERCADO, BusinessCategory.PARADA_TAXI, BusinessCategory.PLAYA, BusinessCategory.REFERENCIA].includes(cat)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2100] bg-slate-900/80 backdrop-blur-md flex items-end justify-center p-4 overflow-y-auto no-scrollbar">
      <div className="w-full max-w-md bg-slate-900 rounded-t-[3.5rem] p-8 pb-12 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center">
              {isReference ? <MapPin className="w-5 h-5 text-white" /> : <Store className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                {isReference ? 'Nuevo Punto de Referencia' : 'Nuevo Negocio'}
              </h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                Configura los detalles básicos
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-2.5 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Coordenadas Preview */}
        <div className="bg-slate-800/30 rounded-2xl p-4 mb-6 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-black text-orange-400 uppercase tracking-widest">Ubicación</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Lat: {coordinates[0].toFixed(6)}<br />
            Lng: {coordinates[1].toFixed(6)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {locality} - {sector}
          </div>
        </div>

        {/* Point Type Selector */}
        <div className="mb-6">
          <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Tipo de Punto</label>
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-800/30 rounded-[2rem] border border-white/5">
            <button
              type="button"
              onClick={() => setIsReference(false)}
              className={`flex flex-col items-center justify-center py-3 rounded-[1.5rem] transition-all gap-2 ${!isReference ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Store className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-widest">Negocio</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReference(true)}
              className={`flex flex-col items-center justify-center py-3 rounded-[1.5rem] transition-all gap-2 ${isReference ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <MapPin className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-widest">Referencia</span>
            </button>
          </div>
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <label className="text-xs font-black text-slate-500 uppercase mb-2 block tracking-widest">
            {isReference ? 'Nombre del Punto' : 'Nombre Comercial'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            placeholder={isReference ? "Ej: Letras de Montañita" : "Nombre del negocio"}
          />
        </div>

        {/* Category Selection */}
        <div className="mb-6">
          <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as BusinessCategory)}
            className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none appearance-none transition-all"
          >
            {filteredCategories.map((cat: BusinessCategory) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Icon Selection */}
        <div className="mb-6">
          <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Icono del Mapa</label>
          <div className="grid grid-cols-6 gap-2 p-2 bg-slate-800/30 rounded-2xl border border-white/5">
            {MAP_ICONS.slice(0, 12).map(i => (
              <button
                key={i.id}
                type="button"
                onClick={() => setIcon(i.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${icon === i.id ? 'bg-orange-500 scale-110' : 'bg-slate-800/50 border border-transparent'}`}
                title={i.label}
              >
                {i.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <label className="text-xs font-black text-slate-500 uppercase mb-2 block tracking-widest">Descripción</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
            placeholder="Describe brevemente el punto..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-slate-800/50 text-slate-400 font-bold rounded-2xl hover:bg-slate-700 transition-all border border-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Crear Punto
          </button>
        </div>
      </div>
    </div>
  );
};