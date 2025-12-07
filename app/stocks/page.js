"use client";

import { motion } from "framer-motion";
import dynamic from 'next/dynamic';

const StockViewer = dynamic(() => import("@/components/StockViewer"), {
    ssr: false,
    loading: () => <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
});

export default function StocksPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="min-h-screen pt-12 pb-12"
        >
            <StockViewer />
        </motion.div>
    );
}
