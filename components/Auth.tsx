
import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    sendEmailVerification, 
    signOut 
} from 'firebase/auth';
import { syncUserToFirestore } from '../services/userService';
import { Loader2, AlertCircle, ArrowRight, Mail } from 'lucide-react';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Verification State
    const [isVerificationSent, setIsVerificationSent] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const cleanEmail = email.trim();

        try {
            if (isLogin) {
                // --- LOGIN FLOW ---
                const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
                const user = userCredential.user;

                if (user && !user.emailVerified) {
                    try {
                        await sendEmailVerification(user);
                    } catch (emailErr: any) {
                        if (emailErr.code !== 'auth/too-many-requests') {
                             console.error("Verification email failed", emailErr);
                        }
                    }
                    await signOut(auth);
                    
                    setVerificationEmail(cleanEmail);
                    setIsVerificationSent(true);
                    setLoading(false);
                    return;
                }
                
                // User is verified, sync logic happens in App.tsx via onAuthStateChanged
                
            } else {
                // --- SIGN UP FLOW ---
                if (password !== repeatPassword) {
                    throw new Error("Passwords do not match");
                }
                if (name.trim() === '') {
                    throw new Error("Name is required");
                }

                const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
                const user = userCredential.user;

                if (user) {
                    // Save display name to Auth Profile
                    await updateProfile(user, {
                        displayName: name
                    });

                    // Create Firestore Profile immediately
                    await syncUserToFirestore(user, name);

                    // Send Verification Email
                    await sendEmailVerification(user);

                    // Sign out immediately
                    await signOut(auth);

                    setVerificationEmail(cleanEmail);
                    setIsVerificationSent(true);
                }
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            let message = "An error occurred. Please try again.";
            
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                message = "Password or email incorrect.";
            } else if (err.code === 'auth/email-already-in-use') {
                message = "User already exists, Sign in?";
            } else if (err.code === 'auth/too-many-requests') {
                message = "Too many attempts. Please reset your password or try again later.";
            } else if (err.message) {
                message = err.message;
            }
            setError(message);
        } finally {
            if (!isVerificationSent) {
                setLoading(false);
            }
        }
    };

    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
        setter(value);
        if (error) setError(null);
    };

    const handleResetToLogin = () => {
        setIsVerificationSent(false);
        setIsLogin(true);
        setError(null);
        setPassword('');
    };

    // --- VERIFICATION VIEW ---
    if (isVerificationSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-sans">
                <div className="bg-[#1e293b] p-8 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                        <Mail className="w-8 h-8" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-4">Verify your email</h2>
                    
                    <p className="text-slate-300 mb-8 leading-relaxed">
                        We have sent you a verification email to <br/>
                        <span className="font-semibold text-white">{verificationEmail}</span>.
                        <br/><br/>
                        Please verify your email address and then log in to continue.
                    </p>

                    <button
                        onClick={handleResetToLogin}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-primary/20"
                    >
                        Log In
                    </button>
                </div>
            </div>
        );
    }

    // --- MAIN AUTH FORM ---
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-sans">
            <div className="bg-[#1e293b] p-8 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-900/20 mb-4">
                        AP
                    </div>
                    <h1 className="text-2xl font-bold text-white">AnalystPro</h1>
                    <p className="text-slate-400 text-sm">Become a 10x Business Analyst</p>
                </div>

                <h2 className="text-xl font-semibold text-white mb-6 text-center">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>

                {error && (
                    <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-red-200 text-sm">{error}</p>
                            {error === "User already exists, Sign in?" && (
                                <button 
                                    onClick={() => { setIsLogin(true); setError(null); }}
                                    className="text-red-400 hover:text-red-300 text-xs font-bold underline mt-1"
                                >
                                    Switch to Login
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                            <input
                                type="text"
                                required={!isLogin}
                                value={name}
                                onChange={(e) => handleInputChange(setName, e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => handleInputChange(setEmail, e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="Enter your Email address"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => handleInputChange(setPassword, e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                required={!isLogin}
                                value={repeatPassword}
                                onChange={(e) => handleInputChange(setRepeatPassword, e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(null); }}
                            className="ml-2 text-primary hover:text-blue-400 font-medium transition-colors"
                        >
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
