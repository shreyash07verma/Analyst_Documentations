
import React, { useState } from 'react';
import { Question, Answer } from '../types';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface InterviewProps {
    questions: Question[];
    initialAnswers?: Answer[];
    onComplete: (answers: Answer[]) => void;
    onBack: () => void;
    isGenerating: boolean;
}

const Interview: React.FC<InterviewProps> = ({ questions, initialAnswers, onComplete, onBack, isGenerating }) => {
    // Initialize answers state from initialAnswers prop if available
    const [answers, setAnswers] = useState<Record<number, string>>(() => {
        if (!initialAnswers) return {};
        const initialMap: Record<number, string> = {};
        initialAnswers.forEach(a => {
            initialMap[a.questionId] = a.text;
        });
        return initialMap;
    });
    
    const [currentStep, setCurrentStep] = useState(0);

    const progress = Math.round(((Object.keys(answers).length) / questions.length) * 100);
    const currentQuestion = questions[currentStep];
    const currentAnswerText = answers[currentQuestion.id] || '';
    const isCurrentAnswered = currentAnswerText.trim().length > 0;
    
    const canProceed = !currentQuestion.required || isCurrentAnswered;

    const handleAnswerChange = (text: string) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: text
        }));
    };

    const handleNext = () => {
        if (!canProceed) return;

        if (currentStep < questions.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        } else {
            onBack();
        }
    };

    const handleSubmit = () => {
        const formattedAnswers: Answer[] = questions.map(q => ({
            questionId: q.id,
            questionText: q.text,
            text: answers[q.id] || "No answer provided."
        }));
        onComplete(formattedAnswers);
    };

    if (isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-500">
                <div className="bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700 text-center max-w-md w-full">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                        <Loader2 className="absolute inset-0 m-auto text-primary w-8 h-8 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Analysing & Drafting</h2>
                    <p className="text-slate-400">Consulting external sources, verifying data, and synthesizing your document...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-12 w-full">
            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex justify-between text-sm font-medium text-slate-400 mb-2">
                    <span>Question {currentStep + 1} of {questions.length}</span>
                    <span>{progress}% Completed</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div 
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep) / questions.length) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Question Card */}
            <div className="bg-[#1e293b] rounded-2xl shadow-xl border border-slate-700 p-8 min-h-[400px] flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-start mb-6 gap-4">
                    <h2 className="text-2xl font-semibold text-white leading-relaxed">
                        {currentQuestion.text}
                        {currentQuestion.required && (
                            <span className="ml-2 text-red-500 text-sm align-top font-bold" title="Required">*</span>
                        )}
                    </h2>
                    {currentQuestion.required && (
                        <div className="shrink-0 px-3 py-1 bg-red-900/30 text-red-400 text-xs font-bold uppercase tracking-wider rounded-full border border-red-900/50">
                            Required
                        </div>
                    )}
                    {!currentQuestion.required && (
                        <div className="shrink-0 px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider rounded-full border border-slate-700">
                            Optional
                        </div>
                    )}
                </div>

                <textarea
                    className={`
                        flex-grow w-full p-4 bg-[#0f172a] border rounded-xl focus:ring-2 focus:ring-primary/40 transition-all resize-none text-slate-200 placeholder:text-slate-600 text-lg
                        ${currentQuestion.required && !isCurrentAnswered ? 'border-slate-700 focus:border-primary' : 'border-slate-700 focus:border-primary'}
                    `}
                    placeholder={currentQuestion.placeholder || "Type your detailed answer here..."}
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    autoFocus
                />

                {currentQuestion.required && !isCurrentAnswered && (
                    <div className="mt-2 flex items-center gap-2 text-amber-500 text-sm animate-pulse">
                        <AlertCircle className="w-4 h-4" />
                        <span>This question is mandatory. Please provide an answer to proceed.</span>
                    </div>
                )}

                <div className="flex items-center justify-between mt-8">
                    <button 
                        onClick={handlePrev}
                        className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>

                    <div className="flex gap-2">
                        {!currentQuestion.required && currentStep !== questions.length - 1 && (
                            <button 
                                onClick={() => setCurrentStep(prev => Math.min(prev + 1, questions.length - 1))}
                                className="px-4 py-3 text-slate-500 hover:text-primary transition-colors text-sm font-medium"
                            >
                                Skip
                            </button>
                        )}
                        
                        <button 
                            onClick={handleNext}
                            disabled={!canProceed} 
                            className={`
                                flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all transform active:scale-95
                                ${!canProceed 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                    : 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5'}
                            `}
                        >
                            {currentStep === questions.length - 1 ? (
                                <>Finish <CheckCircle2 className="w-5 h-5" /></>
                            ) : (
                                <>Next <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 flex justify-center gap-2">
                {questions.map((q, idx) => (
                    <div 
                        key={idx}
                        title={q.required ? "Required" : "Optional"}
                        className={`
                            w-2 h-2 rounded-full transition-all duration-300
                            ${idx === currentStep ? 'w-8 bg-primary' : idx < currentStep ? 'bg-primary/40' : 'bg-slate-700'}
                            ${q.required && idx > currentStep ? 'bg-red-900/50' : ''}
                        `}
                    />
                ))}
            </div>
        </div>
    );
};

export default Interview;
