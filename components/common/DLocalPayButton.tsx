import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface DLocalPayButtonProps {
    amount: number;
    currency: string;
    description: string;
    className?: string;
    label?: string;
}

/**
 * Reusable Pay Button for dLocal Go integration.
 * Triggers the /api/create-checkout backend route.
 */
const DLocalPayButton: React.FC<DLocalPayButtonProps> = ({ 
    amount, 
    currency, 
    description, 
    className = "", 
    label = "Pagar con dLocal Go" 
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const handlePayment = async () => {
        if (amount <= 0) return;
        
        setIsLoading(true);
        try {
            const response = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, currency, description })
            });

            const data = await response.json();

            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('dLocal Go payment error:', error);
            showToast('Error al procesar el pago. Intenta de nuevo.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handlePayment}
            disabled={isLoading || amount <= 0}
            className={`flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-black rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 ${className}`}
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <CreditCard className="w-5 h-5" />
            )}
            <span className="uppercase tracking-widest text-[10px]">{label}</span>
        </button>
    );
};

export default DLocalPayButton;
