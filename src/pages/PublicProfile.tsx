import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import NotFound from './NotFound';
// import { ExternalLink, Share2 } from 'lucide-react';

export default function PublicProfile() {
    const { username } = useParams<{ username: string }>();

    useEffect(() => {
        console.log('PublicProfile mounted for username:', username);
    }, [username]);

    // Fetch Profile by Username
    const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
        queryKey: ['publicProfile', username],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!username,
        retry: false,
    });

    // Fetch Links
    const { data: links, isLoading: linksLoading } = useQuery({
        queryKey: ['publicLinks', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('links')
                .select('*')
                .eq('user_id', profile.id)
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (error) throw error;
            return data;
        },
        enabled: !!profile?.id,
    });

    if (profileLoading) return <LoadingSpinner />;

    if (profileError) {
        console.error('Error fetching profile:', profileError);
    }

    if (!profile) {
        console.warn('No profile found for username:', username);
        return <NotFound />;
    }

    console.log('Profile loaded:', profile);

    // Theme Styles (Reused logic, could be extracted to separate hook/utility)
    const themeStyles: Record<string, string> = {
        light: 'bg-gray-50 text-gray-900',
        dark: 'bg-gray-900 text-white',
        ocean: 'bg-gradient-to-br from-blue-400 to-cyan-300 text-white',
        sunset: 'bg-gradient-to-br from-orange-400 to-pink-500 text-white',
    };

    const cardStyles: Record<string, string> = {
        light: 'bg-white border-gray-200 shadow-xl',
        dark: 'bg-gray-800 border-gray-700 shadow-xl',
        ocean: 'bg-white/20 backdrop-blur-md border-white/30 shadow-xl',
        sunset: 'bg-white/20 backdrop-blur-md border-white/30 shadow-xl',
    };

    const buttonStyles: Record<string, string> = {
        light: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm',
        dark: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 shadow-sm',
        ocean: 'bg-white/20 hover:bg-white/30 text-white border border-white/40 shadow-sm backdrop-blur-sm',
        sunset: 'bg-white/20 hover:bg-white/30 text-white border border-white/40 shadow-sm backdrop-blur-sm',
    };

    const currentTheme = profile.theme || 'light';
    const pageClass = themeStyles[currentTheme] || themeStyles['light'];
    const cardClass = cardStyles[currentTheme] || cardStyles['light'];
    const btnClass = buttonStyles[currentTheme] || buttonStyles['light'];

    return (
        <div className={`min-h-screen py-12 px-4 flex flex-col items-center ${pageClass} transition-colors duration-500`}>
            <div className={`w-full max-w-md rounded-3xl p-8 ${cardClass} border animate-in slide-in-from-bottom-8 fade-in duration-700`}>

                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-32 h-32 rounded-full overflow-hidden mb-4 ring-4 ring-white/30 shadow-lg bg-gray-200">
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.full_name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl bg-gray-100">
                                {profile.full_name?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2">{profile.full_name}</h1>
                    <p className="text-center opacity-80 leading-relaxed max-w-sm">
                        {profile.bio}
                    </p>
                </div>

                {/* Links */}
                <div className="space-y-4">
                    {linksLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-14 rounded-xl bg-current opacity-10 animate-pulse" />
                            ))}
                        </div>
                    ) : links && links.length > 0 ? (
                        links.map((link: any) => (
                            <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`block w-full text-center py-4 px-6 rounded-xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] ${btnClass} flex items-center justify-center gap-3 group`}
                            >
                                <span>{link.title}</span>
                                {/* <ExternalLink size={16} className="opacity-0 group-hover:opacity-50 transition-opacity" /> */}
                            </a>
                        ))
                    ) : (
                        <div className="text-center py-8 opacity-60 italic">
                            No links available yet.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <div className="w-2 h-2 rounded-full bg-current" />
                        SparkLink
                    </a>
                </div>
            </div>
        </div>
    );
}
