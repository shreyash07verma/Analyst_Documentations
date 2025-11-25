
import React, { useState } from 'react';
import { X, Image as ImageIcon, Download, Loader2, Sparkles } from 'lucide-react';
import { generateImage } from '../services/gemini';

interface ImageGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({ isOpen, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setGeneratedImageUrl(null);
        setError(null);
        
        try {
            const imageUrl = await generateImage(prompt, size);
            setGeneratedImageUrl(imageUrl);
        } catch (error: any) {
            console.error("Generation failed", error);
            setError("Failed to generate image. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 flex justify-between items-center border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-900/20 rounded-lg text-pink-400">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Generate Visual Asset</h3>
                            <p className="text-xs text-slate-400">Create diagrams or conceptual images using AI.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form onSubmit={handleGenerate} className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Image Description</label>
                                <input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., A flowchart showing a user login process..."
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Resolution</label>
                                <select
                                    value={size}
                                    onChange={(e) => setSize(e.target.value as any)}
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="1K">1K (Standard)</option>
                                    <option value="2K">2K (High Res)</option>
                                    <option value="4K">4K (Ultra HD)</option>
                                </select>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isGenerating || !prompt.trim()}
                            className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-medium transition-all shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {isGenerating ? 'Generating...' : 'Generate Image'}
                        </button>
                    </form>

                    {generatedImageUrl && (
                        <div className="mt-8 animate-in slide-in-from-bottom duration-500">
                            <div className="relative group rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
                                <img 
                                    src={generatedImageUrl} 
                                    alt="Generated Asset" 
                                    className="w-full h-auto object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <a 
                                        href={generatedImageUrl} 
                                        download={`generated-asset-${Date.now()}.png`}
                                        className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors transform hover:scale-105"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download PNG
                                    </a>
                                </div>
                            </div>
                            <p className="text-center text-slate-500 text-xs mt-3">
                                Right-click to save or use the download button.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageGenerationModal;
