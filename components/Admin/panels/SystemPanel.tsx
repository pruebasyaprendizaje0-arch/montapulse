import React from 'react';
import { 
    Settings, ShieldAlert, Cpu, Save, 
    RefreshCcw, Database, HardDrive, Network 
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { updateAppConfig } from '../../../services/firestoreService';

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
                                OpenRouter (Free)
                            </label>
                            <select 
                                value={appConfig.openrouterModel}
                                onChange={e => setAppConfig({ ...appConfig, openrouterModel: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-sky-500/50"
                            >
                                <option value="minimax/minimax-m2.5:free">Minimax M2.5 (Fast)</option>
                                <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B</option>
                                <option value="google/gemma-7b-it:free">Gemma 7B</option>
                                <option value="mistralai/mistral-7b-instruct:free">Mistral 7B</option>
                                <option value="microsoft/phi-3-mini-128k-instruct:free">Phi-3 Mini</option>
                                <option value="openchat/openchat-7b:free">OpenChat 7B</option>
                                <option value="huggingfaceh4/zephyr-7b-beta:free">Zephyr 7B</option>
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
