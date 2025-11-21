import React from 'react';
import { FileText, Menu, User } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    onReset: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onReset }) => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div 
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={onReset}
                    >
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">AnalystAlly</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                            <User className="w-5 h-5" />
                        </button>
                        <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-grow flex flex-col">
                {children}
            </main>
            <footer className="bg-white border-t border-slate-200 py-6">
                <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
                    &copy; {new Date().getFullYear()} AnalystAlly. Powered by Gemini 2.5 Flash.
                </div>
            </footer>
        </div>
    );
};

export default Layout;