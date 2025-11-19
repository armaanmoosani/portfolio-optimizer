import StockViewer from "@/components/StockViewer";

export default function StocksPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
                    AI Stock Viewer
                </h1>
                <p className="text-slate-400">
                    Real-time data and AI-powered insights for any ticker.
                </p>
            </div>
            <StockViewer />
        </div>
    );
}
