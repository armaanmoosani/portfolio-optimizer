"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBarMinimal() {
    const pathname = usePathname();

    const tabs = [
        { name: "Home", path: "/" },
        { name: "Portfolio", path: "/portfolio" },
        { name: "Stocks", path: "/stocks" },
        { name: "About", path: "/about" },
        { name: "Test", path: "/test" },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800">
            <div className="container mx-auto px-4 py-4">
                <div className="flex justify-center space-x-4">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.path}
                            href={tab.path}
                            className={`px-4 py-2 rounded ${pathname === tab.path
                                    ? "bg-blue-500 text-white"
                                    : "text-slate-400 hover:text-white"
                                }`}
                        >
                            {tab.name}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}
