
import React, { useState, useRef } from 'react';
import { DocType, ProjectFile } from '../types';
import { X, ChevronDown, UploadCloud, File, Trash2, Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, description: string, files: ProjectFile[], templateType?: DocType) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsProcessing(true);
            const newFiles: ProjectFile[] = [];
            
            // Process files to Base64
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                try {
                    const base64 = await readFileAsBase64(file);
                    newFiles.push({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        base64: base64
                    });
                } catch (err) {
                    console.error("Error processing file", file.name, err);
                }
            }

            setFiles(prev => [...prev, ...newFiles]);
            setIsProcessing(false);
        }
    };

    const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove Data URL prefix (e.g., "data:application/pdf;base64,")
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        
        const template = selectedTemplate === 'blank' ? undefined : selectedTemplate as DocType;
        onCreate(name, description, files, template);
        
        // Reset form
        setName('');
        setDescription('');
        setSelectedTemplate('blank');
        setFiles([]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Create a New Project</h2>
                            <p className="text-slate-400">Fill in the details and attach context documents.</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">Project Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Q4 Customer Portal Redesign"
                                className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">Project Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="A brief summary of the project's goals and scope."
                                className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600 h-24 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">Reference Documents (Optional)</label>
                            <p className="text-xs text-slate-500 mb-3">Upload existing BRDs, architecture diagrams, or meeting notes. The AI will use these to improve accuracy.</p>
                            
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 hover:border-primary/50 transition-all group"
                            >
                                <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-primary mb-2 transition-colors" />
                                <span className="text-sm text-slate-400 font-medium">Click to upload files (PDF, DOCX, TXT)</span>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                multiple 
                                accept=".pdf,.doc,.docx,.txt,.md,.csv" 
                                onChange={handleFileSelect} 
                            />

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 bg-blue-900/20 text-blue-400 rounded flex items-center justify-center shrink-0">
                                                    <File className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-slate-200 truncate font-medium">{file.name}</p>
                                                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => removeFile(idx)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded-md transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {isProcessing && (
                                <div className="flex items-center gap-2 text-sm text-primary mt-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing files...
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">Select a Template (Optional)</label>
                            <div className="relative">
                                <select
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="blank">Blank Project</option>
                                    <option value={DocType.BRD}>Business Requirements Document (BRD)</option>
                                    <option value={DocType.SRS}>Functional Requirements Document (SRS)</option>
                                    <option value={DocType.RFP}>Request for Proposal (RFP)</option>
                                    <option value={DocType.USER_STORIES}>User Stories & Acceptance Criteria</option>
                                    <option value={DocType.IMPACT_ANALYSIS}>Impact Analysis</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="pt-6 mt-8 border-t border-slate-800 flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 text-slate-300 hover:text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!name.trim() || isProcessing}
                                className="bg-primary hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-500 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-primary/25"
                            >
                                Create Project
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateProjectModal;
