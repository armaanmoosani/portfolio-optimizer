"use client";

import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";

export default function ClientLayout({ children }) {
    return (
        <ToastProvider>
            <NavBar />
            <main className="flex-1 pt-16">
                {children}
            </main>
            <Footer />
        </ToastProvider>
    );
}
