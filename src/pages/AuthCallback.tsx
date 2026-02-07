import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // The auth callback handling is done automatically by the Supabase client
        // when it detects the tokens in the URL. We just need to wait for the session.
        // However, specifically for email links (magic link, reset password),
        // we might want to handle some events or redirect logic.

        const handleAuthCallback = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (session) {
                    // Successful authentication
                    console.log('AuthCallback: Session found, redirecting to dashboard');
                    navigate('/dashboard', { replace: true });
                } else {
                    // No session found yet, listener in App.tsx might catch it, 
                    // or it might take a moment if it's a hash fragment
                    console.log('AuthCallback: No session yet');

                    // Setup a listener just in case
                    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                        if (event === 'SIGNED_IN' && session) {
                            console.log('AuthCallback: Signed in via listener, redirecting');
                            navigate('/dashboard', { replace: true });
                        }
                    });

                    return () => subscription.unsubscribe();
                }
            } catch (err: any) {
                console.error('AuthCallback error:', err);
                setError(err.message || 'Authentication failed');
                // Optionally redirect back to auth after a delay
                setTimeout(() => navigate('/auth'), 3000);
            }
        };

        handleAuthCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-red-500 mb-2">Authentication Error</h2>
                    <p className="text-gray-300">{error}</p>
                    <p className="text-sm text-gray-500 mt-4">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
                <Loader2 className="animate-spin mx-auto mb-4 text-purple-500" size={32} />
                <p className="text-gray-300">Completing sign in...</p>
            </div>
        </div>
    );
}
