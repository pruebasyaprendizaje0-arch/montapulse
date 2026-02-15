import React, { useState } from 'react';
import { Lock, Mail, Key, LogIn, X, AlertCircle, UserPlus } from 'lucide-react';
import { loginWithGoogle, loginWithEmail } from '../services/authService';
import { RegisterForm } from './RegisterForm';

type ViewMode = 'login' | 'email-login' | 'register';

export const LoginScreen: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await loginWithGoogle();
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px'
            }}></div>

            <div className="relative w-full max-w-md">
                {/* Lock Icon Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-3xl shadow-2xl shadow-sky-500/30 mb-4">
                        <Lock className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Montañita Pulse</h1>
                    <p className="text-slate-400 font-medium">
                        {viewMode === 'register' ? 'Create your account' : 'Welcome back'}
                    </p>
                </div>

                {/* Login/Register Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
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

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="text-slate-500 text-sm font-medium">OR</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>

                            {/* Email Login Button */}
                            <button
                                onClick={() => setViewMode('email-login')}
                                className="w-full bg-slate-800 border border-white/10 text-white font-bold py-4 px-6 rounded-2xl hover:bg-slate-700 transition-all flex items-center justify-center gap-3 mb-3"
                            >
                                <Mail className="w-5 h-5" />
                                <span>Sign in with Email</span>
                            </button>

                            {/* Register Button */}
                            <button
                                onClick={() => setViewMode('register')}
                                className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-sky-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-sky-500/20"
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
                                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-4 rounded-2xl hover:from-sky-600 hover:to-indigo-700 transition-all shadow-lg shadow-sky-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
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
                                // User will be automatically logged in after registration
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
                <p className="text-center text-slate-500 text-sm mt-6">
                    🌊 Discover Montañita's best events
                </p>
            </div>
        </div>
    );
};
