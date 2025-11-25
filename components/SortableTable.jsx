import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

/**
 * SortableTable
 * Props:
 * - columns: [{ key: string, label: string, numeric?: boolean }]
 * - data: array of objects
 */
export default function SortableTable({ columns, data }) {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const sortedData = React.useMemo(() => {
        if (!sortConfig.key) return data;
        const sorted = [...data];
        sorted.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal === bVal) return 0;
            if (sortConfig.direction === 'asc') return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
        });
        return sorted;
    }, [data, sortConfig]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const getArrow = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 inline" /> : <ArrowDown className="w-4 h-4 inline" />;
    };

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-800/40">
                    <tr>
                        {columns.map(col => (
                            <th
                                key={col.key}
                                className={`px-4 py-2 cursor-pointer hover:text-white ${col.numeric ? 'text-right' : ''}`}
                                onClick={() => handleSort(col.key)}
                            >
                                {col.label} {getArrow(col.key)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {sortedData.map((row, idx) => (
                        <tr key={idx} className="bg-slate-900/20 hover:bg-slate-800/30 transition-colors">
                            {columns.map(col => (
                                <td key={col.key} className={`px-4 py-2 ${col.numeric ? 'text-right font-mono' : ''}`}>
                                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
