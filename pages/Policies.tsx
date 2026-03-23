import React, { useState, useEffect } from 'react';
import { Shield, Lock, FileText, ChevronLeft, ArrowRight, Edit3, Save, X, Plus, Trash2, Share2, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { PolicyData, PolicySection } from '../types';

export const Policies: React.FC = () => {
    const navigate = useNavigate();
    const { policyData, handleUpdatePolicies, isSuperUser } = useData();
    const { showToast, showConfirm } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<PolicyData>(policyData);

    useEffect(() => {
        setEditForm(policyData);
    }, [policyData]);

    const handleSave = async () => {
        await handleUpdatePolicies(editForm);
        setIsEditing(false);
    };

    const handleShare = async () => {
        const shareData = {
            title: 'Políticas y Privacidad - Montapulse',
            text: 'Consulta los Términos de Servicio y la Política de Privacidad de Montapulse.',
            url: window.location.href
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    copyToClipboard();
                }
            }
        } else {
            copyToClipboard();
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        showToast('Enlace copiado al portapapeles', 'info');
    };

    const addSection = (type: 'terms' | 'privacy') => {
        setEditForm(prev => ({
            ...prev,
            [type]: [...prev[type], { title: '', content: '' }]
        }));
    };

    const removeSection = async (type: 'terms' | 'privacy', index: number) => {
        const section = editForm[type][index];
        const confirmed = await showConfirm(
            `¿Estás seguro de que deseas eliminar la sección "${section.title || 'sin título'}"?`,
            'Eliminar Sección'
        );
        
        if (confirmed) {
            setEditForm(prev => ({
                ...prev,
                [type]: prev[type].filter((_, i) => i !== index)
            }));
            showToast('Sección eliminada temporalmente. No olvides guardar cambios.', 'info');
        }
    };

    const updateSection = (type: 'terms' | 'privacy', index: number, field: keyof PolicySection, value: string) => {
        setEditForm(prev => {
            const newSections = [...prev[type]];
            newSections[index] = { ...newSections[index], [field]: value };
            return { ...prev, [type]: newSections };
        });
    };

    const renderSections = (sections: PolicySection[], colorClass: string, bgClass: string) => (
        <div className="space-y-6 text-slate-300 leading-relaxed">
            {sections.map((section, idx) => (
                <div key={idx} className="space-y-3 print-section">
                    <h4 className={`text-white font-bold flex items-center gap-2 print-title ${colorClass}`}>
                        <div className={`w-1 h-4 ${bgClass} rounded-full print:hidden`} />
                        {section.title}
                    </h4>
                    <p className="text-sm pl-3 border-l border-white/10 whitespace-pre-wrap print-content">
                        {section.content}
                    </p>
                </div>
            ))}
        </div>
    );

    return (
        <div className="h-auto bg-slate-950 text-white pb-32 selection:bg-orange-500/30 print:bg-white print:text-black print:pb-0">
            <style>{`
                @media print {
                    /* Root-level resets to allow full document printing in a SPA */
                    html, body, #root, #root > div {
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                        background: white !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .print-section {
                        color: black !important;
                        background: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin-bottom: 2rem !important;
                        padding: 0 !important;
                        page-break-inside: avoid;
                    }

                    .print-title {
                        color: black !important;
                        font-size: 1.5rem !important;
                        margin-bottom: 0.5rem !important;
                    }

                    .print-content {
                        color: #333 !important;
                        font-size: 1rem !important;
                        line-height: 1.5 !important;
                    }

                    /* Hide nav bars and other chrome */
                    nav, .sticky, footer, .fixed:not(.print-fixed) {
                        display: none !important;
                    }

                    .max-w-3xl {
                        max-width: 100% !important;
                        padding: 0 !important;
                    }
                }
            `}</style>
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <div className="sticky top-0 z-50 bg-slate-950/60 backdrop-blur-2xl border-b border-white/5 p-6 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-slate-900 border border-white/5 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 group mb-0"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-sm font-black uppercase tracking-[0.3em] bg-gradient-to-r from-orange-400 to-amber-600 bg-clip-text text-transparent">
                        Políticas y Privacidad
                    </h1>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">
                        v{policyData.version} • Última actualización: {policyData.lastUpdated}
                    </span>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    {isSuperUser && (
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`p-3 rounded-2xl transition-all active:scale-95 group flex items-center gap-2 no-print ${
                                isEditing 
                                ? 'bg-orange-500 text-white border-orange-400' 
                                : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {isEditing ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                        </button>
                    )}
                    <button
                        onClick={handleShare}
                        className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all active:scale-95 group text-slate-400 hover:text-white no-print"
                        title="Compartir enlace"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all active:scale-95 group text-slate-400 hover:text-white no-print"
                        title="Imprimir Políticas"
                    >
                        <Printer className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="p-8 max-w-3xl mx-auto space-y-16 relative z-10">
                {isEditing ? (
                    /* Edit Interface */
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                        <section className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-10 border border-orange-500/30 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-4">Versión</label>
                                    <input 
                                        type="text" 
                                        value={editForm.version}
                                        onChange={e => setEditForm(prev => ({ ...prev, version: e.target.value }))}
                                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 transition-all outline-none"
                                        placeholder="2.0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-4">Última Actualización</label>
                                    <input 
                                        type="text" 
                                        value={editForm.lastUpdated}
                                        onChange={e => setEditForm(prev => ({ ...prev, lastUpdated: e.target.value }))}
                                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 transition-all outline-none"
                                        placeholder="Marzo 2024"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black">Términos del Servicio</h3>
                                    <button onClick={() => addSection('terms')} className="p-2 bg-orange-500/10 rounded-xl text-orange-400 hover:bg-orange-500 hover:text-white transition-all">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                {editForm.terms.map((section, idx) => (
                                    <div key={idx} className="p-6 bg-slate-950/50 rounded-3xl border border-white/5 space-y-4">
                                        <div className="flex gap-4">
                                            <input 
                                                type="text" 
                                                value={section.title}
                                                onChange={e => updateSection('terms', idx, 'title', e.target.value)}
                                                className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-orange-500/30"
                                                placeholder="Título de la sección"
                                            />
                                            <button onClick={() => removeSection('terms', idx)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <textarea 
                                            value={section.content}
                                            onChange={e => updateSection('terms', idx, 'content', e.target.value)}
                                            className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm min-h-[100px] outline-none focus:border-orange-500/30 resize-none"
                                            placeholder="Contenido de la sección..."
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-amber-500">Política de Privacidad</h3>
                                    <button onClick={() => addSection('privacy')} className="p-2 bg-amber-500/10 rounded-xl text-amber-400 hover:bg-amber-500 hover:text-white transition-all">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                {editForm.privacy.map((section, idx) => (
                                    <div key={idx} className="p-6 bg-slate-950/50 rounded-3xl border border-white/5 space-y-4">
                                        <div className="flex gap-4">
                                            <input 
                                                type="text" 
                                                value={section.title}
                                                onChange={e => updateSection('privacy', idx, 'title', e.target.value)}
                                                className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-amber-500/30"
                                                placeholder="Título de la sección"
                                            />
                                            <button onClick={() => removeSection('privacy', idx)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <textarea 
                                            value={section.content}
                                            onChange={e => updateSection('privacy', idx, 'content', e.target.value)}
                                            className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm min-h-[100px] outline-none focus:border-amber-500/30 resize-none"
                                            placeholder="Contenido de la sección..."
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-4">Descargo de Responsabilidad</label>
                                <textarea 
                                    value={editForm.disclaimer}
                                    onChange={e => setEditForm(prev => ({ ...prev, disclaimer: e.target.value }))}
                                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 min-h-[120px] focus:border-blue-500/50 transition-all outline-none resize-none text-sm italic"
                                    placeholder="Texto legal de descargo..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-4">Email de Soporte</label>
                                <input 
                                    type="email" 
                                    value={editForm.supportEmail}
                                    onChange={e => setEditForm(prev => ({ ...prev, supportEmail: e.target.value }))}
                                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 focus:border-green-500/50 transition-all outline-none"
                                    placeholder="soporte@montapulse.com"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full py-5 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black rounded-3xl shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <Save className="w-5 h-5" />
                                Guardar Cambios
                            </button>
                        </section>
                    </div>
                ) : (
                    /* Display Interface */
                    <>
                        {/* Intro */}
                        <div className="text-center space-y-6 pt-8">
                            <div className="inline-flex p-6 bg-gradient-to-tr from-orange-500/20 to-amber-500/20 rounded-[2.5rem] border border-orange-500/20 mb-2 relative group">
                                <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Shield className="w-10 h-10 text-orange-400 relative z-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black tracking-tight leading-tight">Tu Seguridad es <br/><span className="text-orange-500">Nuestra Prioridad</span></h2>
                                <p className="text-slate-400 leading-relaxed text-lg max-w-xl mx-auto">
                                    En Montapulse trabajamos para crear un entorno seguro, transparente y profesional para la comunidad de la Ruta del Spondylus.
                                </p>
                            </div>
                        </div>

                        {/* Sections Grid */}
                        <div className="grid gap-8">
                            {/* SECTION 1: TERMS */}
                            <section className="group bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 hover:border-orange-500/20 transition-all duration-500 shadow-2xl">
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="p-4 bg-orange-500/10 rounded-[1.5rem] group-hover:rotate-12 transition-transform duration-500">
                                        <FileText className="w-7 h-7 text-orange-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">Términos del Servicio</h3>
                                        <p className="text-xs text-orange-500/60 font-mono uppercase tracking-widest mt-1 underline decoration-orange-500/30 underline-offset-4">Acuerdo de Uso de la Plataforma</p>
                                    </div>
                                </div>
                                {renderSections(policyData.terms, 'text-orange-400', 'bg-orange-500')}
                            </section>

                            {/* SECTION 2: PRIVACY */}
                            <section className="group bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 hover:border-amber-500/20 transition-all duration-500 shadow-2xl">
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="p-4 bg-amber-500/10 rounded-[1.5rem] group-hover:-rotate-12 transition-transform duration-500 font-sans">
                                        <Lock className="w-7 h-7 text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">Política de Privacidad</h3>
                                        <p className="text-xs text-amber-500/60 font-mono uppercase tracking-widest mt-1 underline decoration-amber-500/30 underline-offset-4 font-sans">Gestión de Datos y Seguridad</p>
                                    </div>
                                </div>
                                {renderSections(policyData.privacy, 'text-amber-400', 'bg-amber-500')}
                            </section>

                            {/* SECTION 3: LEGAL */}
                            <section className="bg-gradient-to-br from-slate-900/60 to-slate-950/60 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 shadow-inner">
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="p-4 bg-blue-500/10 rounded-[1.5rem]">
                                        <Shield className="w-7 h-7 text-blue-400" />
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tight">Descargo de Responsabilidad</h3>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed italic border-l-2 border-blue-500/30 pl-4 py-2">
                                    {policyData.disclaimer}
                                </p>
                            </section>
                        </div>

                        {/* Contact Support */}
                        <div className="pt-12 text-center relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-8">¿Necesitas asistencia legal o técnica?</p>
                            <a
                                href={`mailto:${policyData.supportEmail}`}
                                className="inline-flex items-center gap-4 px-10 py-5 bg-white text-black font-black rounded-[2rem] hover:bg-orange-500 hover:text-white transition-all duration-300 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.05)] group"
                            >
                                Contactar Soporte Legal
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

