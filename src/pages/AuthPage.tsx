import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { Loader2, Mail } from 'lucide-react';
import PasswordInput from '../components/ui/PasswordInput';

const authSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters').or(z.literal('')),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [isMagicLink, setIsMagicLink] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Check if user is already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('AuthPage: User already logged in, redirecting to dashboard');
                navigate('/dashboard', { replace: true });
            }
        };
        checkSession();
    }, [navigate]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AuthFormData>({
        resolver: zodResolver(authSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: AuthFormData) => {
        setIsLoading(true);
        console.log(`AuthPage: Attempting ${isMagicLink ? 'magic link' : isLogin ? 'login' : 'signup'} for`, data.email);

        try {
            if (isMagicLink) {
                const { error } = await supabase.auth.signInWithOtp({
                    email: data.email,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });

                if (error) throw error;
                addToast('Magic link sent! Check your email.', 'success');
            } else if (isLogin) {
                if (!data.password) {
                    addToast('Password is required', 'error');
                    setIsLoading(false);
                    return;
                }

                const { data: authData, error } = await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password,
                });

                if (error) {
                    console.error('AuthPage: Login error:', error);
                    throw error;
                }

                console.log('AuthPage: Login successful', authData);
                addToast('Welcome back!', 'success');
                navigate('/dashboard', { replace: true });
            } else {
                if (!data.password) {
                    addToast('Password is required', 'error');
                    setIsLoading(false);
                    return;
                }

                const { data: authData, error } = await supabase.auth.signUp({
                    email: data.email,
                    password: data.password,
                });

                if (error) {
                    console.error('AuthPage: Signup error:', error);
                    throw error;
                }

                console.log('AuthPage: Signup successful', authData);

                if (authData.session) {
                    addToast('Account created successfully!', 'success');
                    navigate('/dashboard', { replace: true });
                } else {
                    addToast('Account created! Please check your email if confirmation is required.', 'success');
                }
            }
        } catch (error: any) {
            console.error('AuthPage: Auth operation failed', error);
            addToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass-card p-8 rounded-2xl shadow-xl backdrop-blur-lg border border-white/20">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    {isMagicLink ? 'Sign in with Magic Link' : isLogin ? 'Welcome Back' : 'Create Account'}
                </h1>
                <p className="text-gray-300">
                    {isMagicLink
                        ? 'We\'ll send a magic link to your email'
                        : isLogin
                            ? 'Enter your credentials to access your account'
                            : 'Sign up to start building your page'}
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit, (errors) => console.error('Form validation errors:', errors))} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                        Email Address
                    </label>
                    <input
                        {...register('email')}
                        type="email"
                        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                        placeholder="you@example.com"
                    />
                    {errors.email && (
                        <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                    )}
                </div>

                {!isMagicLink && (
                    <div className="space-y-1">
                        <PasswordInput
                            label="Password"
                            placeholder="••••••••"
                            error={errors.password?.message}
                            {...register('password')}
                        />
                        {isLogin && (
                            <div className="flex justify-end">
                                <Link
                                    to="/auth/reset-password"
                                    className="text-xs text-indigo-300 hover:text-white transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-lg transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : isMagicLink ? (
                        <>
                            <Mail size={20} className="mr-2" />
                            Send Magic Link
                        </>
                    ) : isLogin ? (
                        'Sign In'
                    ) : (
                        'Sign Up'
                    )}
                </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 text-center">
                <button
                    onClick={() => {
                        setIsMagicLink(!isMagicLink);
                        // Reset login state if switching to magic link
                        if (!isMagicLink) setIsLogin(true);
                    }}
                    className="text-sm text-indigo-300 hover:text-white transition-colors"
                >
                    {isMagicLink
                        ? 'Sign in with password instead'
                        : 'Sign in with Magic Link instead'}
                </button>

                {!isMagicLink && (
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-gray-300 hover:text-white transition underline underline-offset-4"
                    >
                        {isLogin
                            ? "Don't have an account? Sign up"
                            : 'Already have an account? Sign in'}
                    </button>
                )}
            </div>
        </div>
    );
}
