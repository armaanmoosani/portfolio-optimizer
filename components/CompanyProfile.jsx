import React from 'react';
import { Building2, Globe, Users } from 'lucide-react';

export default function CompanyProfile({ stockInfo, description }) {
    if (!stockInfo) return null;

    return (
        <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-slate-900/40">
            <h3 className="text-xl font-bold text-white mb-6">Company Profile</h3>

            <div className="space-y-6">
                <div className="flex gap-4">
                    <div className="flex-1 bg-slate-900/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                            <Building2 className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Sector</span>
                        </div>
                        <div className="text-white font-semibold">{stockInfo.sector || '-'}</div>
                    </div>
                    <div className="flex-1 bg-slate-900/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                            <Globe className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Industry</span>
                        </div>
                        <div className="text-white font-semibold">{stockInfo.industry || '-'}</div>
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">About</h4>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}
