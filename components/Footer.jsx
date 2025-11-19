"use client";

export default function Footer() {
    return (
        <footer className="mt-auto border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
            <div className="container mx-auto px-4 py-6">
                <p className="text-center text-sm text-slate-500">
                    © {new Date().getFullYear()} Portfolio Optimizer. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
