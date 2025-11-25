"use client";

import { useEffect, useState } from 'react';
import PortfolioReport from '@/components/PortfolioReport';
import { Loader2 } from 'lucide-react';

export default function ReportPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedData = localStorage.getItem('portfolioReportData');
            if (storedData) {
                setData(JSON.parse(storedData));
            }
        } catch (error) {
            console.error("Failed to load report data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-trigger print dialog if requested
    useEffect(() => {
        if (data && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('print') === 'true') {
                // Wait a bit for charts to render
                setTimeout(() => {
                    window.print();
                }, 1000);
            }
        }
    }, [data]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
                <h1 className="text-2xl font-bold mb-4">No Report Data Found</h1>
                <p className="text-slate-400 mb-8">Please go back to the dashboard and generate a report.</p>
                <button
                    onClick={() => window.close()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                    Close Tab
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            <div className="print:hidden p-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-50 shadow-lg">
                <h1 className="font-bold">Print Preview</h1>
                <div className="flex gap-4">
                    <button
                        onClick={() => window.close()}
                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium flex items-center gap-2"
                    >
                        Print Report
                    </button>
                </div>
            </div>
            <div className="py-8 print:py-0">
                <PortfolioReport data={data} />
            </div>
        </div>
    );
}
