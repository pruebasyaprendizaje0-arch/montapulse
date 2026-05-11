import React, { useState, useMemo, useEffect } from 'react';
import { 
    Shield, LayoutDashboard, Building2, Users, Bot, 
    Settings, ShieldAlert, X, Globe
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { SubscriptionPlan } from '../../types';
import { getAppSettings, subscribeToAppSettings } from '../../services/firestoreService';

// Modular Panels
import { DashboardPanel } from './panels/DashboardPanel';
import { UsersPanel } from './panels/UsersPanel';
import { BusinessesPanel } from './panels/BusinessesPanel';
import { SystemPanel } from './panels/SystemPanel';
import { MasterDataPanel } from './panels/MasterDataPanel';
import { ModerationPanel } from './panels/ModerationPanel';

type AdminTab = 'dashboard' | 'businesses' | 'users' | 'ai' | 'moderation' | 'masterData';

interface SuperAdminCenterProps {
    onClose: () => void;
}

export const SuperAdminCenter: React.FC<SuperAdminCenterProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const { isSuperUser, toggleSuperUser } = useAuthContext();
    const { allUsers, businesses, events, posts } = useData();
    const { showToast } = useToast();

    // --- Global Config States (passed to panels) ---
    const [appConfig, setAppConfig] = useState({
        maintenanceMode: false,
        aiModel: 'gemini-1.5-pro',
        claudeModel: 'claude-3-5-sonnet-20240620',
        isSuperUserEnabled: false
    });

    const [aiConfig, setAiConfig] = useState({
        gptModel: 'gpt-4o',
        claudeModel: 'claude-3-5-sonnet-20240620'
    });

    // Real-time config synchronization
    useEffect(() => {
        const unsubApp = subscribeToAppSettings('app_config', (data) => {
            if (data) setAppConfig(prev => ({ ...prev, ...data }));
        });

        const unsubAi = subscribeToAppSettings('ai_config', (data) => {
            if (data) {
                setAiConfig({
                    gptModel: data.gptModel || 'gpt-4o',
                    claudeModel: data.claudeModel || 'claude-3-5-sonnet-20240620'
                });
            }
        });

        return () => {
            unsubApp();
            unsubAi();
        };
    }, []);

    // --- Statistics ---
    const stats = useMemo(() => {
        const totalRevenue = businesses.reduce((acc, b) => {
            if (b.plan === SubscriptionPlan.PRO) return acc + 10;
            if (b.plan === SubscriptionPlan.ELITE) return acc + 25;
            if (b.plan === SubscriptionPlan.EXPERT) return acc + 50;
            return acc;
        }, 0);

        return {
            users: allUsers.length,
            hosts: allUsers.filter(u => u.role === 'host').length,
            admins: allUsers.filter(u => u.role === 'admin').length,
            businesses: businesses.length,
            verifiedBusinesses: businesses.filter(b => b.isVerified).length,
            totalEvents: events.length,
            totalPosts: posts.length,
            estimatedMonthlyRevenue: totalRevenue,
            premiumUsers: allUsers.filter(u => u.plan !== SubscriptionPlan.FREE).length,
            proUsers: allUsers.filter(u => u.plan === SubscriptionPlan.PRO).length,
            eliteUsers: allUsers.filter(u => u.plan === SubscriptionPlan.ELITE).length,
        };
    }, [allUsers, businesses, events, posts]);

    const renderPanel = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardPanel stats={stats} appConfig={appConfig} setActiveTab={setActiveTab} />;
            case 'users':
                return <UsersPanel stats={stats} />;
            case 'businesses':
                return <BusinessesPanel />;
            case 'masterData':
                return <MasterDataPanel />;
            case 'moderation':
                return <ModerationPanel />;
            case 'ai':
                return <SystemPanel appConfig={appConfig} aiConfig={aiConfig} setAiConfig={setAiConfig} />;
            default:
                return <DashboardPanel stats={stats} appConfig={appConfig} setActiveTab={setActiveTab} />;
        }
    };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Usuarios', icon: Users },
        { id: 'businesses', label: 'Negocios', icon: Building2 },
        { id: 'masterData', label: 'Datos', icon: Globe },
        { id: 'moderation', label: 'Moderación', icon: ShieldAlert },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden font-inter">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-neutral-900/30 border-b border-white/5 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/20">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                            Admin Center
                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-500 uppercase font-black">v2.0</span>
                        </h2>
                        <div className="flex items-center gap-3">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">MontaPulse Management Suite</p>
                            <button 
                                onClick={toggleSuperUser}
                                className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase transition-all ${isSuperUser ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-600'}`}
                            >
                                {isSuperUser ? 'Super User Active' : 'Enable Super User'}
                            </button>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl border border-white/10 transition-all active:scale-95"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Sidebar & Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <div className="w-72 bg-neutral-900/30 border-r border-white/5 p-6 hidden lg:flex flex-col gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all group ${activeTab === tab.id ? 'bg-orange-500 text-black shadow-xl shadow-orange-500/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <tab.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === tab.id ? 'text-black' : 'text-slate-500'}`} />
                            <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                    
                    <div className="mt-auto pt-6 border-t border-white/5">
                        <button 
                            onClick={() => setActiveTab('ai')}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all ${activeTab === 'ai' ? 'bg-violet-500 text-white' : 'bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20'}`}
                        >
                            <Bot className="w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest">Configuración IA</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black p-4 lg:p-10">
                    <div className="max-w-7xl mx-auto">
                        {renderPanel()}
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="lg:hidden flex justify-around p-4 bg-neutral-900/50 border-t border-white/5 backdrop-blur-xl">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`p-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-orange-500 text-black' : 'text-slate-500'}`}
                    >
                        <tab.icon className="w-6 h-6" />
                    </button>
                ))}
            </div>
        </div>
    );
};
