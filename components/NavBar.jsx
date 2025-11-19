"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function NavBar() {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navRef = useRef(null);

    const tabs = [
        { name: "Home", path: "/" },
        { name: "Portfolio Optimizer", path: "/portfolio" },
        { name: "Stock Viewer", path: "/stocks" },
        { name: "About", path: "/about" }
    ];

    const activeIndex = tabs.findIndex(tab => tab.path === pathname);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowLeft" && activeIndex > 0) {
                router.push(tabs[activeIndex - 1].path);
            } else if (e.key === "ArrowRight" && activeIndex < tabs.length - 1) {
                router.push(tabs[activeIndex + 1].path);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeIndex, router]);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    return (
        <>
            <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-center h-16">
                        {/* Desktop Navigation */}
                        <div className="hidden md:block relative">
                            <div className="flex space-x-1 p-1 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
                                {tabs.map((tab, index) => (
                                    <Link
                                        key={tab.path}
                                        href={tab.path}
                                        className={`relative px-6 py-2 text-sm font-medium transition-colors duration-200 rounded-full ${pathname === tab.path
                                            ? "text-white"
                                            : "text-slate-400 hover:text-white"
                                            }`}
                                    >
                                        {pathname === tab.path && (
                                            <motion.div
                                                layoutId="bubble"
                                                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <span className="relative z-10">{tab.name}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden absolute right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-16 right-0 bottom-0 w-64 bg-slate-900 border-l border-slate-800 z-50 md:hidden overflow-y-auto"
                        >
                            <div className="p-6 space-y-2">
                                {tabs.map((tab) => (
                                    <Link
                                        key={tab.path}
                                        href={tab.path}
                                        className={`block px-4 py-3 rounded-lg font-medium transition-colors ${pathname === tab.path
                                            ? "bg-blue-500 text-white"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                                            }`}
                                    >
                                        {tab.name}
                                    </Link>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}