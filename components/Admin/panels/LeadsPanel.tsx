import React, { useState, useEffect, useMemo } from 'react';
import { 
    Bot, Sparkles, Plus, Search, Trash2, UserPlus, Phone, Mail, 
    MessageSquare, CheckCircle, XCircle, AlertCircle, ExternalLink, 
    Copy, Edit3, Save, RefreshCw, Globe, Building2, Award, ArrowRight,
    ChevronDown, ChevronUp, Clock, HelpCircle, Check, Play, Settings
} from 'lucide-react';
import { Lead, BusinessCategory, Sector, SubscriptionPlan, Business } from '../../../types';
import { 
    subscribeToLeads, createLead, updateLead, deleteLead, createBusiness 
} from '../../../services/firestoreService';
import { generateProspects, generateCustomPitch, ProspectSuggestion } from '../../../services/aiProspectService';
import { useToast } from '../../../context/ToastContext';

interface LeadsPanelProps {
    appConfig: {
        maintenanceMode: boolean;
        openrouterModel: string;
        isSuperUserEnabled: boolean;
    };
}

const LOCALITIES = ['Montañita', 'Olón', 'Manglaralto', 'Ayangue', 'Puerto López', 'Salinas', 'San Pedro'];

export const LeadsPanel: React.FC<LeadsPanelProps> = ({ appConfig }) => {
    const { showToast } = useToast();

    // CRM Leads State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);

    // AI Prospecting Form States
    const [prospectCategory, setProspectCategory] = useState<BusinessCategory>(BusinessCategory.RESTAURANTE);
    const [prospectLocality, setProspectLocality] = useState<string>('Montañita');
    const [prospectFocus, setProspectFocus] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<ProspectSuggestion[]>([]);

    // CRM UI States
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'contacted' | 'interested' | 'converted' | 'rejected'>('all');
    const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Manual Lead Form States
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualCategory, setManualCategory] = useState<BusinessCategory>(BusinessCategory.RESTAURANTE);
    const [manualSector, setManualSector] = useState<Sector>(Sector.CENTRO);
    const [manualLocality, setManualLocality] = useState('Montañita');
    const [manualContact, setManualContact] = useState('');
    const [manualNotes, setManualNotes] = useState('');

    // Inline Editing States (temp buffers)
    const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
    const [editingContact, setEditingContact] = useState<Record<string, string>>({});
    const [customPitchInstructions, setCustomPitchInstructions] = useState<Record<string, string>>({});
    const [isRegeneratingPitchId, setIsRegeneratingPitchId] = useState<string | null>(null);

    // Subscribe to Firestore Leads on mount
    useEffect(() => {
        setLoadingLeads(true);
        const unsubscribe = subscribeToLeads((data) => {
            setLeads(data);
            setLoadingLeads(false);
        });
        return () => unsubscribe();
    }, []);

    // Locality Coordinates Helper for conversion
    const getLocalityCoords = (localityName: string): [number, number] => {
        const lower = localityName.toLowerCase();
        if (lower.includes('olón') || lower.includes('olon')) return [-1.7997, -80.7602];
        if (lower.includes('manglaralto')) return [-1.8497, -80.7454];
        if (lower.includes('ayangue')) return [-1.9864, -80.7533];
        if (lower.includes('puerto lópez') || lower.includes('puerto lopez')) return [-1.5645, -80.8123];
        if (lower.includes('salinas')) return [-2.2183, -80.9583];
        return [-1.8253, -80.7523]; // Default Montañita
    };

    // Category Placeholder Image Helper
    const getCategoryPlaceholderImage = (category: BusinessCategory): string => {
        switch (category) {
            case BusinessCategory.RESTAURANTE:
            case BusinessCategory.BAR:
                return 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=600';
            case BusinessCategory.BAR_DISCOTECA:
            case BusinessCategory.DISCOTECA:
                return 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=600';
            case BusinessCategory.HOSPAJE:
            case BusinessCategory.HOTEL:
            case BusinessCategory.HOSTAL:
                return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600';
            case BusinessCategory.CENTRO_SURF:
            case BusinessCategory.ESCUELA_SURF:
                return 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=600';
            default:
                return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600';
        }
    };

    // CRM Metrics Calculations
    const stats = useMemo(() => {
        const total = leads.length;
        const contacted = leads.filter(l => l.status === 'contacted').length;
        const interested = leads.filter(l => l.status === 'interested').length;
        const converted = leads.filter(l => l.status === 'converted').length;
        const rejected = leads.filter(l => l.status === 'rejected').length;
        const newLeads = leads.filter(l => l.status === 'new').length;
        const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

        return { total, contacted, interested, converted, rejected, newLeads, conversionRate };
    }, [leads]);

    // Handle Prospect generation from AI
    const handleGenerateProspects = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setSuggestions([]);
        try {
            const results = await generateProspects(
                prospectCategory,
                prospectLocality,
                prospectFocus,
                appConfig.openrouterModel
            );
            setSuggestions(results);
            showToast(`Generados 3 prospectos para ${prospectLocality}`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al conectar con la IA de prospección', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // Save prospect from suggestions to CRM
    const handleSaveProspectToCRM = async (prospect: ProspectSuggestion) => {
        try {
            const newLead: Omit<Lead, 'id'> = {
                name: prospect.name,
                category: prospect.category,
                sector: prospect.sector,
                locality: prospect.locality,
                contact: prospect.contact,
                status: 'new',
                notes: prospect.description + ` (Plan Sugerido: ${prospect.estimatedPlan})`,
                aiPitch: prospect.aiPitch,
                createdAt: new Date()
            };
            await createLead(newLead);
            showToast(`¡${prospect.name} guardado en leads!`, 'success');
            // Remove from suggestions list
            setSuggestions(prev => prev.filter(s => s.name !== prospect.name));
        } catch (error) {
            showToast('Error al guardar el lead en Firestore', 'error');
        }
    };

    // Add Lead Manually
    const handleAddManualLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualName.trim()) {
            showToast('El nombre es obligatorio', 'error');
            return;
        }

        try {
            const newLead: Omit<Lead, 'id'> = {
                name: manualName,
                category: manualCategory,
                sector: manualSector,
                locality: manualLocality,
                contact: manualContact,
                status: 'new',
                notes: manualNotes,
                aiPitch: 'Pitch no generado. Haz clic en "Regenerar con IA" para redactar un pitch comercial.',
                createdAt: new Date()
            };

            await createLead(newLead);
            showToast(`Lead ${manualName} creado con éxito`, 'success');
            
            // Reset states
            setManualName('');
            setManualContact('');
            setManualNotes('');
            setShowManualModal(false);
        } catch (error) {
            showToast('Error al crear el lead', 'error');
        }
    };

    // Convert Lead to real Business
    const handleConvertToBusiness = async (lead: Lead) => {
        try {
            const coords = getLocalityCoords(lead.locality);
            const image = getCategoryPlaceholderImage(lead.category);

            const businessData: Omit<Business, 'id'> = {
                name: lead.name,
                category: lead.category,
                sector: lead.sector,
                locality: lead.locality,
                description: lead.notes || `Negocio de ${lead.category} en ${lead.locality}.`,
                isVerified: true,
                isPublished: true,
                coordinates: coords,
                imageUrl: image,
                whatsapp: lead.contact?.startsWith('+') || /^\d+$/.test(lead.contact || '') ? lead.contact : '',
                email: lead.contact?.includes('@') ? lead.contact : '',
                plan: SubscriptionPlan.FREE,
                followerCount: 0,
                reviewCount: 0,
                rating: 5.0,
                ownerId: 'admin',
                isReference: false
            };

            const businessId = await createBusiness(businessData);

            // Update Lead state to converted and attach businessId
            await updateLead(lead.id!, {
                status: 'converted',
                notes: (lead.notes ? lead.notes + ' | ' : '') + `Convertido en Negocio ID: ${businessId}`
            });

            showToast(`¡Lead convertido en Negocio con éxito! ID: ${businessId}`, 'success');
        } catch (error) {
            console.error('Error al convertir lead a negocio:', error);
            showToast('Error al registrar negocio', 'error');
        }
    };

    // Inline details update
    const handleUpdateField = async (leadId: string, field: 'notes' | 'contact', value: string) => {
        try {
            await updateLead(leadId, { [field]: value });
            showToast('Campo guardado', 'success');
        } catch (error) {
            showToast('Error al guardar cambios', 'error');
        }
    };

    // Update Status
    const handleUpdateStatus = async (leadId: string, newStatus: Lead['status']) => {
        try {
            await updateLead(leadId, { status: newStatus });
            showToast(`Estado cambiado a ${newStatus}`, 'success');
        } catch (error) {
            showToast('Error al cambiar de estado', 'error');
        }
    };

    // Delete Lead
    const handleDeleteLead = async (leadId: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este lead?')) {
            try {
                await deleteLead(leadId);
                showToast('Lead eliminado', 'success');
            } catch (error) {
                showToast('Error al eliminar lead', 'error');
            }
        }
    };

    // Copy Sales Pitch to Clipboard
    const copyPitch = (pitch: string, leadId: string) => {
        navigator.clipboard.writeText(pitch);
        setCopiedId(leadId);
        showToast('Pitch copiado al portapapeles', 'success');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Regenerate sales pitch using AI
    const handleRegeneratePitch = async (lead: Lead) => {
        setIsRegeneratingPitchId(lead.id!);
        try {
            const newPitch = await generateCustomPitch(
                lead.name,
                lead.category,
                lead.locality,
                lead.notes,
                customPitchInstructions[lead.id!] || '',
                appConfig.openrouterModel
            );

            await updateLead(lead.id!, { aiPitch: newPitch });
            setCustomPitchInstructions(prev => ({ ...prev, [lead.id!]: '' }));
            showToast('Pitch comercial regenerado con IA', 'success');
        } catch (error) {
            showToast('Error al regenerar pitch', 'error');
        } finally {
            setIsRegeneratingPitchId(null);
        }
    };

    // Filter and search CRM Leads
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.locality.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesFilter = activeFilter === 'all' || lead.status === activeFilter;

            return matchesSearch && matchesFilter;
        });
    }, [leads, searchQuery, activeFilter]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            
            {/* Lead Metrics KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard title="Total Leads" value={stats.total} subtitle="Prospectos registrados" color="sky" />
                <MetricCard title="Nuevos" value={stats.newLeads} subtitle="Sin contactar" color="orange" />
                <MetricCard title="Interesados" value={stats.interested} subtitle="Con buena recepción" color="violet" />
                <MetricCard title="Convertidos" value={stats.converted} subtitle="Negocios registrados" color="emerald" />
                <MetricCard title="Conversión" value={`${stats.conversionRate}%`} subtitle="Tasa de éxito" color="rose" />
            </div>

            {/* AI Prospecting Form */}
            <div className="bg-neutral-900/50 border border-white/5 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center border border-white/10 shadow-lg shadow-orange-500/20">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                Prospección Inteligente
                                <span className="text-[8px] bg-gradient-to-r from-orange-500 to-pink-500 px-2 py-0.5 rounded text-white font-black uppercase">IA</span>
                            </h4>
                            <p className="text-[10px] text-slate-500">Busca nuevos locales comerciales y genera propuestas comerciales autónomas</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setShowManualModal(true)}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Plus className="w-4 h-4 text-orange-500" />
                        Lead Manual
                    </button>
                </div>

                <form onSubmit={handleGenerateProspects} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría del Negocio</label>
                        <select 
                            value={prospectCategory}
                            onChange={e => setProspectCategory(e.target.value as BusinessCategory)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500/50 transition-colors"
                        >
                            {Object.values(BusinessCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localidad Costera</label>
                        <select 
                            value={prospectLocality}
                            onChange={e => setProspectLocality(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500/50 transition-colors"
                        >
                            {LOCALITIES.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle / Foco Extra (Opcional)</label>
                        <input 
                            type="text" 
                            value={prospectFocus}
                            onChange={e => setProspectFocus(e.target.value)}
                            placeholder="Ej: Solo pet-friendly, estilo boho..."
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500/50 placeholder:text-slate-600 transition-colors"
                        />
                    </div>

                    <div className="md:col-span-3 pt-2">
                        <button 
                            type="submit" 
                            disabled={isGenerating}
                            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Buscando y redactando pitches comerciales...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generar Prospectos con IA
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* AI Suggestions Results */}
                {suggestions.length > 0 && (
                    <div className="mt-8 space-y-6 border-t border-white/5 pt-8">
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                            Propuestas Comerciales Sugeridas por IA
                        </h5>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {suggestions.map((sug, idx) => (
                                <div key={idx} className="bg-black/30 border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-orange-500/20 transition-all group">
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h6 className="text-sm font-black text-white group-hover:text-orange-400 transition-colors">{sug.name}</h6>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                    <span className="text-[8px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-400 uppercase font-black">{sug.category}</span>
                                                    <span className="text-[8px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded uppercase font-black">{sug.sector}</span>
                                                </div>
                                            </div>
                                            <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full text-emerald-400 font-bold uppercase tracking-wider">
                                                Plan: {sug.estimatedPlan}
                                            </span>
                                        </div>

                                        <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">{sug.description}</p>
                                        
                                        <div className="p-4 bg-neutral-900/60 border border-white/5 rounded-2xl space-y-2">
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <MessageSquare className="w-3 h-3 text-orange-500" />
                                                Pitch Comercial IA:
                                            </p>
                                            <p className="text-[9px] text-slate-300 italic leading-relaxed">"{sug.aiPitch}"</p>
                                        </div>

                                        <div className="text-[9px] text-slate-500 flex items-center gap-2">
                                            <span className="font-black text-slate-400 uppercase">Contacto sugerido:</span>
                                            <span className="bg-white/5 px-2 py-0.5 rounded text-white border border-white/5">{sug.contact}</span>
                                        </div>
                                    </div>

                                    <div className="pt-6 mt-6 border-t border-white/5">
                                        <button 
                                            onClick={() => handleSaveProspectToCRM(sug)}
                                            className="w-full bg-white/5 hover:bg-orange-500 hover:text-black border border-white/15 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Agregar a leads
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* CRM Leads Dashboard */}
            <div className="bg-neutral-900/50 border border-white/5 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Leads y Embudo de Conversión</h4>
                        <p className="text-[10px] text-slate-500">Administra y contacta negocios prospectados</p>
                    </div>

                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar lead, categoría o localidad..."
                            className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white outline-none focus:border-orange-500/50 placeholder:text-slate-600 transition-colors"
                        />
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5 pb-4 mb-6">
                    <FilterTab active={activeFilter === 'all'} label="Todos" count={stats.total} onClick={() => setActiveFilter('all')} />
                    <FilterTab active={activeFilter === 'new'} label="Nuevos" count={stats.newLeads} onClick={() => setActiveFilter('new')} />
                    <FilterTab active={activeFilter === 'contacted'} label="Contactados" count={stats.contacted} onClick={() => setActiveFilter('contacted')} />
                    <FilterTab active={activeFilter === 'interested'} label="Interesados" count={stats.interested} onClick={() => setActiveFilter('interested')} />
                    <FilterTab active={activeFilter === 'converted'} label="Convertidos" count={stats.converted} onClick={() => setActiveFilter('converted')} />
                    <FilterTab active={activeFilter === 'rejected'} label="Rechazados" count={stats.rejected} onClick={() => setActiveFilter('rejected')} />
                </div>

                {/* Leads Listing */}
                {loadingLeads ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                        <p className="text-xs font-black uppercase tracking-widest">Cargando base de leads...</p>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/5 rounded-3xl">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-2">No se encontraron leads</p>
                        <p className="text-[10px] text-slate-600">Comienza buscando con IA o agrega un lead manual en la parte superior.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredLeads.map((lead) => {
                            const isExpanded = expandedLeadId === lead.id;
                            const notesBuffer = editingNotes[lead.id!] ?? lead.notes ?? '';
                            const contactBuffer = editingContact[lead.id!] ?? lead.contact ?? '';
                            const hasChanges = notesBuffer !== lead.notes || contactBuffer !== lead.contact;

                            return (
                                <div 
                                    key={lead.id} 
                                    className={`bg-black/30 border border-white/5 rounded-2xl transition-all ${isExpanded ? 'border-orange-500/20 shadow-lg' : 'hover:border-white/10'}`}
                                >
                                    {/* Main Row */}
                                    <div 
                                        onClick={() => setExpandedLeadId(isExpanded ? null : lead.id!)}
                                        className="p-5 flex items-center justify-between flex-wrap gap-4 cursor-pointer select-none"
                                    >
                                        <div className="flex items-center gap-4 min-w-[200px]">
                                            <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center border border-white/5 shadow-inner">
                                                <Building2 className="w-4 h-4 text-orange-500" />
                                            </div>
                                            <div>
                                                <h6 className="text-xs font-black text-white tracking-wide">{lead.name}</h6>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-[8px] text-slate-400 uppercase font-black">{lead.category}</span>
                                                    <span className="text-[8px] text-slate-600 font-bold">•</span>
                                                    <span className="text-[8px] text-slate-400 font-black flex items-center gap-1 uppercase">
                                                        <Globe className="w-2 h-2 text-slate-500" />
                                                        {lead.locality}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Status Badge Select (Stop propagation to prevent toggle expand) */}
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => handleUpdateStatus(lead.id!, e.target.value as any)}
                                                    className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all cursor-pointer ${getStatusStyles(lead.status)}`}
                                                >
                                                    <option value="new">Nuevo</option>
                                                    <option value="contacted">Contactado</option>
                                                    <option value="interested">Interesado</option>
                                                    <option value="converted">Convertido</option>
                                                    <option value="rejected">Rechazado</option>
                                                </select>
                                            </div>

                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                        </div>
                                    </div>

                                    {/* Expanded Detail Panel */}
                                    {isExpanded && (
                                        <div className="px-5 pb-6 border-t border-white/5 pt-5 bg-black/10 rounded-b-2xl space-y-6">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                
                                                {/* Left side: Notes and Details */}
                                                <div className="space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Información de Contacto</label>
                                                        <input 
                                                            type="text" 
                                                            value={contactBuffer}
                                                            onChange={e => setEditingContact(prev => ({ ...prev, [lead.id!]: e.target.value }))}
                                                            className="w-full bg-neutral-900/60 border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-orange-500/50"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Notas y Bitácora CRM</label>
                                                        <textarea 
                                                            rows={3}
                                                            value={notesBuffer}
                                                            onChange={e => setEditingNotes(prev => ({ ...prev, [lead.id!]: e.target.value }))}
                                                            className="w-full bg-neutral-900/60 border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-orange-500/50 resize-none"
                                                        />
                                                    </div>

                                                    {hasChanges && (
                                                        <button 
                                                            onClick={() => {
                                                                handleUpdateField(lead.id!, 'notes', notesBuffer);
                                                                handleUpdateField(lead.id!, 'contact', contactBuffer);
                                                            }}
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95"
                                                        >
                                                            <Save className="w-3.5 h-3.5" />
                                                            Guardar Cambios
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Right side: AI Sales Pitch */}
                                                <div className="space-y-3 bg-neutral-950/60 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                                                                Pitch Comercial de IA
                                                            </span>
                                                            <button 
                                                                onClick={() => copyPitch(lead.aiPitch || '', lead.id!)}
                                                                className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5 transition-all"
                                                                title="Copiar pitch comercial"
                                                            >
                                                                {copiedId === lead.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] text-slate-300 leading-relaxed italic">
                                                            {lead.aiPitch ? `"${lead.aiPitch}"` : 'Sin pitch generado.'}
                                                        </p>
                                                    </div>

                                                    {/* Custom Regeneration Settings */}
                                                    <div className="border-t border-white/5 pt-4 mt-4 space-y-2">
                                                        <input 
                                                            type="text" 
                                                            value={customPitchInstructions[lead.id!] ?? ''}
                                                            onChange={e => setCustomPitchInstructions(prev => ({ ...prev, [lead.id!]: e.target.value }))}
                                                            placeholder="Instrucciones del pitch (ej: foco en happy hour)..."
                                                            className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] text-white outline-none focus:border-orange-500/50"
                                                        />
                                                        <button 
                                                            disabled={isRegeneratingPitchId === lead.id}
                                                            onClick={() => handleRegeneratePitch(lead)}
                                                            className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white p-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            {isRegeneratingPitchId === lead.id ? (
                                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <RefreshCw className="w-3 h-3" />
                                                            )}
                                                            Personalizar y regenerar con IA
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex items-center justify-between border-t border-white/5 pt-4 flex-wrap gap-4">
                                                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>Registrado el: {lead.createdAt?.toLocaleDateString()}</span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={() => handleDeleteLead(lead.id!)}
                                                        className="text-slate-500 hover:text-red-500 p-2 rounded-xl hover:bg-red-500/5 transition-all"
                                                        title="Eliminar Lead"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    
                                                    {lead.status !== 'converted' ? (
                                                        <button 
                                                            onClick={() => handleConvertToBusiness(lead)}
                                                            className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-orange-500/10 active:scale-95"
                                                        >
                                                            <UserPlus className="w-3.5 h-3.5" />
                                                            Convertir en Negocio
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider">
                                                            <Check className="w-3.5 h-3.5" />
                                                            Convertido con éxito
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Manual Lead Creation Modal */}
            {showManualModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[3000] flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-white/10 w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setShowManualModal(false)}
                            className="absolute right-4 top-4 p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>

                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Crear Lead Manual</h4>
                            <p className="text-[10px] text-slate-500">Agrega un nuevo prospecto de negocio para tu embudo comercial</p>
                        </div>

                        <form onSubmit={handleAddManualLead} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre del Negocio</label>
                                <input 
                                    type="text" 
                                    required
                                    value={manualName}
                                    onChange={e => setManualName(e.target.value)}
                                    placeholder="Selina Montañita, Ocean Reef, etc."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-orange-500/50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                                    <select 
                                        value={manualCategory}
                                        onChange={e => setManualCategory(e.target.value as BusinessCategory)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-orange-500/50"
                                    >
                                        {Object.values(BusinessCategory).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sector</label>
                                    <select 
                                        value={manualSector}
                                        onChange={e => setManualSector(e.target.value as Sector)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-orange-500/50"
                                    >
                                        {Object.values(Sector).map(sec => (
                                            <option key={sec} value={sec}>{sec}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Localidad</label>
                                <select 
                                    value={manualLocality}
                                    onChange={e => setManualLocality(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-orange-500/50"
                                >
                                    {LOCALITIES.map(loc => (
                                        <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Canal de Contacto</label>
                                <input 
                                    type="text" 
                                    value={manualContact}
                                    onChange={e => setManualContact(e.target.value)}
                                    placeholder="Ej: +59399... / @negocio en Instagram"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-orange-500/50"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notas iniciales / Descripción</label>
                                <textarea 
                                    rows={2}
                                    value={manualNotes}
                                    onChange={e => setManualNotes(e.target.value)}
                                    placeholder="Detalles sobre el local..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-orange-500/50 resize-none"
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="w-full bg-orange-500 hover:bg-orange-600 text-black p-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Crear Lead
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

/* --- Mini-Components --- */

const MetricCard: React.FC<{ title: string, value: number | string, subtitle: string, color: 'sky' | 'orange' | 'violet' | 'emerald' | 'rose' }> = ({ title, value, subtitle, color }) => {
    const colorStyles = {
        sky: 'from-sky-500/10 to-blue-500/5 border-sky-500/20 text-sky-400',
        orange: 'from-orange-500/10 to-red-500/5 border-orange-500/20 text-orange-400',
        violet: 'from-violet-500/10 to-indigo-500/5 border-violet-500/20 text-violet-400',
        emerald: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-emerald-400',
        rose: 'from-rose-500/10 to-pink-500/5 border-rose-500/20 text-rose-400'
    };

    return (
        <div className={`bg-gradient-to-br ${colorStyles[color]} border p-5 rounded-3xl flex flex-col justify-between shadow-lg`}>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{title}</span>
            <div className="my-2">
                <span className="text-2xl font-black tracking-tight">{value}</span>
            </div>
            <span className="text-[8px] text-slate-500 font-bold uppercase">{subtitle}</span>
        </div>
    );
};

const FilterTab: React.FC<{ active: boolean, label: string, count: number, onClick: () => void }> = ({ active, label, count, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border shrink-0 ${active ? 'bg-orange-500 text-black border-orange-500 font-black shadow-md shadow-orange-500/15' : 'bg-transparent text-slate-400 border-white/5 hover:border-white/10 hover:text-white'}`}
    >
        {label}
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-black/15 text-black' : 'bg-white/5 text-slate-500'}`}>{count}</span>
    </button>
);

const getStatusStyles = (status: Lead['status']) => {
    switch (status) {
        case 'new': return 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20';
        case 'contacted': return 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20';
        case 'interested': return 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20';
        case 'converted': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25';
        case 'rejected': return 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20';
        default: return 'bg-white/5 text-slate-400 border-white/5';
    }
};
