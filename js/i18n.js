import { SUPPORTED_LANGUAGES, DACH_REGIONS, DACH_TIME_ZONES } from './config.js';
import { TEXT, DATA_LABEL_TRANSLATIONS_EN } from './i18n-data.js';

export function createI18n(getSelectedLanguage) {
    const dateFormatterCache = new Map();

    function normalizeLanguage(language) {
        return SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
    }

    function regionFromLocale(locale) {
        const match = String(locale || '').match(/[-_]([A-Za-z]{2})(?:$|-|_)/);
        return match ? match[1].toUpperCase() : '';
    }

    function defaultUiLanguage() {
        const languages = Array.isArray(navigator.languages) && navigator.languages.length
            ? navigator.languages
            : [navigator.language].filter(Boolean);
        const inDachLocale = languages.some((language) => DACH_REGIONS.has(regionFromLocale(language)));
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        return inDachLocale || DACH_TIME_ZONES.has(timeZone) ? 'de' : 'en';
    }

    function currentLanguage() {
        return normalizeLanguage(getSelectedLanguage?.() || defaultUiLanguage());
    }

    function currentLocale() {
        return currentLanguage() === 'de' ? 'de-DE' : 'en-US';
    }

    function t(key, values = {}) {
        const table = TEXT[currentLanguage()] || TEXT.en;
        const fallback = TEXT.en[key] || TEXT.de[key] || key;
        return String(table[key] || fallback).replace(/\{(\w+)\}/g, (match, name) => (
            Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
        ));
    }

    function formatNumber(value, options = undefined) {
        return Number(value).toLocaleString(currentLocale(), options);
    }

    function dateFormatter(key, options) {
        const cacheKey = `${currentLocale()}|${key}`;
        if (!dateFormatterCache.has(cacheKey)) {
            dateFormatterCache.set(cacheKey, new Intl.DateTimeFormat(currentLocale(), options));
        }
        return dateFormatterCache.get(cacheKey);
    }

    function formatLocalDateTime(date) {
        return dateFormatter('long', {
            weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(date);
    }

    function formatLocalShortDateTime(date) {
        return dateFormatter('short', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        }).format(date);
    }

    function formatLocalTimeOnly(date) {
        return dateFormatter('time', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(date);
    }

    function translateDataLabel(value) {
        if (currentLanguage() !== 'en' || typeof value !== 'string') return value;
        return DATA_LABEL_TRANSLATIONS_EN[value] || value;
    }

    function getLocalTimeZoneLabel(date = new Date()) {
        try {
            const part = dateFormatter('zone', { timeZoneName: 'short' })
                .formatToParts(date)
                .find((entry) => entry.type === 'timeZoneName');
            return part?.value || Intl.DateTimeFormat().resolvedOptions().timeZone ||
                (currentLanguage() === 'de' ? 'Lokal' : 'Local');
        } catch (error) {
            return currentLanguage() === 'de' ? 'Lokal' : 'Local';
        }
    }

    return {
        normalizeLanguage,
        defaultUiLanguage,
        currentLanguage,
        currentLocale,
        t,
        formatNumber,
        formatLocalDateTime,
        formatLocalShortDateTime,
        formatLocalTimeOnly,
        translateDataLabel,
        getLocalTimeZoneLabel
    };
}
