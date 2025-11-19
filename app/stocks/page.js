import StockViewer from "@/components/StockViewer";

export default function StocksPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-12">

                <p className="text-slate-400">
                    Real-time data and AI-powered insights for any ticker.
                </p>
            </div>
            <StockViewer />
        </div>
    );
}
