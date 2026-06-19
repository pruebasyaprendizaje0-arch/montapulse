import React, { useState } from 'react';
import { Lock, Mail, Key, LogIn, X, AlertCircle, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { loginWithGoogle, loginWithEmail } from '../services/authService';
import { RegisterForm } from './RegisterForm';

type ViewMode = 'login' | 'email-login' | 'register';

const LogoSVG = () => (
    <svg viewBox="0 0 120 120" fill="none" className="w-28 h-28 mx-auto mb-4 drop-shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
        {/* Outer dark blue circle */}
        <circle cx="60" cy="60" r="50" fill="#0d162d" stroke="#25355a" strokeWidth="2" />
        
        {/* Radar/grid lines */}
        <circle cx="60" cy="60" r="42" stroke="#485c8d" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        <circle cx="60" cy="60" r="35" stroke="#485c8d" strokeWidth="1" opacity="0.4" />
        
        {/* Crosshair lines */}
        <line x1="60" y1="18" x2="60" y2="102" stroke="#485c8d" strokeWidth="1.5" opacity="0.5" />
        <line x1="18" y1="60" x2="102" y2="60" stroke="#485c8d" strokeWidth="1.5" opacity="0.5" />

        {/* Globe continent shapes inside */}
        <path d="M78 40 C88 45 92 60 88 72 C85 78 80 82 74 85 C68 82 68 76 65 72 C62 68 56 65 52 65 C48 65 42 68 38 72 C32 68 30 58 35 50 C40 42 50 45 55 42 C60 38 65 30 72 30 C75 30 76 36 78 40 Z" fill="#b4834b" opacity="0.3" />

        {/* Wave/Road curves at the bottom */}
        <path d="M38 76 C50 82 70 82 82 76" stroke="#c08643" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M34 82 C50 89 70 89 86 82" stroke="#e0a35c" strokeWidth="2.5" strokeLinecap="round" />

        {/* Large central White Map Pin */}
        <g filter="url(#pin-shadow)">
            {/* Outer white path of the pin */}
            <path 
                d="M60 28 C48 28 39 37 39 49 C39 62 60 85 60 85 C60 85 81 62 81 49 C81 37 72 28 60 28 Z" 
                fill="#ffffff" 
            />
            {/* Cutout hole inside the pin */}
            <circle cx="60" cy="49" r="7" fill="#0d162d" />
        </g>

        {/* Small surrounding dots/stars */}
        <circle cx="30" cy="40" r="1.2" fill="#ffffff" opacity="0.8" />
        <circle cx="92" cy="50" r="1.5" fill="#ffffff" opacity="0.6" />
        <circle cx="85" cy="80" r="1" fill="#ffffff" opacity="0.7" />

        <defs>
            <filter id="pin-shadow" x="30" y="20" width="60" height="75" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
            </filter>
        </defs>
    </svg>
);

export const LoginScreen: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const { setShowLogin, setActiveView } = useData();
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        if (!termsAccepted) {
            setError('Debes aceptar los términos y condiciones antes de continuar');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await loginWithGoogle();
            setShowLogin(false);
            setActiveView('favorites');
            navigate('/passport');
        } catch (err: any) {
            setError(err.message || 'Failed to login with Google');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await loginWithEmail(email, password);
            setShowLogin(false);
            setActiveView('favorites');
            navigate('/passport');
        } catch (err: any) {
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email');
            } else if (err.code === 'auth/wrong-password') {
                setError('Incorrect password');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address');
            } else {
                setError(err.message || 'Failed to login');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetToLogin = () => {
        setViewMode('login');
        setError('');
        setEmail('');
        setPassword('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#091124] via-[#070b16] to-[#04060c] p-6 relative select-none">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px'
            }}></div>

            <div className="relative w-full max-w-md">
                {/* Logo & Brand Header */}
                <div className="text-center mb-8">
                    <LogoSVG />
                    <p className="text-sm font-light text-slate-300 tracking-wide mb-1 leading-relaxed">
                        tu guía local de la Ruta del Spondylus
                    </p>
                    <h1 translate="no" className="text-2xl font-black text-white tracking-widest notranslate">
                        ubicame.info
                    </h1>
                </div>

                {/* Login/Register Card */}
                <div className="bg-[#0c1424]/90 backdrop-blur-2xl border border-[#17243c] rounded-[2rem] p-8 shadow-2xl">
                    {viewMode === 'login' && (
                        <>
                            {/* Google Login Button */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full bg-white text-gray-900 font-bold py-4 px-6 rounded-2xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
                            >
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
                            </button>

                            {/* Terms and Conditions for Google */}
                            <div className="flex items-start gap-3 mt-4 mb-2 p-2 bg-transparent rounded-2xl">
                                <div className="flex items-center h-5">
                                    <input
                                        id="terms-google"
                                        type="checkbox"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="w-4 h-4 bg-transparent border-white/20 rounded text-orange-500 focus:ring-orange-500/20 cursor-pointer"
                                    />
                                </div>
                                <label htmlFor="terms-google" className="text-[10px] text-slate-400 leading-tight select-none">
                                    Acepto los <button
                                        type="button"
                                        onClick={() => window.open('/policies', '_blank')}
                                        className="text-[#c08643] hover:underline font-bold"
                                    >
                                        términos del servicio
                                    </button> y la <button
                                        type="button"
                                        onClick={() => window.open('/policies', '_blank')}
                                        className="text-[#c08643] hover:underline font-bold"
                                    >
                                        política de privacidad
                                    </button> de ubicame.info Pulse.
                                </label>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="text-slate-500 text-sm font-medium">OR</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>

                            {/* Email Login Button */}
                            <button
                                onClick={() => setViewMode('email-login')}
                                className="w-full bg-[#182339]/50 border border-white/10 text-white font-bold py-4 px-6 rounded-2xl hover:bg-[#182339]/80 transition-all flex items-center justify-center gap-3 mb-3"
                            >
                                <Mail className="w-5 h-5" />
                                <span>Sign in with Email</span>
                            </button>

                            {/* Register Button */}
                            <button
                                onClick={() => setViewMode('register')}
                                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-orange-600 hover:to-amber-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20"
                            >
                                <UserPlus className="w-5 h-5" />
                                <span>Create Account</span>
                            </button>
                        </>
                    )}

                    {viewMode === 'email-login' && (
                        <>
                            {/* Email Login Form */}
                            <form onSubmit={handleEmailLogin} className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Password</label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold py-4 rounded-2xl hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <LogIn className="w-5 h-5" />
                                    <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={resetToLogin}
                                    className="w-full bg-transparent border border-white/10 text-slate-400 font-bold py-3 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    <span>Back</span>
                                </button>
                            </form>
                        </>
                    )}

                    {viewMode === 'register' && (
                        <RegisterForm
                            onBack={resetToLogin}
                            onSuccess={() => {
                                setShowLogin(false);
                                setActiveView('favorites');
                                navigate('/passport');
                            }}
                        />
                    )}

                    {/* Error Message */}
                    {error && viewMode !== 'register' && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-2 mt-8 text-slate-500 text-xs">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-sky-400/80">
                        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.05-1.22.14A7 7 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8Z" />
                    </svg>
                    <span>Discover the best events with ubicame.info Pulse</span>
                </div>
            </div>
        </div>
    );
};
