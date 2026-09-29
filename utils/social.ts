import React from 'react';

/**
 * Normalizes Ecuadorian and international phone numbers into clean digits (E.164 without leading +).
 * Supports:
 * - Ecuador mobile (10 digits starting with 09 -> 5939XXXXXXXX)
 * - Ecuador mobile without 0 (9 digits starting with 9 -> 5939XXXXXXXX)
 * - Ecuador landline (9 digits starting with 0 -> 593XXXXXXXX)
 * - Already prefixed (593XXXXXXXXX)
 * - International numbers (8 to 15 digits)
 * Rejects non-phone text, undefined, null, short numbers, and invalid URLs.
 */
export const normalizeEcuadorianPhone = (phone?: unknown): string => {
    if (!phone || typeof phone !== 'string') return '';
    const clean = phone.trim();
    if (!clean || clean.toLowerCase() === 'undefined' || clean.toLowerCase() === 'null') return '';

    // Check if input is a WhatsApp URL with phone in query or path
    if (/^https?:\/\//i.test(clean)) {
        try {
            const parsed = new URL(clean);
            if (parsed.hostname === 'wa.me' || parsed.hostname === 'api.whatsapp.com' || parsed.hostname.endsWith('.whatsapp.com')) {
                const searchPhone = parsed.searchParams.get('phone');
                if (searchPhone) {
                    return normalizeEcuadorianPhone(searchPhone);
                }
                const pathDigits = parsed.pathname.replace(/\D/g, '');
                if (pathDigits.length >= 8) {
                    return normalizeEcuadorianPhone(pathDigits);
                }
            }
        } catch {
            return '';
        }
        return '';
    }

    const digits = clean.replace(/\D/g, '');
    if (digits.length < 8) return '';

    // Ecuador local mobile: 09XXXXXXXX (10 digits) -> 5939XXXXXXXX
    if (digits.startsWith('09') && digits.length === 10) {
        return `593${digits.slice(1)}`;
    }
    // Ecuador mobile without leading zero: 9XXXXXXXX (9 digits) -> 5939XXXXXXXX
    if (digits.startsWith('9') && digits.length === 9) {
        return `593${digits}`;
    }
    // Ecuador landline with area code: 0X XXXXXXX (9 digits e.g. 042060000) -> 59342060000
    if (digits.startsWith('0') && digits.length === 9) {
        return `593${digits.slice(1)}`;
    }
    // Already has 593 prefix: 5939XXXXXXXX (11-12 digits)
    if (digits.startsWith('593') && digits.length >= 11 && digits.length <= 13) {
        return digits;
    }
    // Other international E.164 phone numbers (8 to 15 digits)
    if (digits.length >= 8 && digits.length <= 15) {
        return digits;
    }

    return '';
};

export const normalizePhoneNumber = normalizeEcuadorianPhone;

/**
 * Builds a secure WhatsApp direct link using the canonical phone normalizer.
 * Rejects undefined, null, non-phone text, and unofficial domains.
 */
export const getWhatsAppUrl = (numberOrUrl?: unknown, defaultMessage = ''): string => {
    if (!numberOrUrl) return '';

    // If already an official WhatsApp URL with valid phone
    if (typeof numberOrUrl === 'string' && /^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(numberOrUrl.trim())) {
        const cleanUrl = numberOrUrl.trim();
        try {
            const parsed = new URL(cleanUrl);
            const pathDigits = parsed.pathname.replace(/\D/g, '') || (parsed.searchParams.get('phone') || '').replace(/\D/g, '');
            if (pathDigits.length >= 8) {
                return cleanUrl;
            }
        } catch {
            // fallback to normalization
        }
    }

    const normalized = normalizeEcuadorianPhone(numberOrUrl);
    if (!normalized) return '';

    const query = defaultMessage ? `?text=${encodeURIComponent(defaultMessage)}` : '';
    return `https://wa.me/${normalized}${query}`;
};

export const cleanSocialHandle = (input?: string): string => {
    if (!input) return '';
    return input.trim();
};

export const getInstagramUrl = (handleOrUrl?: string): string => {
    if (!handleOrUrl) return '';
    const clean = handleOrUrl.trim();
    if (!clean || clean === 'undefined' || clean === 'null') return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        try {
            const urlObj = new URL(clean);
            if (urlObj.hostname.includes('instagram.com')) return clean;
        } catch {
            return '';
        }
        return '';
    }
    const username = clean.replace(/^@/, '').trim();
    if (!username || username.includes(' ')) return '';
    return `https://instagram.com/${username}`;
};

export const getFacebookUrl = (pageOrUrl?: string): string => {
    if (!pageOrUrl) return '';
    const clean = pageOrUrl.trim();
    if (!clean || clean === 'undefined' || clean === 'null') return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        try {
            const urlObj = new URL(clean);
            if (urlObj.hostname.includes('facebook.com') || urlObj.hostname.includes('fb.me')) return clean;
        } catch {
            return '';
        }
        return '';
    }
    const page = clean.replace(/^@/, '').trim();
    if (!page) return '';
    return `https://facebook.com/${page}`;
};

export const getTikTokUrl = (handleOrUrl?: string): string => {
    if (!handleOrUrl) return '';
    const clean = handleOrUrl.trim();
    if (!clean || clean === 'undefined' || clean === 'null') return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        try {
            const urlObj = new URL(clean);
            if (urlObj.hostname.includes('tiktok.com')) return clean;
        } catch {
            return '';
        }
        return '';
    }
    const username = clean.startsWith('@') ? clean : `@${clean}`;
    if (username === '@' || username.includes(' ')) return '';
    return `https://tiktok.com/${username}`;
};

export const getYouTubeUrl = (channelOrUrl?: string): string => {
    if (!channelOrUrl) return '';
    const clean = channelOrUrl.trim();
    if (!clean || clean === 'undefined' || clean === 'null') return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        try {
            const urlObj = new URL(clean);
            if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) return clean;
        } catch {
            return '';
        }
        return '';
    }
    const handle = clean.startsWith('@') ? clean : `@${clean}`;
    if (handle === '@') return '';
    return `https://youtube.com/${handle}`;
};

export const TikTokIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    React.createElement('svg', {
        className,
        viewBox: "0 0 24 24",
        fill: "currentColor",
        xmlns: "http://www.w3.org/2000/svg",
        'aria-hidden': "true"
    }, React.createElement('path', {
        d: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.38a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.1 15.66a6.34 6.34 0 0 0 10.82 4.48 6.3 6.3 0 0 0 1.93-4.52V8.75a8.28 8.28 0 0 0 4.84 1.56V6.86a4.87 4.87 0 0 1-1.1-.17z"
    }))
);
