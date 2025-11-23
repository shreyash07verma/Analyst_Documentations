
import React from 'react';
import { FolderKanban, User } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    currentView: string;
    onNavigate: (view: 'PROJECTS_LIST') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
    return (
        <div className="min-h-screen flex bg-[#0f172a] text-slate-50 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col fixed h-full z-20">
                <div className="p-6 flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-emerald-900/20 shrink-0">
                        AP
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-none">AnalystPro</h1>
                        <span className="text-[10px] text-slate-500 font-medium">Become a 10x Business Analyst</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <button 
                        onClick={() => onNavigate('PROJECTS_LIST')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${currentView.includes('PROJECT') || currentView === 'PROJECTS_LIST' ? 'bg-[#1e293b] text-white border border-slate-700 shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                    >
                        <FolderKanban className="w-5 h-5" />
                        <span className="font-medium">Projects</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                        <div className="w-8 h-8 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center">
                            <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">Shreyash Verma</p>
                            <p className="text-xs text-slate-500 truncate">Senior Business Analyst</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 flex flex-col min-w-0">
                {children}
            </main>
        </div>
    );
};

export default Layout;