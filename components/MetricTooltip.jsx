import React from 'react';
import { HelpCircle } from 'lucide-react';

const MetricTooltip = ({ title, description, formula }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="relative inline-block">
            <button
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                className="ml-2 text-slate-500 hover:text-slate-300 transition-colors"
            >
                <HelpCircle className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-80 p-4 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl -left-2 top-6">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-white text-sm">{title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
                        {formula && (
                            <div className="mt-3 p-2 bg-slate-900/50 rounded border border-slate-700">
                                <p className="text-xs text-slate-400 font-mono">{formula}</p>
                            </div>
                        )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45"></div>
                </div>
            )}
        </div>
    );
};

export default MetricTooltip;
