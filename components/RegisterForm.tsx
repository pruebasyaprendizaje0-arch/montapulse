import React, { useState } from 'react';
import { User as UserIcon, Store, Mail, Key, X, AlertCircle, CheckCircle, Camera, Image as ImageIcon, Upload } from 'lucide-react';
import { registerWithEmail } from '../services/authService';

interface RegisterFormProps {
    onBack: () => void;
    onSuccess: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onBack, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'visitor' as 'visitor' | 'host',
        avatarUrl: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const cameraInputRef = React.useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, avatarUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await registerWithEmail(
                formData.email,
                formData.password,
                formData.name,
                formData.role,
                formData.avatarUrl
            );
            onSuccess();
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please login instead.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak');
            } else {
                setError(err.message || 'Failed to register');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden Inputs */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />
            <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
            />

            {/* Role Selection */}
            <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-3 block">
                    I want to register as
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'visitor' })}
                        className={`p-4 rounded-2xl border-2 transition-all ${formData.role === 'visitor'
                            ? 'bg-sky-500/10 border-sky-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                    >
                        <UserIcon className="w-8 h-8 mx-auto mb-2" />
                        <div className="font-bold text-sm">Visitor</div>
                        <div className="text-xs opacity-70">Discover events</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'host' })}
                        className={`p-4 rounded-2xl border-2 transition-all ${formData.role === 'host'
                            ? 'bg-sky-500/10 border-sky-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                    >
                        <Store className="w-8 h-8 mx-auto mb-2" />
                        <div className="font-bold text-sm">Business</div>
                        <div className="text-xs opacity-70">Create events</div>
                    </button>
                </div>
            </div>

            {/* Profile Picture */}
            <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Profile Picture</label>
                <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden shrink-0">
                        {formData.avatarUrl ? (
                            <img src={formData.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <UserIcon className="w-10 h-10" />
                            </div>
                        )}
                        {formData.avatarUrl && (
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, avatarUrl: '' })}
                                className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                                <X className="w-8 h-8 text-white" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2"
                        >
                            <ImageIcon className="w-4 h-4" /> Upload Photo
                        </button>
                        <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2"
                        >
                            <Camera className="w-4 h-4" /> Take Photo
                        </button>
                    </div>
                </div>
            </div>

            {/* Name */}
            <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Name</label>
                <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your name"
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        required
                    />
                </div>
            </div>

            {/* Email */}
            <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        required
                    />
                </div>
            </div>

            {/* Password */}
            <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Password</label>
                <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        required
                        minLength={6}
                    />
                </div>
            </div>

            {/* Confirm Password */}
            <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                    Confirm Password
                </label>
                <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        required
                        minLength={6}
                    />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-4 rounded-2xl hover:from-sky-600 hover:to-indigo-700 transition-all shadow-lg shadow-sky-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                <CheckCircle className="w-5 h-5" />
                <span>{loading ? 'Creating account...' : 'Create Account'}</span>
            </button>

            {/* Back Button */}
            <button
                type="button"
                onClick={onBack}
                className="w-full bg-transparent border border-white/10 text-slate-400 font-bold py-3 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
                <X className="w-4 h-4" />
                <span>Back to Login</span>
            </button>
        </form>
    );
};
