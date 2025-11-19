import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center p-24 text-center">
            <h2 className="text-3xl font-bold mb-4 text-slate-200">Not Found</h2>
            <p className="text-slate-400 mb-8">Could not find requested resource</p>
            <Link href="/" className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                Return Home
            </Link>
        </div>
    )
}
