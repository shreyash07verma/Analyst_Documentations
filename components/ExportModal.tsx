
import React, { useState } from 'react';
import { X, FileText, FileType } from 'lucide-react';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'word' | 'pdf') => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
    const [selectedFormat, setSelectedFormat] = useState<'word' | 'pdf'>('word');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-xl border border-slate-700 w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-6 flex justify-between items-center border-b border-slate-800 bg-slate-900/50">
                    <h3 className="text-xl font-bold text-white">Export Document</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-slate-400 mb-6">Choose a format to export your document.</p>
                    
                    <div className="space-y-4">
                        <label 
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${selectedFormat === 'word' ? 'bg-blue-900/20 border-primary' : 'bg-[#1e293b] border-slate-700 hover:bg-slate-800'}`}
                            onClick={() => setSelectedFormat('word')}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-lg flex items-center justify-center">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="font-medium text-white">Word Document</div>
                                    <div className="text-sm text-slate-500">For editing in Microsoft Word.</div>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedFormat === 'word' ? 'border-primary' : 'border-slate-600'}`}>
                                {selectedFormat === 'word' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                            </div>
                        </label>

                        <label 
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${selectedFormat === 'pdf' ? 'bg-blue-900/20 border-primary' : 'bg-[#1e293b] border-slate-700 hover:bg-slate-800'}`}
                            onClick={() => setSelectedFormat('pdf')}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-red-600/20 text-red-500 rounded-lg flex items-center justify-center">
                                    <FileType className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="font-medium text-white">PDF</div>
                                    <div className="text-sm text-slate-500">For sharing and printing.</div>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedFormat === 'pdf' ? 'border-primary' : 'border-slate-600'}`}>
                                {selectedFormat === 'pdf' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                            </div>
                        </label>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/30">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors rounded-lg hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onExport(selectedFormat)}
                        className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-primary/20"
                    >
                        Export
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;