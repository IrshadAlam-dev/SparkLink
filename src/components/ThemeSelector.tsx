import { Check } from 'lucide-react';

interface Props {
    currentTheme: string;
    onSelect: (theme: string) => void;
}

const themes = [
    { id: 'light', name: 'Light', color: 'bg-white border-gray-200' },
    { id: 'dark', name: 'Dark', color: 'bg-gray-900 border-gray-800' },
    { id: 'ocean', name: 'Ocean', color: 'bg-gradient-to-br from-blue-400 to-cyan-300' },
    { id: 'sunset', name: 'Sunset', color: 'bg-gradient-to-br from-orange-400 to-pink-500' },
];

export default function ThemeSelector({ currentTheme, onSelect }: Props) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {themes.map((theme) => (
                <button
                    key={theme.id}
                    onClick={() => onSelect(theme.id)}
                    className={`relative group rounded-xl p-1 transition-all ${currentTheme === theme.id
                            ? 'ring-2 ring-indigo-500 ring-offset-2'
                            : 'hover:opacity-80'
                        }`}
                >
                    <div className={`h-24 w-full rounded-lg border shadow-sm ${theme.color} flex items-center justify-center`}>
                        {currentTheme === theme.id && (
                            <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                                <Check size={20} className="text-white drop-shadow-md" />
                            </div>
                        )}
                    </div>
                    <span className="block text-center mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {theme.name}
                    </span>
                </button>
            ))}
        </div>
    );
}
