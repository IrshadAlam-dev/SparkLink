import { ExternalLink } from 'lucide-react';

interface Link {
    id: string;
    title: string;
    url: string;
    display_order: number;
}

interface Profile {
    username?: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    theme?: string;
}

interface Props {
    profile: Profile;
    links: Link[];
    loading?: boolean;
}

export default function PreviewMockup({ profile, links, loading }: Props) {
    // Theme styles map
    const themeStyles: Record<string, string> = {
        light: 'bg-white text-gray-900',
        dark: 'bg-gray-900 text-white',
        ocean: 'bg-gradient-to-br from-blue-400 to-cyan-300 text-white',
        sunset: 'bg-gradient-to-br from-orange-400 to-pink-500 text-white',
    };

    const buttonStyles: Record<string, string> = {
        light: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200',
        dark: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700',
        ocean: 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30',
        sunset: 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30',
    };

    const currentTheme = profile.theme || 'light';
    const containerClass = themeStyles[currentTheme] || themeStyles['light'];
    const btnClass = buttonStyles[currentTheme] || buttonStyles['light'];

    return (
        <div className="mx-auto w-full max-w-[320px] aspect-[9/19] rounded-[2.5rem] border-[8px] border-gray-900 bg-gray-900 overflow-hidden shadow-2xl relative">
            <div className={`h-full w-full overflow-y-auto ${containerClass} transition-colors duration-300`}>
                {/* Mock Status Bar */}
                <div className="h-6 w-full flex justify-between items-center px-4 text-[10px] font-medium opacity-70 pt-1 pointer-events-none sticky top-0 z-10">
                    <span>9:41</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-current opacity-20"></div>
                        <div className="w-3 h-3 rounded-full bg-current opacity-20"></div>
                        <div className="w-3 h-3 rounded-full bg-current"></div>
                    </div>
                </div>

                <div className="flex flex-col items-center px-6 pt-8 pb-12 min-h-full">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mb-4 ring-2 ring-white/50 shadow-md">
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.full_name || 'Avatar'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-2xl font-bold">
                                {profile.full_name?.[0]?.toUpperCase() || '?'}
                            </div>
                        )}
                    </div>

                    {/* Name & Bio */}
                    <h2 className="text-xl font-bold text-center mb-1">
                        {profile.full_name || '@username'}
                    </h2>
                    <p className="text-sm opacity-80 text-center mb-6 line-clamp-3">
                        {profile.bio || 'Your bio goes here...'}
                    </p>

                    {/* Links */}
                    <div className="w-full space-y-3">
                        {loading ? (
                            [1, 2, 3].map((i) => (
                                <div key={i} className="h-12 w-full bg-current opacity-10 rounded-lg animate-pulse" />
                            ))
                        ) : links.length > 0 ? (
                            links.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block w-full text-center py-3.5 px-4 rounded-xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] ${btnClass} flex items-center justify-center gap-2`}
                                >
                                    {link.title}
                                    <ExternalLink size={14} className="opacity-50" />
                                </a>
                            ))
                        ) : (
                            <div className="text-center py-8 opacity-50 text-sm border-2 border-dashed border-current rounded-xl">
                                Add links to see them here
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-8 pb-4 opacity-40 text-xs font-medium">
                        SparkLink
                    </div>
                </div>
            </div>
        </div>
    );
}
