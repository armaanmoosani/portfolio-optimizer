"use client";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Portfolio Optimizer",
    description: "Advanced portfolio optimization and AI stock analysis",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-slate-950 min-h-screen flex flex-col`}>
                <ToastProvider>
                    <NavBar />
                    <main className="flex-1 pt-16">
                        {children}
                    </main>
                    <Footer />
                </ToastProvider>
            </body>
        </html>
    );
}
