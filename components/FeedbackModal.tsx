
import React, { useState, useEffect } from 'react';
import { X, MessageSquarePlus, Sparkles, Loader2 } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentContent: string;
    onSubmit: (section: string, feedback: string) => Promise<void>;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, documentContent, onSubmit }) => {
    const [sections, setSections] = useState<string[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [feedback, setFeedback] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Parse Markdown headers to identify sections
    useEffect(() => {
        if (isOpen && documentContent) {
            // Regex to find H1, H2, H3 headers (e.g., "## Project Scope")
            const headerRegex = /^(#{1,3})\s+(.+)$/gm;
            const foundSections: string[] = [];
            let match;
            
            while ((match = headerRegex.exec(documentContent)) !== null) {
                // match[0] is full string "## Title", match[2] is just "Title"
                foundSections.push(match[0]); // Keep the hashes to help AI locate it exactly
            }
            
            setSections(foundSections);
            if (foundSections.length > 0) {
                setSelectedSection(foundSections[0]);
            }
        }
    }, [isOpen, documentContent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim() || !selectedSection) return;

        setIsProcessing(true);
        try {
            await onSubmit(selectedSection, feedback);
            setFeedback('');
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 flex justify-between items-center border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-900/20 rounded-lg text-purple-400">
                            <MessageSquarePlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Refine Document</h3>
                            <p className="text-xs text-slate-400">Give AI feedback to update a specific section.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Target Section</label>
                            <p className="text-xs text-slate-500 mb-3">Select the heading you want to modify. The AI will strictly limit changes to this area.</p>
                            <select
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                            >
                                {sections.length === 0 && <option value="">No sections found (Full Document)</option>}
                                {sections.map((sec, idx) => (
                                    <option key={idx} value={sec}>{sec.replace(/^#+\s/, '')}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Your Instructions</label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="e.g., Add a bullet point about GDPR compliance in this section..."
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all h-32 resize-none placeholder:text-slate-600"
                                required
                            />
                        </div>

                        <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-3 text-xs text-blue-300 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>The AI will rewrite the selected section based on your feedback while keeping the rest of the document exactly the same.</p>
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing || !feedback.trim()}
                                className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Update Document
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
