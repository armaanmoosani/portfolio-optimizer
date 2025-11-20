import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Portfolio Optimizer",
    description: "Advanced portfolio optimization and AI stock analysis",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-slate-950 min-h-screen flex flex-col`}>
                <ClientLayout>
                    {children}
                </ClientLayout>
            </body>
        </html>
    );
}
