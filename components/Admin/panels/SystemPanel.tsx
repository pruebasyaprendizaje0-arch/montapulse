import React, { useState } from 'react';
import { 
    Settings, ShieldAlert, Cpu, Save, 
    RefreshCcw, Database, HardDrive, Network, Bot 
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { updateAppConfig } from '../../../services/firestoreService';
import { LeadsPanel } from './LeadsPanel';

interface SystemPanelProps {
    appConfig: {
        maintenanceMode: boolean;
        openrouterModel: string;
        isSuperUserEnabled: boolean;
    };
    setAppConfig: (config: any) => void;
}

export const SystemPanel: React.FC<SystemPanelProps> = ({ appConfig, setAppConfig }) => {
    const { showToast } = useToast();
    const [activeSubTab, setActiveSubTab] = useState<'config' | 'leads'>('config');

    const handleSaveAiConfig = async () => {
        try {
            await updateAppConfig({
                openrouterModel: appConfig.openrouterModel
            });
            showToast("Configuración de IA guardada", "success");
        } catch (error) {
            showToast("Error al guardar configuración", "error");
        }
    };

    const handleToggleMaintenance = async () => {
        try {
            await updateAppConfig({ maintenanceMode: !appConfig.maintenanceMode });
            showToast(appConfig.maintenanceMode ? "Sistema Online" : "Modo Mantenimiento Activo", "success");
        } catch (error) {
            showToast("Error al cambiar estado", "error");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Sub-tab Navigation */}
            <div className="flex gap-2 border-b border-white/5 pb-4 mb-6 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveSubTab('config')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${activeSubTab === 'config' ? 'bg-sky-500 text-black border-sky-500 shadow-lg shadow-sky-500/20' : 'bg-transparent text-slate-400 border-white/5 hover:border-white/10 hover:text-white'}`}
                >
                    <Settings className="w-4 h-4" />
                    Configuración del Sistema
                </button>
                <button
                    onClick={() => setActiveSubTab('leads')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${activeSubTab === 'leads' ? 'bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-transparent text-slate-400 border-white/5 hover:border-white/10 hover:text-white'}`}
                >
                    <Bot className="w-4 h-4" />
                    Prospección y Leads IA
                </button>
            </div>

            {activeSubTab === 'config' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Maintenance Section */}
                <div className="bg-neutral-900/50 border border-white/5 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            <Settings className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">General</h4>
                            <p className="text-[10px] text-slate-500">Core app settings</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-6 bg-black/40 rounded-3xl border border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3 text-orange-500">
                                    <ShieldAlert className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Mantenimiento</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={appConfig.maintenanceMode}
                                        onChange={handleToggleMaintenance}
                                    />
                                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                Cuando está activo, solo los administradores podrán acceder a la plataforma.
                            </p>
                        </div>
                    </div>
                </div>

                {/* AI Configuration Section */}
                <div className="bg-neutral-900/50 border border-white/5 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                            <Cpu className="w-5 h-5 text-sky-500" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Inteligencia Artificial</h4>
                            <p className="text-[10px] text-slate-500">AI Model selection</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Network className="w-3 h-3" />
                                Modelo de OpenRouter
                            </label>
                            <select 
                                value={appConfig.openrouterModel}
                                onChange={e => setAppConfig({ ...appConfig, openrouterModel: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-sky-500/50"
                            >
                                <optgroup label="Modelos Gratuitos (Free Tier)" className="bg-neutral-900 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                                    <option value="minimax/minimax-m2.5:free" className="text-white text-xs font-medium normal-case">Minimax M2.5 (Fast)</option>
                                    <option value="meta-llama/llama-3.3-70b-instruct:free" className="text-white text-xs font-medium normal-case">Llama 3.3 70B</option>
                                    <option value="google/gemma-2-9b-it:free" className="text-white text-xs font-medium normal-case">Gemma 2 9B</option>
                                    <option value="qwen/qwen-2.5-72b-instruct:free" className="text-white text-xs font-medium normal-case">Qwen 2.5 72B</option>
                                    <option value="deepseek/deepseek-chat:free" className="text-white text-xs font-medium normal-case">DeepSeek V3 (R1)</option>
                                    <option value="deepseek/deepseek-v4-flash:free" className="text-white text-xs font-medium normal-case">DeepSeek V4 Flash</option>
                                    <option value="meta-llama/llama-3.2-11b-vision-instruct:free" className="text-white text-xs font-medium normal-case">Llama 3.2 Vision</option>
                                    <option value="microsoft/phi-3-medium-128k-instruct:free" className="text-white text-xs font-medium normal-case">Phi-3 Medium</option>
                                </optgroup>
                                <optgroup label="Modelos Premium / De Pago" className="bg-neutral-900 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                                    <option value="anthropic/claude-3.5-sonnet" className="text-white text-xs font-medium normal-case">Claude 3.5 Sonnet</option>
                                    <option value="anthropic/claude-3.5-haiku" className="text-white text-xs font-medium normal-case">Claude 3.5 Haiku</option>
                                    <option value="openai/gpt-4o" className="text-white text-xs font-medium normal-case">GPT-4o</option>
                                    <option value="openai/gpt-4o-mini" className="text-white text-xs font-medium normal-case">GPT-4o Mini</option>
                                    <option value="google/gemini-2.5-pro" className="text-white text-xs font-medium normal-case">Gemini 2.5 Pro</option>
                                    <option value="google/gemini-2.5-flash" className="text-white text-xs font-medium normal-case">Gemini 2.5 Flash</option>
                                    <option value="deepseek/deepseek-chat" className="text-white text-xs font-medium normal-case">DeepSeek V3 (Paid)</option>
                                    <option value="deepseek/deepseek-reasoner" className="text-white text-xs font-medium normal-case">DeepSeek R1 (Reasoner)</option>
                                    <option value="deepseek/deepseek-v4-flash" className="text-white text-xs font-medium normal-case">DeepSeek V4 Flash (Paid)</option>
                                    <option value="meta-llama/llama-3.3-70b-instruct" className="text-white text-xs font-medium normal-case">Llama 3.3 70B (Paid)</option>
                                </optgroup>
                            </select>
                        </div>

                        <button 
                            onClick={handleSaveAiConfig}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
                        >
                            <Save className="w-4 h-4" />
                            Guardar Configuración
                        </button>
                    </div>
                </div>
            </div>

            {/* Infrastructure Monitor */}
            <div className="bg-neutral-900/50 border border-white/5 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Network className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Infraestructura</h4>
                        <p className="text-[10px] text-slate-500">System health</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <HealthCard icon={Database} label="Base de Datos" status="Operational" latency="24ms" />
                    <HealthCard icon={HardDrive} label="Almacenamiento" status="Operational" usage="14%" />
                    <HealthCard icon={RefreshCcw} label="Sincronización" status="Active" last="Now" />
                </div>
            </div>
            </>
            ) : (
                <LeadsPanel appConfig={appConfig} />
            )}
        </div>
    );
};

const HealthCard: React.FC<{ icon: any, label: string, status: string, latency?: string, usage?: string, last?: string }> = ({ icon: Icon, label, status, latency, usage, last }) => (
    <div className="bg-black/40 border border-white/5 p-6 rounded-3xl group">
        <div className="flex items-center gap-3 mb-4">
            <Icon className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-end justify-between">
            <div>
                <p className="text-xs font-black text-white mb-1">{status}</p>
                <p className="text-[9px] text-emerald-500 font-black uppercase tracking-tighter">Running smoothly</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-600 uppercase">
                    {latency || usage || last}
                </p>
            </div>
        </div>
    </div>
);
