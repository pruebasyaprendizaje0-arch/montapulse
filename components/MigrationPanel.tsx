import React, { useState } from 'react';
import { Upload, Download, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { migrateLocalStorageToFirestore, backupLocalStorageData, clearLocalStorageData } from '../services/migrationService';

export const MigrationPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleMigrate = async () => {
        setStatus('migrating');
        setMessage('Migrating data to Firestore...');

        const result = await migrateLocalStorageToFirestore();

        if (result.success) {
            setStatus('success');
            setMessage(result.message);
        } else {
            setStatus('error');
            setMessage(result.message);
        }
    };

    const handleBackup = () => {
        backupLocalStorageData();
        setMessage('Backup downloaded successfully!');
    };

    const handleClear = () => {
        if (confirm('Are you sure you want to clear localStorage data? Make sure you have migrated to Firestore first!')) {
            clearLocalStorageData();
            setMessage('localStorage data cleared!');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl p-8 max-w-lg w-full border border-white/10">
                <h2 className="text-2xl font-black text-white mb-4">Migrate to Firestore</h2>
                <p className="text-slate-400 mb-6 text-sm">
                    Transfer your data from localStorage to Firestore for multi-user access and real-time sync.
                </p>

                <div className="space-y-3">
                    {/* Backup Button */}
                    <button
                        onClick={handleBackup}
                        className="w-full flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl px-4 py-3 hover:bg-blue-500/20 transition"
                    >
                        <Download className="w-5 h-5" />
                        <span className="font-bold">Backup Data</span>
                    </button>

                    {/* Migrate Button */}
                    <button
                        onClick={handleMigrate}
                        disabled={status === 'migrating'}
                        className="w-full flex items-center justify-center gap-2 bg-sky-500 text-white rounded-2xl px-4 py-3 hover:bg-sky-600 transition disabled:opacity-50 font-bold"
                    >
                        <Upload className="w-5 h-5" />
                        <span>{status === 'migrating' ? 'Migrating...' : 'Migrate to Firestore'}</span>
                    </button>

                    {/* Clear Button */}
                    <button
                        onClick={handleClear}
                        className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl px-4 py-3 hover:bg-red-500/20 transition"
                    >
                        <Trash2 className="w-5 h-5" />
                        <span className="font-bold">Clear localStorage</span>
                    </button>
                </div>

                {/* Status Message */}
                {message && (
                    <div className={`mt-4 p-4 rounded-2xl border flex items-center gap-2 ${status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                            status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                        {status === 'success' && <CheckCircle className="w-5 h-5" />}
                        {status === 'error' && <AlertCircle className="w-5 h-5" />}
                        <span className="text-sm">{message}</span>
                    </div>
                )}

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full mt-4 bg-slate-800 text-white rounded-2xl px-4 py-3 hover:bg-slate-700 transition font-bold"
                >
                    Close
                </button>
            </div>
        </div>
    );
};
