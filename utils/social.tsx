import React from 'react';

export const cleanSocialHandle = (input?: string): string => {
    if (!input) return '';
    return input.trim();
};

export const getInstagramUrl = (handleOrUrl?: string): string => {
    if (!handleOrUrl) return '';
    const clean = handleOrUrl.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    const username = clean.replace(/^@/, '');
    return `https://instagram.com/${username}`;
};

export const getFacebookUrl = (pageOrUrl?: string): string => {
    if (!pageOrUrl) return '';
    const clean = pageOrUrl.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.includes('facebook.com/')) return `https://${clean.replace(/^https?:\/\//, '')}`;
    const page = clean.replace(/^@/, '');
    return `https://facebook.com/${page}`;
};

export const getTikTokUrl = (handleOrUrl?: string): string => {
    if (!handleOrUrl) return '';
    const clean = handleOrUrl.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.includes('tiktok.com/')) return `https://${clean.replace(/^https?:\/\//, '')}`;
    const username = clean.startsWith('@') ? clean : `@${clean}`;
    return `https://tiktok.com/${username}`;
};

export const getYouTubeUrl = (channelOrUrl?: string): string => {
    if (!channelOrUrl) return '';
    const clean = channelOrUrl.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.includes('youtube.com/') || clean.includes('youtu.be/')) return `https://${clean.replace(/^https?:\/\//, '')}`;
    const handle = clean.startsWith('@') ? clean : `@${clean}`;
    return `https://youtube.com/${handle}`;
};

export const getWhatsAppUrl = (numberOrUrl?: string): string => {
    if (!numberOrUrl) return '';
    const clean = numberOrUrl.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    const digits = clean.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : '';
};

export const TikTokIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg 
        className={className} 
        viewBox="0 0 24 24" 
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.38a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.1 15.66a6.34 6.34 0 0 0 10.82 4.48 6.3 6.3 0 0 0 1.93-4.52V8.75a8.28 8.28 0 0 0 4.84 1.56V6.86a4.87 4.87 0 0 1-1.1-.17z"/>
    </svg>
);
