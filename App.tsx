
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ProjectsList from './components/ProjectsList';
import CreateProjectModal from './components/CreateProjectModal';
import EditProjectModal from './components/EditProjectModal';
import ProjectDetails from './components/ProjectDetails';
import Dashboard from './components/Dashboard';
import Interview from './components/Interview';
import DocumentPreview from './components/DocumentPreview';
import Auth from './components/Auth';
import UserProfileModal from './components/UserProfileModal';
import { generateQuestionsForDoc, generateDocumentContent, autoAnswerQuestions } from './services/gemini';
import { getUserProjects, saveUserProject, saveProjectArtifact, deleteUserProject } from './services/projectService';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { syncUserToFirestore, updateUserProfile, deleteUserAccount } from './services/userService';
import { AppView, Template, Question, Answer, GeneratedDocument, Project, DocType, DocumentArtifact, ProjectFile, UserProfile } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    
    // UI State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isAppLoading, setIsAppLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

    // App State
    const [view, setView] = useState<AppView>('PROJECTS_LIST');
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);

    // Document Generation State
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [lastUsedAnswers, setLastUsedAnswers] = useState<Answer[]>([]); 
    const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
    
    // Edit Mode State
    const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null);

    // --- Helper Functions ---
    const resetDocGenState = () => {
        setSelectedTemplate(null);
        setQuestions([]);
        setAnswers([]);
        setLastUsedAnswers([]);
        setGeneratedDoc(null);
        setEditingArtifactId(null);
    };

    // --- Initialization ---
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser && !currentUser.emailVerified) {
                signOut(auth).catch((err) => console.error("Force signout error", err));
                setUser(null);
                setUserProfile(null);
            } else if (currentUser) {
                setUser(currentUser);
                try {
                    const profile = await syncUserToFirestore(currentUser);
                    setUserProfile(profile);
                    
                    setIsAppLoading(true);
                    const loadedProjects = await getUserProjects(currentUser.uid);
                    setProjects(loadedProjects);
                    setIsAppLoading(false);
                } catch (err) {
                    console.error("Data sync error:", err);
                    setIsAppLoading(false);
                }
            } else {
                setUser(null);
                setUserProfile(null);
                setProjects([]);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Profile Handlers ---

    const handleUpdateProfile = async (data: Partial<UserProfile>) => {
        if (!user || !userProfile) return;
        await updateUserProfile(user.uid, data);
        setUserProfile(prev => prev ? { ...prev, ...data } : null);
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        await deleteUserAccount(user);
        setUser(null);
        setUserProfile(null);
    };

    // --- Navigation Handlers ---

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
            setProjects([]);
            setActiveProject(null);
            setView('PROJECTS_LIST');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const handleCreateProject = async (name: string, description: string, files: ProjectFile[], templateType?: DocType) => {
        if (!user) return;

        const newProject: Project = {
            id: crypto.randomUUID(),
            name,
            description,
            documents: [],
            files: files,
            createdAt: new Date()
        };
        
        try {
            await saveUserProject(user.uid, newProject);
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
            alert("Failed to save project to cloud.");
        }
    };

    const handleUpdateProject = async (projectId: string, name: string, description: string, files: ProjectFile[]) => {
        if (!user) return;

        const existingProject = projects.find(p => p.id === projectId);
        if (!existingProject) return;

        const updatedProject = {
            ...existingProject,
            name,
            description,
            files
        };

        try {
            await saveUserProject(user.uid, updatedProject);
            setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
            if (activeProject?.id === projectId) {
                setActiveProject(updatedProject);
            }
        } catch (error) {
            console.error("Failed to update project:", error);
            alert("Failed to update project.");
        }
    };

    const handleDeleteProject = async (project: Project) => {
        if (!user) return;
        if (!window.confirm(`Are you sure you want to delete the project "${project.name}"?`)) {
            return;
        }

        setDeletingProjectId(project.id);
        
        try {
            await deleteUserProject(user.uid, project.id);
            setProjects(prev => prev.filter(p => p.id !== project.id));
            
            if (activeProject?.id === project.id) {
                setActiveProject(null);
                setView('PROJECTS_LIST');
            }
            setTimeout(() => alert("Project deleted successfully."), 100);
        } catch (error: any) {
            console.error("Failed to delete project:", error);
            alert(`Failed to delete project: ${error.message || 'Unknown error'}`);
        } finally {
            setDeletingProjectId(null);
        }
    };

    const handleEditProjectClick = (project: Project) => {
        setProjectToEdit(project);
        setIsEditProjectModalOpen(true);
    };

    const handleOpenProject = (project: Project) => {
        setActiveProject(project);
        setView('PROJECT_DETAILS');
        resetDocGenState();
    };

    const handleOpenArtifact = async (artifact: DocumentArtifact) => {
        setEditingArtifactId(artifact.id);
        const templateMock: Template = {
            id: artifact.type,
            name: artifact.type,
            description: '',
            iconName: 'FileText',
            type: artifact.type
        };
        setSelectedTemplate(templateMock);
        setAnswers(artifact.answers);
        setLastUsedAnswers(artifact.answers);
        setGeneratedDoc({
            title: artifact.title,
            content: artifact.content
        });
        const questionsLoaded = await generateQuestionsForDoc(artifact.type);
        setQuestions(questionsLoaded);
        setView('PREVIEW');
    };

    const handleEditResponses = () => {
        setView('INTERVIEW');
    };

    const handleSelectTemplate = async (template: Template) => {
        resetDocGenState();
        setSelectedTemplate(template);
        setView('GENERATING_QUESTIONS');
        
        // 1. Get Questions
        const generatedQuestions = await generateQuestionsForDoc(template.type);
        setQuestions(generatedQuestions);

        // 2. Auto-Fill Answers from Files
        if (activeProject && activeProject.files && activeProject.files.length > 0) {
            try {
                const autoAnswers = await autoAnswerQuestions(generatedQuestions, {
                    name: activeProject.name,
                    description: activeProject.description,
                    files: activeProject.files
                });
                setAnswers(autoAnswers);
            } catch (e) {
                console.error("Auto-fill error", e);
            }
        }
        
        setView('INTERVIEW');
    };

    const handleInterviewComplete = async (collectedAnswers: Answer[]) => {
        setAnswers(collectedAnswers);

        if (generatedDoc && lastUsedAnswers.length > 0 && JSON.stringify(collectedAnswers) === JSON.stringify(lastUsedAnswers)) {
            setView('PREVIEW');
            return;
        }

        setView('GENERATING_DOC');
        
        if (!selectedTemplate) return;

        const projectContext = activeProject 
            ? { 
                name: activeProject.name, 
                description: activeProject.description,
                files: activeProject.files || [] 
              }
            : { name: "Business Analysis Project", description: "General Requirement Analysis", files: [] };

        const docName = selectedTemplate.name;

        try {
            setGeneratedDoc({ title: docName, content: "" });

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
            
            setLastUsedAnswers(collectedAnswers);
            setView('PREVIEW');
        } catch (error) {
            console.error("Failed to generate doc", error);
            setView('INTERVIEW');
            alert("Error generating document. Please try again.");
        }
    };

    const handleSaveDocument = async () => {
        if (!user) {
            alert("You must be logged in to save.");
            return;
        }
        if (!activeProject) {
            alert("Error: No active project context.");
            return;
        }
        if (!generatedDoc) {
            alert("Error: No content to save.");
            return;
        }
        if (!selectedTemplate) {
            alert("Error: Template missing.");
            return;
        }

        setIsSaving(true);

        try {
            let artifactToSave: DocumentArtifact;

            // 1. Prepare the artifact object
            if (editingArtifactId) {
                const existing = activeProject.documents.find(d => d.id === editingArtifactId);
                if (!existing) throw new Error("Could not find artifact to update.");
                
                artifactToSave = {
                    ...existing,
                    content: generatedDoc.content,
                    answers: answers,
                    version: existing.version + 1,
                    lastUpdated: new Date()
                };
            } else {
                artifactToSave = {
                    id: crypto.randomUUID(),
                    title: generatedDoc.title,
                    type: selectedTemplate.type,
                    content: generatedDoc.content,
                    answers: answers,
                    version: 1,
                    lastUpdated: new Date(),
                    createdAt: new Date()
                };
            }
            
            // 2. Save to Firestore
            await saveProjectArtifact(user.uid, activeProject.id, artifactToSave);

            // 3. Update local state
            const updatedProject = { ...activeProject };
            const docIndex = updatedProject.documents.findIndex(d => d.id === artifactToSave.id);
            
            if (docIndex >= 0) {
                updatedProject.documents[docIndex] = artifactToSave;
            } else {
                updatedProject.documents = [artifactToSave, ...updatedProject.documents];
            }
            
            // Sort artifacts by lastUpdated
            updatedProject.documents.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

            setActiveProject(updatedProject);
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
            
            alert("Document saved successfully!");
            setView('PROJECT_DETAILS');

        } catch (error) {
            console.error("Failed to save artifact", error);
            alert("Failed to save document.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- RENDER LOGIC ---

    // 1. Loading State
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    // 2. Unauthenticated State (No Sidebar)
    if (!user) {
        return <Auth />;
    }

    // Determine loading strings based on view state
    const isInitializing = view === 'GENERATING_QUESTIONS';
    const isDrafting = view === 'GENERATING_DOC';
    
    let loadingTitle = "Processing";
    let loadingMessage = "Please wait...";

    if (isInitializing) {
        loadingTitle = "Building Project Context";
        loadingMessage = "Reading your uploaded reference documents and extracting key insights to prepare the draft...";
    } else if (isDrafting) {
        loadingTitle = "Analysing & Drafting";
        loadingMessage = "Consulting external sources, verifying data, and synthesizing your document...";
    }

    // 3. Authenticated State (Sidebar + Content)
    return (
        <Layout 
            currentView={view} 
            onNavigate={() => setView('PROJECTS_LIST')} 
            userProfile={userProfile}
            onSignOut={handleSignOut}
            onOpenProfile={() => setIsProfileModalOpen(true)}
        >
            {isAppLoading ? (
                <div className="flex items-center justify-center h-[80vh]">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : (
                <>
                   {view === 'PROJECTS_LIST' && (
                       <ProjectsList 
                           projects={projects}
                           onOpenProject={handleOpenProject}
                           onNewProject={() => setIsCreateModalOpen(true)}
                           onEdit={handleEditProjectClick}
                           onDelete={handleDeleteProject}
                           deletingProjectId={deletingProjectId}
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
                           onCancel={() => setView('PROJECT_DETAILS')}
                       />
                   )}

                   {(view === 'GENERATING_QUESTIONS' || view === 'INTERVIEW' || view === 'GENERATING_DOC') && (
                       <Interview 
                           questions={questions}
                           initialAnswers={answers}
                           onComplete={handleInterviewComplete}
                           onBack={() => setView('TEMPLATE_SELECT')}
                           isGenerating={isInitializing || isDrafting}
                           loadingTitle={loadingTitle}
                           loadingMessage={loadingMessage}
                           projectContext={activeProject ? { name: activeProject.name, description: activeProject.description } : undefined}
                       />
                   )}

                   {view === 'PREVIEW' && generatedDoc && selectedTemplate && (
                       <DocumentPreview 
                           doc={generatedDoc}
                           docType={selectedTemplate.name}
                           onBack={() => setView('PROJECT_DETAILS')}
                           onSave={handleSaveDocument}
                           onEditResponses={handleEditResponses}
                           version={editingArtifactId ? activeProject?.documents.find(d => d.id === editingArtifactId)?.version : undefined}
                           lastUpdated={editingArtifactId ? activeProject?.documents.find(d => d.id === editingArtifactId)?.lastUpdated : undefined}
                           isSaving={isSaving}
                           onDocUpdate={(newContent) => setGeneratedDoc(prev => prev ? { ...prev, content: newContent } : null)}
                       />
                   )}

                   <CreateProjectModal 
                       isOpen={isCreateModalOpen}
                       onClose={() => setIsCreateModalOpen(false)}
                       onCreate={handleCreateProject}
                   />

                   <EditProjectModal 
                       isOpen={isEditProjectModalOpen}
                       onClose={() => setIsEditProjectModalOpen(false)}
                       project={projectToEdit}
                       onUpdate={handleUpdateProject}
                   />

                   <UserProfileModal 
                       isOpen={isProfileModalOpen}
                       onClose={() => setIsProfileModalOpen(false)}
                       profile={userProfile}
                       onUpdate={handleUpdateProfile}
                       onDelete={handleDeleteAccount}
                   />
                </>
            )}
        </Layout>
    );
};

export default App;
