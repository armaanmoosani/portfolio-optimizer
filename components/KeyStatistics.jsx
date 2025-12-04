import React from 'react';
import { formatLargeNumber } from './StockViewer'; // We might need to duplicate this helper or export it

const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
};

const StatBox = ({ label, value, prefix = '', suffix = '' }) => (
    <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</span>
        <span className="text-lg font-bold text-white tracking-tight">
            {value !== null && value !== undefined && value !== '-' ? `${prefix}${value}${suffix}` : '-'}
        </span>
    </div>
);

export default function KeyStatistics({ stockData, stockInfo }) {
    if (!stockData || !stockInfo) return null;

    return (
        <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-slate-900/40">
            <h3 className="text-xl font-bold text-white mb-6">Key Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Row 1 */}
                <StatBox label="Open" value={stockData.open?.toFixed(2)} prefix="$" />
                <StatBox label="High" value={stockData.high?.toFixed(2)} prefix="$" />
                <StatBox label="Low" value={stockData.low?.toFixed(2)} prefix="$" />
                <StatBox label="Prev Close" value={stockData.prevClose?.toFixed(2)} prefix="$" />

                {/* Row 2 */}
                <StatBox label="Mkt Cap" value={formatNumber(stockInfo.marketCap)} />
                <StatBox label="P/E Ratio" value={stockInfo.trailingPE?.toFixed(2)} />
                <StatBox label="52-Wk High" value={stockInfo.fiftyTwoWeekHigh?.toFixed(2)} prefix="$" />
                <StatBox label="52-Wk Low" value={stockInfo.fiftyTwoWeekLow?.toFixed(2)} prefix="$" />

                {/* Row 3 */}
                <StatBox label="Div Yield" value={stockInfo.dividendYield ? (stockInfo.dividendYield * 100).toFixed(2) : '-'} suffix="%" />
                <StatBox label="Qtrly Div" value={stockInfo.lastDividendValue || '-'} prefix="$" />
                <StatBox label="EPS (TTM)" value={stockInfo.trailingEps?.toFixed(2)} />
                <StatBox label="Volume" value={formatNumber(stockInfo.volume)} />

                {/* Row 4 - Beta (and maybe Avg Volume to fill grid) */}
                <StatBox label="Beta" value={stockInfo.beta?.toFixed(2)} />
                <StatBox label="Avg Volume" value={formatNumber(stockInfo.averageVolume)} />
            </div>
        </div>
    );
}
