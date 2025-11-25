
import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectFile } from '../types';
import { X, Save, Loader2, UploadCloud, File, Trash2 } from 'lucide-react';
import { zlibSync } from 'fflate';

interface EditProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    onUpdate: (projectId: string, name: string, description: string, files: ProjectFile[]) => Promise<void>;
}

const MAX_COMPRESSED_BINARY_SIZE = 700 * 1024; // 700KB binary limit per compressed file

const EditProjectModal: React.FC<EditProjectModalProps> = ({ isOpen, onClose, project, onUpdate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (project) {
            setName(project.name);
            setDescription(project.description);
            setFiles(project.files || []);
        }
    }, [project]);

    if (!isOpen || !project) return null;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsProcessing(true);
            const newFiles: ProjectFile[] = [];
            let errorMsg = "";
            
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                try {
                    const processed = await processFile(file);
                    
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
                        size: file.size,
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSaving(true);
        try {
            await onUpdate(project.id, name, description, files);
            onClose();
        } catch (error) {
            console.error("Failed to update project", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 shrink-0">
                    <h3 className="text-xl font-bold text-white">Edit Project Details</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Project Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Project Name"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all h-24 resize-none"
                                placeholder="Project Description"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Reference Documents</label>
                            <div 
                                onClick={() => !isProcessing && fileInputRef.current?.click()}
                                className={`
                                    border border-dashed border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-all mb-3
                                    hover:bg-slate-800/50 hover:border-primary/50
                                    ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                <UploadCloud className="w-6 h-6 text-slate-500 mb-2" />
                                <span className="text-xs text-slate-400">Click to upload more files</span>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                multiple 
                                accept=".pdf,.doc,.docx,.txt,.md,.csv" 
                                onChange={handleFileSelect} 
                                disabled={isProcessing}
                            />

                            {/* File List */}
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {files.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-6 h-6 bg-blue-900/20 text-blue-400 rounded flex items-center justify-center shrink-0">
                                                <File className="w-3 h-3" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm text-slate-200 truncate">{file.name}</p>
                                                <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB {file.isCompressed ? '(Compressed)' : ''}</p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => removeFile(idx)}
                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded-md transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {files.length === 0 && (
                                    <p className="text-xs text-slate-500 text-center py-2">No files attached.</p>
                                )}
                            </div>
                            
                            {isProcessing && (
                                <div className="flex items-center gap-2 text-xs text-primary mt-2">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Processing...
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !name.trim() || isProcessing}
                                className="bg-primary hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProjectModal;
