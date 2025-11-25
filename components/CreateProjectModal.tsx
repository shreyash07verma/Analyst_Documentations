
import React, { useState, useRef } from 'react';
import { DocType, ProjectFile } from '../types';
import { X, ChevronDown, UploadCloud, File, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { zlibSync } from 'fflate';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, description: string, files: ProjectFile[], templateType?: DocType) => void;
}

// Firestore document limit is ~1MB.
// We set a safe limit for the COMPRESSED payload per file to ensure multiple files fit.
// Assuming user might upload 2-3 files, keeping individual file limit around 900KB (base64) is risky if there are many.
// But as per request "compress instead", we use compression to fit more.
// Let's set a check on the *compressed* binary size. 
// Base64 expansion is 4/3. So 1MB Base64 = 750KB binary.
const MAX_COMPRESSED_BINARY_SIZE = 700 * 1024; // 700KB binary limit per compressed file

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
            let errorMsg = "";
            
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                try {
                    const processed = await processFile(file);
                    
                    // processed.base64 is the Base64 string of the compressed data
                    // Calculate estimated size contribution
                    if (processed.base64.length > (MAX_COMPRESSED_BINARY_SIZE * 1.34)) {
                         errorMsg += `File "${file.name}" is too large even after compression (Compressed > 700KB).\n`;
                         continue;
                    }

                    newFiles.push(processed);
                } catch (err) {
                    console.error("Error processing file", file.name, err);
                    errorMsg += `Failed to process "${file.name}".\n`;
                }
            }

            if (errorMsg) {
                alert(errorMsg);
            }

            setFiles(prev => [...prev, ...newFiles]);
            setIsProcessing(false);
            
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const processFile = (file: File): Promise<ProjectFile> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const buffer = e.target?.result as ArrayBuffer;
                    const uint8 = new Uint8Array(buffer);
                    
                    // Compress using zlib (level 9 for max compression)
                    const compressed = zlibSync(uint8, { level: 9 });
                    
                    // Convert compressed Uint8Array to Base64
                    // Note: Using loop for safety with large arrays, though slightly slower than spread
                    let binary = '';
                    const len = compressed.byteLength;
                    const chunkSize = 8192;
                    
                    for (let i = 0; i < len; i += chunkSize) {
                        const chunk = compressed.subarray(i, Math.min(i + chunkSize, len));
                        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
                    }
                    
                    const base64 = window.btoa(binary);
                    
                    resolve({
                        name: file.name,
                        type: file.type,
                        size: file.size, // Store original size for display
                        base64: base64,
                        isCompressed: true
                    });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (files.length === 0) return; 
        
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
                            <label className="block text-sm font-medium text-slate-200 mb-2">Reference Documents <span className="text-red-500">*</span></label>
                            <p className="text-xs text-slate-500 mb-3">
                                Upload text-based documents (PDF, DOCX). Files are compressed automatically.
                                <br/>
                                <span className="text-amber-500">Max compressed size per file: ~700KB.</span>
                            </p>
                            
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all group
                                    ${files.length === 0 ? 'border-amber-700/50 bg-amber-900/10' : 'border-slate-700 hover:bg-slate-800/50 hover:border-primary/50'}
                                `}
                            >
                                <UploadCloud className={`w-8 h-8 mb-2 transition-colors ${files.length === 0 ? 'text-amber-500' : 'text-slate-500 group-hover:text-primary'}`} />
                                <span className={`text-sm font-medium ${files.length === 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                    {files.length === 0 ? 'Required: Click to upload a file' : 'Click to upload more files'}
                                </span>
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
                                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                                        <span>Orig: {(file.size / 1024).toFixed(1)} KB</span>
                                                        {file.isCompressed && (
                                                            <span className="text-emerald-400">• Compressed</span>
                                                        )}
                                                    </p>
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

                            {files.length === 0 && (
                                <div className="flex items-center gap-2 mt-2 text-amber-500 text-xs font-medium">
                                    <AlertCircle className="w-3 h-3" />
                                    At least 1 reference file is required.
                                </div>
                            )}
                            
                            {isProcessing && (
                                <div className="flex items-center gap-2 text-sm text-primary mt-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Compressing and processing files...
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
                                disabled={!name.trim() || files.length === 0 || isProcessing}
                                className="bg-primary hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-primary/25"
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
