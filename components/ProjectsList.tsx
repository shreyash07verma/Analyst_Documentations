
import React from 'react';
import { Project } from '../types';
import { Plus, FolderOpen, FileText, ChevronRight, Edit } from 'lucide-react';

interface ProjectsListProps {
    projects: Project[];
    onOpenProject: (project: Project) => void;
    onNewProject: () => void;
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void; // Kept for interface compatibility
    deletingProjectId: string | null;
}

const ProjectsList: React.FC<ProjectsListProps> = ({ projects, onOpenProject, onNewProject, onEdit }) => {
    return (
        <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-bold text-white">All Projects</h1>
                <button 
                    onClick={onNewProject}
                    className="flex items-center gap-2 bg-primary hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus className="w-4 h-4" />
                    New Project
                </button>
            </div>
            <p className="text-slate-400 mb-8">Manage your projects or create a new one.</p>

            {projects.length === 0 ? (
                <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-16 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FolderOpen className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">Get started by creating your first project to organize your business requirements and artifacts.</p>
                    <button 
                        onClick={onNewProject}
                        className="text-primary hover:text-blue-400 font-medium underline underline-offset-4"
                    >
                        Create a Project
                    </button>
                </div>
            ) : (
                <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                    <div className="grid grid-cols-12 gap-4 p-4 bg-slate-800/50 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="col-span-6 pl-4">Project Name</div>
                        <div className="col-span-2">Documents</div>
                        <div className="col-span-4 text-right pr-4">Actions</div>
                    </div>
                    <div className="divide-y divide-slate-800">
                        {projects.map((project) => (
                            <div 
                                key={project.id}
                                className="grid grid-cols-12 gap-4 p-4 transition-colors items-center group relative hover:bg-slate-800/50"
                            >
                                {/* Main Clickable Content Area */}
                                <div 
                                    onClick={() => onOpenProject(project)}
                                    className="col-span-8 grid grid-cols-8 gap-4 cursor-pointer"
                                >
                                    <div className="col-span-6 pl-4">
                                        <h3 className="font-medium text-white text-lg group-hover:text-primary transition-colors">{project.name}</h3>
                                        {project.description && (
                                            <p className="text-sm text-slate-500 mt-1 truncate">{project.description}</p>
                                        )}
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2 text-slate-300">
                                        <FileText className="w-4 h-4 text-slate-500" />
                                        <span>{project.documents.length}</span>
                                    </div>
                                </div>

                                {/* Actions Area */}
                                <div className="col-span-4 flex justify-end gap-2 pr-4 relative z-20">
                                     <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenProject(project);
                                        }}
                                        className="text-primary hover:text-blue-400 text-sm font-medium px-3 py-1.5 rounded hover:bg-blue-900/20 transition-colors flex items-center gap-1"
                                    >
                                        Open
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(project);
                                        }}
                                        className="text-slate-400 hover:text-white p-2 rounded hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
                                        title="Edit Project"
                                    >
                                        <Edit className="w-4 h-4" />
                                        <span>Edit</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectsList;
