import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ProjectsList from './components/ProjectsList';
import CreateProjectModal from './components/CreateProjectModal';
import ProjectDetails from './components/ProjectDetails';
import Dashboard from './components/Dashboard';
import Interview from './components/Interview';
import DocumentPreview from './components/DocumentPreview';
import Auth from './components/Auth';
import UserProfileModal from './components/UserProfileModal';
import { generateQuestionsForDoc, generateDocumentContent } from './services/gemini';
import { initDB, getAllProjects, saveProject } from './services/db';
import { auth } from './services/firebase';
import { syncUserToFirestore, updateUserProfile, deleteUserAccount } from './services/userService';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { AppView, Template, Question, Answer, GeneratedDocument, Project, DocType, DocumentArtifact, ProjectFile, UserProfile } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    
    // UI State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // App State
    const [view, setView] = useState<AppView>('PROJECTS_LIST');
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAppLoading, setIsAppLoading] = useState(true);

    // Document Generation State
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [lastUsedAnswers, setLastUsedAnswers] = useState<Answer[]>([]); 
    const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
    
    // Edit Mode State
    const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null);

    // --- Initialization ---
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser && !currentUser.emailVerified) {
                // Force sign out if email not verified
                signOut(auth).catch((err) => console.error("Force signout error", err));
                setUser(null);
                setUserProfile(null);
            } else if (currentUser) {
                setUser(currentUser);
                // Sync/Fetch Profile from Firestore
                try {
                    const profile = await syncUserToFirestore(currentUser);
                    setUserProfile(profile);
                } catch (err) {
                    console.error("Profile sync error:", err);
                }
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const initializeApp = async () => {
            if (user) {
                try {
                    await initDB();
                    const loadedProjects = await getAllProjects();
                    setProjects(loadedProjects);
                } catch (error) {
                    console.error("Failed to initialize database:", error);
                } finally {
                    setIsAppLoading(false);
                }
            }
        };
        
        if (!authLoading && user) {
            initializeApp();
        }
    }, [user, authLoading]);

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
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

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
            alert("Failed to save project.");
        }
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
        const generatedQuestions = await generateQuestionsForDoc(template.type);
        setQuestions(generatedQuestions);
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
        if (!activeProject || !generatedDoc || !selectedTemplate) return;

        let updatedProject = { ...activeProject };

        if (editingArtifactId) {
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
            await saveProject(updatedProject);
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
            setActiveProject(updatedProject);
            resetDocGenState();
            setView('PROJECT_DETAILS');
        } catch (error) {
            console.error("Failed to save document:", error);
            alert("Failed to save document.");
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

    // --- Render ---

    if (authLoading) {
        return (
            <div className="flex h-screen bg-[#0f172a] items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Auth />;
    }

    if (isAppLoading) {
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
        <Layout 
            currentView={view} 
            onNavigate={(v) => setView(v)} 
            userProfile={userProfile} 
            onSignOut={handleSignOut}
            onOpenProfile={() => setIsProfileModalOpen(true)}
        >
            <CreateProjectModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateProject}
            />

            <UserProfileModal 
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                profile={userProfile}
                onUpdate={handleUpdateProfile}
                onDelete={handleDeleteAccount}
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
                        <p className="text-xl font-medium text-slate-600">Analysing requirements...</p>
                    </div>
                </div>
            )}

            {(view === 'INTERVIEW' || view === 'GENERATING_DOC') && (
                <Interview 
                    questions={questions}
                    initialAnswers={answers}
                    onComplete={handleInterviewComplete}
                    onBack={() => editingArtifactId ? setView('PREVIEW') : setView('TEMPLATE_SELECT')}
                    isGenerating={view === 'GENERATING_DOC'}
                    projectContext={activeProject ? { name: activeProject.name, description: activeProject.description } : undefined}
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
                    lastUpdated={editingArtifactId ? undefined : undefined} 
                />
            )}
        </Layout>
    );
};

export default App;