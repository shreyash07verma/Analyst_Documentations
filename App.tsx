import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Interview from './components/Interview';
import DocumentPreview from './components/DocumentPreview';
import { generateQuestionsForDoc, generateDocumentContent } from './services/gemini';
import { AppStep, Template, Question, Answer, GeneratedDocument } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>('dashboard');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [customTopic, setCustomTopic] = useState<string | undefined>(undefined);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);

    const resetApp = () => {
        setStep('dashboard');
        setSelectedTemplate(null);
        setCustomTopic(undefined);
        setQuestions([]);
        setAnswers([]);
        setGeneratedDoc(null);
    };

    const handleSelectTemplate = async (template: Template, topic?: string) => {
        setSelectedTemplate(template);
        setCustomTopic(topic);
        setStep('generating-questions');

        const docName = topic || template.name;
        const generatedQuestions = await generateQuestionsForDoc(template.type, topic);
        
        setQuestions(generatedQuestions);
        setStep('interview');
    };

    const handleInterviewComplete = async (collectedAnswers: Answer[]) => {
        setAnswers(collectedAnswers);
        setStep('generating-doc');
        
        if (!selectedTemplate) return;

        const docName = customTopic || selectedTemplate.name;

        try {
            // Initial placeholder while streaming starts
            setGeneratedDoc({
                title: docName,
                content: "" 
            });

            await generateDocumentContent(
                selectedTemplate.type,
                collectedAnswers,
                customTopic,
                (streamedText) => {
                    setGeneratedDoc({
                        title: docName,
                        content: streamedText
                    });
                }
            );
            setStep('preview');
        } catch (error) {
            console.error("Failed to generate doc", error);
            setStep('interview'); // Go back on error
            alert("Something went wrong generating the document. Please try again.");
        }
    };

    return (
        <Layout onReset={resetApp}>
            {step === 'dashboard' && (
                <Dashboard onSelectTemplate={handleSelectTemplate} />
            )}

            {step === 'generating-questions' && (
                <div className="flex flex-col items-center justify-center h-full flex-grow">
                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-xl font-medium text-slate-600">Formulating questions for your document...</p>
                    </div>
                </div>
            )}

            {(step === 'interview' || step === 'generating-doc') && (
                <Interview 
                    questions={questions}
                    onComplete={handleInterviewComplete}
                    onBack={resetApp}
                    isGenerating={step === 'generating-doc'}
                />
            )}

            {step === 'preview' && generatedDoc && selectedTemplate && (
                <DocumentPreview 
                    doc={generatedDoc}
                    docType={selectedTemplate.name}
                    onReset={resetApp}
                />
            )}
        </Layout>
    );
};

export default App;