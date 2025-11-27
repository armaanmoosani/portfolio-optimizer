/**
 * Standardized Formatting Utilities
 * Single source of truth for all formatting across the application
 * 
 * DATA FORMAT CONVENTION:
 * - Backend returns DECIMALS (0.1234 = 12.34%)
 * - Frontend converts to percentages for display
 */

/**
 * Format decimal as percentage
 * @param {number} value - Decimal value (e.g., 0.1234 for 12.34%)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage (e.g., "12.34%")
 */
export const formatPercent = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0.00%';
    }
    return `${(Number(value) * 100).toFixed(decimals)}%`;
};

/**
 * Format number with specified decimal places
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number
 */
export const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) {
        return (0).toFixed(decimals);
    }
    return Number(value).toFixed(decimals);
};

/**
 * Format value as currency (USD)
 * @param {number} value - Dollar amount
 * @param {number} maxFractionDigits - Maximum decimals (default: 0)
 * @returns {string} Formatted currency (e.g., "$1,234")
 */
export const formatCurrency = (value, maxFractionDigits = 0) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '$0';
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: maxFractionDigits
    }).format(value);
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Format large numbers with K/M/B suffix
 * @param {number} value - Number to format
 * @returns {string} Formatted number (e.g., "1.2K", "3.5M")
 */
export const formatCompact = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1e9) {
        return `${sign}${(absValue / 1e9).toFixed(1)}B`;
    } else if (absValue >= 1e6) {
        return `${sign}${(absValue / 1e6).toFixed(1)}M`;
    } else if (absValue >= 1e3) {
        return `${sign}${(absValue / 1e3).toFixed(1)}K`;
    }
    return `${sign}${absValue.toFixed(0)}`;
};
