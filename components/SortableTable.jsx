import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';

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
        if (sortConfig.key !== key) return <ChevronsUpDown className="w-4 h-4 text-slate-600 opacity-50 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-400" /> : <ArrowDown className="w-4 h-4 text-blue-400" />;
    };

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50 shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-300 uppercase bg-slate-900 border-b border-slate-700">
                    <tr>
                        {columns.map(col => (
                            <th
                                key={col.key}
                                className={`px-4 py-3 cursor-pointer hover:text-white hover:bg-slate-800 transition-colors ${col.numeric ? 'text-right' : ''}`}
                                onClick={() => handleSort(col.key)}
                            >
                                <div className={`flex items-center gap-1 ${col.numeric ? 'justify-end' : 'justify-start'}`}>
                                    {col.label} {getArrow(col.key)}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 bg-slate-800/20">
                    {sortedData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                            {columns.map(col => (
                                <td key={col.key} className={`px-4 py-3 ${col.numeric ? 'text-right font-mono' : ''}`}>
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
