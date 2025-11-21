import React, { useState } from 'react';
import { DocType, Template } from '../types';
import { FileText, ListChecks, Target, Users, Table, Sparkles, Search, ArrowRight } from 'lucide-react';

interface DashboardProps {
    onSelectTemplate: (template: Template, customTopic?: string) => void;
}

const templates: Template[] = [
    {
        id: 'brd',
        name: 'Business Requirement Doc',
        description: 'Define business needs, project scope, and key objectives.',
        type: DocType.BRD,
        iconName: 'FileText'
    },
    {
        id: 'rfp',
        name: 'Request for Proposal',
        description: 'Solicit proposals from prospective vendors for a project.',
        type: DocType.RFP,
        iconName: 'Target'
    },
    {
        id: 'user-stories',
        name: 'User Stories',
        description: 'Create agile user stories with acceptance criteria.',
        type: DocType.USER_STORIES,
        iconName: 'Users'
    },
    {
        id: 'srs',
        name: 'Software Requirements Spec',
        description: 'Detailed description of a software system to be developed.',
        type: DocType.SRS,
        iconName: 'ListChecks'
    },
    {
        id: 'raci',
        name: 'RACI Matrix',
        description: 'Clarify roles and responsibilities for project tasks.',
        type: DocType.RACI,
        iconName: 'Table'
    },
    {
        id: 'custom',
        name: 'Custom Document',
        description: 'Create any other type of business document you need.',
        type: DocType.CUSTOM,
        iconName: 'Sparkles'
    }
];

const Dashboard: React.FC<DashboardProps> = ({ onSelectTemplate }) => {
    const [customTopic, setCustomTopic] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const getIcon = (name: string) => {
        switch (name) {
            case 'FileText': return <FileText className="w-6 h-6" />;
            case 'Target': return <Target className="w-6 h-6" />;
            case 'Users': return <Users className="w-6 h-6" />;
            case 'ListChecks': return <ListChecks className="w-6 h-6" />;
            case 'Table': return <Table className="w-6 h-6" />;
            case 'Sparkles': return <Sparkles className="w-6 h-6" />;
            default: return <FileText className="w-6 h-6" />;
        }
    };

    const handleCardClick = (template: Template) => {
        if (template.type === DocType.CUSTOM) {
            setSelectedId('custom');
        } else {
            onSelectTemplate(template);
        }
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customTopic.trim()) {
            const customTemplate = templates.find(t => t.type === DocType.CUSTOM);
            if (customTemplate) {
                onSelectTemplate(customTemplate, customTopic);
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">What do you want to create today?</h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Select a standard template or define your own. AnalystAlly will interview you to gather the details and generate a professional document.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div 
                        key={template.id}
                        onClick={() => handleCardClick(template)}
                        className={`
                            group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer border-2
                            ${selectedId === template.id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'}
                        `}
                    >
                        <div className={`
                            w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors
                            ${selectedId === template.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'}
                        `}>
                            {getIcon(template.iconName)}
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">{template.name}</h3>
                        <p className="text-slate-500">{template.description}</p>
                        
                        {template.type === DocType.CUSTOM && selectedId === 'custom' && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200" onClick={e => e.stopPropagation()}>
                                <form onSubmit={handleCustomSubmit} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customTopic}
                                        onChange={(e) => setCustomTopic(e.target.value)}
                                        placeholder="e.g., Project Charter"
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                                        autoFocus
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!customTopic.trim()}
                                        className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;