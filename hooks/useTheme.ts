import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'night';

export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('montapulse-theme') as Theme;
        return saved || 'dark';
    });

    const [isAuto, setIsAuto] = useState(() => {
        return localStorage.getItem('montapulse-theme-auto') !== 'false';
    });

    useEffect(() => {
        if (!isAuto) return;

        const checkTime = () => {
            const hour = new Date().getHours();
            // Night mode between 18:00 and 06:00
            if (hour >= 18 || hour < 6) {
                setTheme('night');
            } else {
                setTheme('dark'); // Default to dark for this app, or 'light'
            }
        };

        checkTime();
        const interval = setInterval(checkTime, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [isAuto]);

    useEffect(() => {
        localStorage.setItem('montapulse-theme', theme);
        localStorage.setItem('montapulse-theme-auto', String(isAuto));

        // Apply theme to document root
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'night');
        root.classList.add(theme);
    }, [theme, isAuto]);

    return { theme, setTheme, isAuto, setIsAuto };
};
