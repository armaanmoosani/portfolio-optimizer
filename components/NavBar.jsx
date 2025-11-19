"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, BarChart3, Search, Settings } from "lucide-react";

const tabs = [
    { id: "home", label: "Dashboard", icon: LayoutGrid, href: "/" },
    { id: "stocks", label: "Stock Viewer", icon: Search, href: "/stocks" },
    { id: "portfolio", label: "Portfolio", icon: BarChart3, href: "/portfolio" },
    { id: "about", label: "About", icon: BarChart3, href: "/about" },
];

export default function NavBar() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (pathname !== "/") {
            router.push("/");
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const currentIndex = tabs.findIndex(tab => tab.href === pathname);
            if (currentIndex === -1) return;

            if (e.key === "ArrowRight") {
                const nextIndex = (currentIndex + 1) % tabs.length;
                router.push(tabs[nextIndex].href);
            } else if (e.key === "ArrowLeft") {
                const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                router.push(tabs[prevIndex].href);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pathname, router]);

    const activeTab = tabs.find((tab) => tab.href === pathname)?.id || "home";

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4">
            <div className="flex items-center gap-2 p-2 rounded-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/50">
                {tabs.map((tab) => (
                    <Link
                        key={tab.id}
                        href={tab.href}
                        className="relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ease-in-out group"
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="bubble"
                                className="absolute inset-0 bg-blue-600 rounded-full -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span
                            className={`flex items-center gap-2 relative z-10 ${activeTab === tab.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}