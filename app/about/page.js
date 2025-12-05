"use client";

import { motion } from "framer-motion";

export default function AboutPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="container mx-auto px-4 py-32 max-w-3xl"
        >
            <div className="text-center space-y-12">

                {/* Mission Statement */}
                <div className="space-y-6">
                    <h1 className="text-5xl font-bold text-white tracking-tight">
                        Investing, <span className="text-blue-500">Solved.</span>
                    </h1>
                    <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                        We bridge the gap between institutional analytics and individual investors.
                        Powerful tools, simplified for everyone.
                    </p>
                </div>

                {/* Core Pillars - Minimal Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                    {[
                        { title: "Optimize", desc: "Mathematical portfolio construction." },
                        { title: "Analyze", desc: "Real-time market intelligence." },
                        { title: "Insight", desc: "AI-driven financial summaries." }
                    ].map((item, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                            <p className="text-sm text-slate-500">{item.desc}</p>
                        </div>
                    ))}
                </div>

            </div>
        </motion.div>
    );
}
