
import React, { useState } from 'react';
import { DocType, Template } from '../types';
import { FileText, ListChecks, Target, Users, Table, Activity, ArrowLeft } from 'lucide-react';

interface DashboardProps {
    onSelectTemplate: (template: Template) => void;
    onCancel: () => void;
}

const templates: Template[] = [
    {
        id: 'brd',
        name: 'Business Requirements Document (BRD)',
        description: 'A high-level document outlining business goals, objectives, and stakeholder needs.',
        type: DocType.BRD,
        iconName: 'FileText'
    },
    {
        id: 'srs',
        name: 'Functional Requirements Document (FRD/SRS)',
        description: 'A detailed document specifying the functional and non-functional requirements of a system.',
        type: DocType.SRS,
        iconName: 'ListChecks'
    },
    {
        id: 'user-stories',
        name: 'User Story & Acceptance Criteria',
        description: 'An agile artifact describing a software feature from an end-user\'s perspective.',
        type: DocType.USER_STORIES,
        iconName: 'Users'
    },
    {
        id: 'rfp',
        name: 'Request for Proposal (RFP)',
        description: 'A document used to solicit proposals from potential vendors for a product or service.',
        type: DocType.RFP,
        iconName: 'Target'
    },
    {
        id: 'raci',
        name: 'RACI Matrix',
        description: 'Clarify roles and responsibilities (Responsible, Accountable, Consulted, Informed).',
        type: DocType.RACI,
        iconName: 'Table'
    },
    {
        id: 'impact-analysis',
        name: 'Impact Analysis',
        description: 'Assess the potential consequences of a change to scope, schedule, resource, or technical architecture.',
        type: DocType.IMPACT_ANALYSIS,
        iconName: 'Activity'
    }
];

const Dashboard: React.FC<DashboardProps> = ({ onSelectTemplate, onCancel }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const getIcon = (name: string) => {
        switch (name) {
            case 'FileText': return <FileText className="w-6 h-6" />;
            case 'Target': return <Target className="w-6 h-6" />;
            case 'Users': return <Users className="w-6 h-6" />;
            case 'ListChecks': return <ListChecks className="w-6 h-6" />;
            case 'Table': return <Table className="w-6 h-6" />;
            case 'Activity': return <Activity className="w-6 h-6" />;
            default: return <FileText className="w-6 h-6" />;
        }
    };

    const handleContinue = () => {
        if (!selectedId) return;
        
        const template = templates.find(t => t.id === selectedId);
        if (template) {
             onSelectTemplate(template);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-8 py-12 w-full flex flex-col flex-grow animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onCancel} 
                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Create New Business Artifact</h1>
                    <p className="text-slate-400">
                        Choose the type of document you need to generate.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {templates.map((template) => {
                    const isSelected = selectedId === template.id;
                    return (
                        <div 
                            key={template.id}
                            onClick={() => setSelectedId(template.id)}
                            className={`
                                relative flex flex-col p-6 rounded-xl cursor-pointer transition-all duration-200 h-full
                                ${isSelected 
                                    ? 'bg-slate-800 border-2 border-primary shadow-[0_0_0_4px_rgba(37,99,235,0.1)]' 
                                    : 'bg-[#1e293b] border border-slate-700 hover:border-slate-600 hover:bg-slate-800'}
                            `}
                        >
                            <div className="mb-4 text-primary">
                                {getIcon(template.iconName)}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-3 leading-tight">{template.name}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed flex-grow">
                                {template.description}
                            </p>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col items-center mt-auto border-t border-slate-800 pt-8">
                <button 
                    onClick={handleContinue}
                    disabled={!selectedId}
                    className="bg-primary hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-12 rounded-lg transition-all duration-200 text-lg shadow-lg hover:shadow-primary/20 w-full md:w-auto min-w-[200px]"
                >
                    Continue
                </button>
                
                <button className="mt-6 text-slate-500 hover:text-slate-400 text-sm underline decoration-slate-700 underline-offset-4 transition-colors">
                    Need help? Learn more about artifact types.
                </button>
            </div>
        </div>
    );
};

export default Dashboard;