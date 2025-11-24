import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, User, Briefcase, Mail, Trash2, Save, Loader2 } from 'lucide-react';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile | null;
    onUpdate: (data: Partial<UserProfile>) => Promise<void>;
    onDelete: () => Promise<void>;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, profile, onUpdate, onDelete }) => {
    const [name, setName] = useState(profile?.displayName || '');
    const [position, setPosition] = useState(profile?.position || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Update local state when profile changes
    React.useEffect(() => {
        if (profile) {
            setName(profile.displayName);
            setPosition(profile.position);
        }
    }, [profile]);

    if (!isOpen || !profile) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onUpdate({ displayName: name, position });
            onClose();
        } catch (error) {
            console.error("Failed to update profile", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            setIsDeleting(true);
            try {
                await onDelete();
                // Auth state change will handle navigation in App.tsx
            } catch (error) {
                console.error("Failed to delete account", error);
                alert("Please log out and log in again to delete your account.");
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-6 flex justify-between items-center border-b border-slate-800 bg-slate-900/50">
                    <h3 className="text-xl font-bold text-white">Edit Profile</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8">
                    <div className="flex justify-center mb-8">
                        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center text-primary border-2 border-primary/30">
                            <span className="text-3xl font-bold">{name.charAt(0).toUpperCase()}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-5">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Position / Role</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input 
                                    type="text" 
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input 
                                    type="email" 
                                    value={profile.email}
                                    disabled
                                    className="w-full bg-[#0f172a]/50 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-slate-400 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="pt-6 flex gap-3">
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="flex-1 bg-primary hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-800">
                        <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/10 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;