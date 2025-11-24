"use client";

import dynamic from "next/dynamic";
import { LayoutGroup } from "framer-motion";
const NavBar = dynamic(() => import("@/components/NavBar"), { ssr: false });
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";

export default function ClientLayout({ children }) {
    return (
        <LayoutGroup id="navbar-tabs">
            <ToastProvider>
                <NavBar />
                <main className="flex-1 pt-16">
                    {children}
                </main>
                <Footer />
            </ToastProvider>
        </LayoutGroup>
    );
}
