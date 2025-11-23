
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ProjectsList from './components/ProjectsList';
import CreateProjectModal from './components/CreateProjectModal';
import ProjectDetails from './components/ProjectDetails';
import Dashboard from './components/Dashboard';
import Interview from './components/Interview';
import DocumentPreview from './components/DocumentPreview';
import { generateQuestionsForDoc, generateDocumentContent } from './services/gemini';
import { initDB, getAllProjects, saveProject } from './services/db';
import { AppView, Template, Question, Answer, GeneratedDocument, Project, DocType, DocumentArtifact, ProjectFile } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
    // App State
    const [view, setView] = useState<AppView>('PROJECTS_LIST');
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Document Generation State
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [lastUsedAnswers, setLastUsedAnswers] = useState<Answer[]>([]); // Cache for optimization
    const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
    
    // Edit Mode State
    const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null);

    // --- Initialization ---
    
    useEffect(() => {
        const initializeApp = async () => {
            try {
                await initDB();
                const loadedProjects = await getAllProjects();
                setProjects(loadedProjects);
            } catch (error) {
                console.error("Failed to initialize database:", error);
                // If DB fails, we might still want to let the UI load empty or show error
            } finally {
                setIsLoading(false);
            }
        };
        initializeApp();
    }, []);

    // --- Navigation Handlers ---

    const handleCreateProject = async (name: string, description: string, files: ProjectFile[], templateType?: DocType) => {
        const newProject: Project = {
            id: crypto.randomUUID(),
            name,
            description,
            documents: [],
            files: files,
            createdAt: new Date()
        };
        
        try {
            // Save to DB
            await saveProject(newProject);

            setProjects(prev => [newProject, ...prev]);
            setActiveProject(newProject);
            setIsCreateModalOpen(false);

            if (templateType) {
                const templateMock: Template = {
                    id: templateType,
                    name: templateType,
                    description: '',
                    iconName: 'FileText',
                    type: templateType
                };
                handleSelectTemplate(templateMock);
            } else {
                setView('PROJECT_DETAILS');
            }
        } catch (error) {
            console.error("Failed to save project:", error);
            alert("Failed to save project to local storage. Please check your browser settings.");
        }
    };

    const handleOpenProject = (project: Project) => {
        setActiveProject(project);
        setView('PROJECT_DETAILS');
        resetDocGenState();
    };

    const handleOpenArtifact = async (artifact: DocumentArtifact) => {
        // Set edit context
        setEditingArtifactId(artifact.id);
        
        // Reconstruct template
        const templateMock: Template = {
            id: artifact.type,
            name: artifact.type,
            description: '',
            iconName: 'FileText',
            type: artifact.type
        };
        setSelectedTemplate(templateMock);

        // Load existing data
        setAnswers(artifact.answers);
        setLastUsedAnswers(artifact.answers); // Initialize cache with current saved answers
        
        setGeneratedDoc({
            title: artifact.title,
            content: artifact.content
        });
        
        // We also need to load the questions if the user wants to edit responses
        // Fetch questions in background or wait? Let's wait to ensure consistency
        const questionsLoaded = await generateQuestionsForDoc(artifact.type);
        setQuestions(questionsLoaded);

        // Navigate to preview directly
        setView('PREVIEW');
    };

    const handleEditResponses = () => {
        // User wants to modify answers for the current document
        // State is already loaded (questions, answers, template)
        setView('INTERVIEW');
    };

    const handleSelectTemplate = async (template: Template) => {
        // New document flow
        resetDocGenState();
        setSelectedTemplate(template);
        setView('GENERATING_QUESTIONS');

        const generatedQuestions = await generateQuestionsForDoc(template.type);
        
        setQuestions(generatedQuestions);
        setView('INTERVIEW');
    };

    const handleInterviewComplete = async (collectedAnswers: Answer[]) => {
        setAnswers(collectedAnswers);

        // Optimization: Check if answers have changed since last generation
        // Only skip if we actually have a generated doc to show
        if (generatedDoc && lastUsedAnswers.length > 0 && JSON.stringify(collectedAnswers) === JSON.stringify(lastUsedAnswers)) {
            console.log("Answers unchanged, skipping regeneration.");
            setView('PREVIEW');
            return;
        }

        setView('GENERATING_DOC');
        
        if (!selectedTemplate) return;

        // Use active project for context
        const projectContext = activeProject 
            ? { 
                name: activeProject.name, 
                description: activeProject.description,
                files: activeProject.files || [] 
              }
            : { name: "Business Analysis Project", description: "General Requirement Analysis", files: [] };

        const docName = selectedTemplate.name;

        try {
            setGeneratedDoc({
                title: docName,
                content: "" 
            });

            await generateDocumentContent(
                selectedTemplate.type,
                collectedAnswers,
                projectContext,
                (streamedText) => {
                    setGeneratedDoc({
                        title: docName,
                        content: streamedText
                    });
                }
            );
            
            // Update the cache with the answers used for this successful generation
            setLastUsedAnswers(collectedAnswers);
            
            setView('PREVIEW');
        } catch (error) {
            console.error("Failed to generate doc", error);
            setView('INTERVIEW');
            alert("Something went wrong generating the document. Please try again.");
        }
    };

    const handleSaveDocument = async () => {
        if (!activeProject || !generatedDoc || !selectedTemplate) return;

        let updatedProject = { ...activeProject };

        if (editingArtifactId) {
            // Update existing artifact
            updatedProject.documents = updatedProject.documents.map(doc => {
                if (doc.id === editingArtifactId) {
                    return {
                        ...doc,
                        content: generatedDoc.content,
                        answers: answers,
                        version: doc.version + 1,
                        lastUpdated: new Date()
                    };
                }
                return doc;
            });
        } else {
            // Create new artifact
            const newArtifact: DocumentArtifact = {
                id: crypto.randomUUID(),
                title: generatedDoc.title,
                type: selectedTemplate.type,
                content: generatedDoc.content,
                answers: answers,
                version: 1,
                lastUpdated: new Date(),
                createdAt: new Date()
            };
            updatedProject.documents = [newArtifact, ...updatedProject.documents];
        }

        try {
            // Save to DB
            await saveProject(updatedProject);

            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
            setActiveProject(updatedProject);
            
            // Reset state
            resetDocGenState();
            setView('PROJECT_DETAILS');
        } catch (error) {
            console.error("Failed to save document:", error);
            alert("Failed to save the document to the database.");
        }
    };

    const resetDocGenState = () => {
        setSelectedTemplate(null);
        setQuestions([]);
        setAnswers([]);
        setLastUsedAnswers([]);
        setGeneratedDoc(null);
        setEditingArtifactId(null);
    };

    // --- Render Logic ---

    if (isLoading) {
        return (
            <div className="flex h-screen bg-[#0f172a] items-center justify-center">
                <div className="text-center">
                     <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                     <p className="text-slate-400">Loading AnalystPro...</p>
                </div>
            </div>
        );
    }

    return (
        <Layout currentView={view} onNavigate={(v) => setView(v)}>
            <CreateProjectModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateProject}
            />

            {view === 'PROJECTS_LIST' && (
                <ProjectsList 
                    projects={projects}
                    onOpenProject={handleOpenProject}
                    onNewProject={() => setIsCreateModalOpen(true)}
                />
            )}

            {view === 'PROJECT_DETAILS' && activeProject && (
                <ProjectDetails 
                    project={activeProject} 
                    onBack={() => setView('PROJECTS_LIST')}
                    onCreateArtifact={() => setView('TEMPLATE_SELECT')}
                    onOpenArtifact={handleOpenArtifact}
                />
            )}

            {view === 'TEMPLATE_SELECT' && (
                <Dashboard 
                    onSelectTemplate={handleSelectTemplate}
                    onCancel={() => setView(activeProject ? 'PROJECT_DETAILS' : 'PROJECTS_LIST')}
                />
            )}

            {view === 'GENERATING_QUESTIONS' && (
                <div className="flex flex-col items-center justify-center h-full flex-grow">
                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-xl font-medium text-slate-600">Analysing requirements and formulating questions...</p>
                    </div>
                </div>
            )}

            {(view === 'INTERVIEW' || view === 'GENERATING_DOC') && (
                <Interview 
                    questions={questions}
                    initialAnswers={answers} // Pass existing answers if editing
                    onComplete={handleInterviewComplete}
                    onBack={() => editingArtifactId ? setView('PREVIEW') : setView('TEMPLATE_SELECT')}
                    isGenerating={view === 'GENERATING_DOC'}
                />
            )}

            {view === 'PREVIEW' && generatedDoc && selectedTemplate && (
                <DocumentPreview 
                    doc={generatedDoc}
                    docType={selectedTemplate.name}
                    onBack={() => editingArtifactId ? setView('PROJECT_DETAILS') : setView('INTERVIEW')}
                    onSave={handleSaveDocument}
                    onEditResponses={handleEditResponses}
                    version={editingArtifactId ? activeProject?.documents.find(d => d.id === editingArtifactId)?.version : undefined}
                    lastUpdated={editingArtifactId ? undefined : undefined} // New unsaved docs don't have lastUpdated yet
                />
            )}
        </Layout>
    );
};

export default App;
