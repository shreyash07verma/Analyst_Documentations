
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GeneratedDocument } from '../types';
import { FileText, Check, Copy, ArrowLeft, Save, Edit3, Loader2, Sparkles, MessageSquarePlus, Image as ImageIcon } from 'lucide-react';
import ExportModal from './ExportModal';
import FeedbackModal from './FeedbackModal';
import ImageGenerationModal from './ImageGenerationModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { refineDocument } from '../services/gemini';

interface DocumentPreviewProps {
    doc: GeneratedDocument;
    docType: string;
    onBack: () => void;
    onSave: () => void;
    onEditResponses: () => void;
    version?: number;
    lastUpdated?: Date;
    isSaving: boolean;
    onDocUpdate?: (newContent: string) => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ 
    doc, 
    docType, 
    onBack, 
    onSave, 
    onEditResponses,
    version,
    lastUpdated,
    isSaving,
    onDocUpdate
}) => {
    const [copied, setCopied] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(doc.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportPDF = () => {
        const element = document.getElementById('markdown-preview');
        if (!element) return;

        setIsExporting(true);

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        // Use .html() method which works well for layout preservation
        pdf.html(element, {
            callback: function (doc) {
                const safeTitle = docType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                doc.save(`${safeTitle}.pdf`);
                setIsExporting(false);
            },
            x: 40,
            y: 40,
            width: 515, // A4 width (595pt) - margins (80pt)
            windowWidth: 800, // Render width for CSS context
            html2canvas: {
                scale: 0.7, // Adjust scale to improve quality and fit
                useCORS: true,
                logging: false
            }
        });
    };

    const handleExportWord = () => {
        const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${doc.title}</title><style>body{font-family: 'Calibri', sans-serif;} table{border-collapse: collapse; width: 100%;} td, th{border: 1px solid #000; padding: 5px;}</style></head><body>`;
        const postHtml = "</body></html>";
        
        const previewElement = document.getElementById('markdown-preview');
        if (!previewElement) return;
        
        const htmlContent = preHtml + previewElement.innerHTML + postHtml;

        const blob = new Blob(['\ufeff', htmlContent], {
            type: 'application/msword'
        });
        
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(htmlContent);
        
        const downloadLink = document.createElement("a");
        document.body.appendChild(downloadLink);
        
        if (navigator.userAgent.indexOf("Chrome") !== -1) {
             downloadLink.href = window.URL.createObjectURL(blob);
        } else {
            downloadLink.href = url;
        }
        
        downloadLink.download = `${doc.title.replace(/\s+/g, '_')}.doc`;
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    const handleExportAction = (format: 'word' | 'pdf') => {
        if (format === 'word') {
            handleExportWord();
        } else {
            handleExportPDF();
        }
        setShowExportModal(false);
    };

    const handleRefineDocument = async (section: string, feedback: string) => {
        try {
            const updatedContent = await refineDocument(doc.content, section, feedback);
            if (onDocUpdate) {
                onDocUpdate(updatedContent);
            }
        } catch (error) {
            console.error("Failed to refine doc", error);
            alert("Failed to update document. Please try again.");
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 w-full">
             <ExportModal 
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExportAction}
            />

            <FeedbackModal 
                isOpen={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
                documentContent={doc.content}
                onSubmit={handleRefineDocument}
            />

            <ImageGenerationModal 
                isOpen={showImageModal}
                onClose={() => setShowImageModal(false)}
            />

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 print:hidden animate-in slide-in-from-top duration-500">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        disabled={isSaving || isExporting}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors disabled:opacity-50"
                        title="Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{doc.title}</h1>
                        <p className="text-sm text-slate-400 flex items-center gap-2">
                            Generated by AnalystPro <span className="w-1 h-1 rounded-full bg-slate-600"></span> {version ? `v${version}` : 'Draft'}
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => setShowFeedbackModal(true)}
                        disabled={isSaving || isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-900/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-900/40 transition-all font-medium text-sm shadow-sm disabled:opacity-50"
                    >
                        <MessageSquarePlus className="w-4 h-4" />
                        Refine
                    </button>

                    <button 
                        onClick={() => setShowImageModal(true)}
                        disabled={isSaving || isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-900/20 border border-pink-500/30 text-pink-300 rounded-lg hover:bg-pink-900/40 transition-all font-medium text-sm shadow-sm disabled:opacity-50"
                    >
                        <ImageIcon className="w-4 h-4" />
                        Generate Visual
                    </button>

                    <div className="w-px h-8 bg-slate-700 mx-1 hidden md:block"></div>

                    <button 
                        onClick={onEditResponses}
                        disabled={isSaving || isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-all font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Edit3 className="w-4 h-4" />
                        Edit Responses
                    </button>

                    <button 
                        onClick={handleCopy}
                        disabled={isSaving || isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-all font-medium text-sm shadow-sm disabled:opacity-50"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    
                    <button 
                        onClick={() => setShowExportModal(true)}
                        disabled={isSaving || isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-all font-medium text-sm shadow-sm disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        {isExporting ? 'Exporting...' : 'Export'}
                    </button>

                    <button 
                        onClick={onSave}
                        disabled={isSaving || isExporting}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-medium text-sm shadow-lg shadow-primary/20 disabled:bg-slate-700 disabled:shadow-none disabled:cursor-not-allowed min-w-[140px] justify-center"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? 'Saving...' : (version ? 'Save Changes' : 'Save to Project')}
                    </button>
                </div>
            </div>

            {/* Document View */}
            <div className="bg-white shadow-2xl shadow-black/50 rounded-none md:rounded-xl min-h-[29.7cm] p-8 md:p-16 print:shadow-none print:p-0 print:w-full overflow-hidden relative">
                <div id="markdown-preview" className="markdown-body font-serif text-lg leading-relaxed max-w-[21cm] mx-auto text-slate-900 pb-16">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
                </div>
                
                {/* Footer Metadata (Visible on print/export usually, but styled here for UI) */}
                <div className="absolute bottom-0 left-0 w-full bg-slate-50 border-t border-slate-100 p-4 text-center text-xs text-slate-400 font-sans flex justify-between px-16 print:hidden">
                    <span>Doc: {docType}</span>
                    <span>Version: {version || 1}.0 &bull; Updated: {lastUpdated ? lastUpdated.toLocaleDateString() + ' ' + lastUpdated.toLocaleTimeString() : new Date().toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
};

export default DocumentPreview;
