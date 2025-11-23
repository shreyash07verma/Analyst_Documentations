
import React from 'react';
import { Project, DocumentArtifact } from '../types';
import { ArrowLeft, Plus, FileText, Calendar, Clock, Table, Hash, Edit3 } from 'lucide-react';

interface ProjectDetailsProps {
    project: Project;
    onBack: () => void;
    onCreateArtifact: () => void;
    onOpenArtifact: (artifact: DocumentArtifact) => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onBack, onCreateArtifact, onOpenArtifact }) => {
    return (
        <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Projects
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 border-b border-slate-800 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700">
                            Active
                        </span>
                    </div>
                    <p className="text-slate-400 max-w-2xl">{project.description || "No description provided."}</p>
                </div>
                <button 
                    onClick={onCreateArtifact}
                    className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20 shrink-0"
                >
                    <Plus className="w-5 h-5" />
                    New Artifact
                </button>
            </div>

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                Project Artifacts
                <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-md">{project.documents.length}</span>
            </h2>

            {project.documents.length === 0 ? (
                <div className="bg-[#1e293b] border border-slate-800 border-dashed rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No documents yet</h3>
                    <p className="text-slate-400 mb-6">Start by creating a new artifact for this project.</p>
                    <button 
                        onClick={onCreateArtifact}
                        className="text-primary hover:text-blue-400 font-medium"
                    >
                        Create Artifact
                    </button>
                </div>
            ) : (
                <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Document Name</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 w-24 text-center">Version</th>
                                    <th className="px-6 py-4">Last Updated</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {project.documents.map((doc) => (
                                    <tr 
                                        key={doc.id} 
                                        className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                                        onClick={() => onOpenArtifact(doc)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-900/20 text-blue-400 rounded-lg">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium text-white group-hover:text-primary transition-colors">
                                                    {doc.title}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-400">{doc.type}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
                                                v{doc.version}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-slate-300">
                                                    {doc.lastUpdated.toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {doc.lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onOpenArtifact(doc); }}
                                                className="text-sm font-medium text-primary hover:text-blue-400 flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Edit3 className="w-3 h-3" />
                                                Open / Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetails;
