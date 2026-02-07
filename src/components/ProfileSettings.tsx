import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './ui/ToastProvider';
import LoadingSpinner from './ui/LoadingSpinner';
import { Loader2, Save } from 'lucide-react';
import ThemeSelector from './ThemeSelector';

const profileSchema = z.object({
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
    full_name: z.string().min(1, 'Name is required'),
    bio: z.string().max(160, 'Bio must be less than 160 characters').optional(),
    theme: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileSettings() {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return data;
        },
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isDirty },
        reset,
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            username: '',
            full_name: '',
            bio: '',
            theme: 'light',
        },
    });

    // Load profile data into form
    useEffect(() => {
        if (profile) {
            reset({
                username: profile.username || '',
                full_name: profile.full_name || '',
                bio: profile.bio || '',
                theme: profile.theme || 'light',
            });
        }
    }, [profile, reset]);

    const updateProfileMutation = useMutation({
        mutationFn: async (data: ProfileFormData) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Check username updating (unique check handled by DB constraint)
            const updates: any = {
                username: data.username,
                full_name: data.full_name,
                bio: data.bio,
                theme: data.theme,
                updated_at: new Date(),
            };

            if (avatarFile) {
                setUploading(true);
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                updates.avatar_url = publicUrl;
                setUploading(false);
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) {
                if (error.code === '23505') { // Unique violation
                    throw new Error('Username already taken');
                }
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            addToast('Profile updated successfully', 'success');
            setAvatarFile(null); // Reset file input
        },
        onError: (error: any) => {
            setUploading(false);
            addToast(error.message, 'error');
        },
    });

    const onSubmit = (data: ProfileFormData) => {
        updateProfileMutation.mutate(data);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAvatarFile(e.target.files[0]);
        }
    };

    const currentTheme = watch('theme');

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-12">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                        <div className="relative w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden ring-4 ring-gray-50 dark:ring-gray-900 border border-gray-200 dark:border-gray-700">
                            {avatarFile ? (
                                <img src={URL.createObjectURL(avatarFile)} alt="Preview" className="w-full h-full object-cover" />
                            ) : profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <UserIcon size={32} />
                                </div>
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                                    <Loader2 className="animate-spin" />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Profile Image
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100
                  cursor-pointer
                "
                            />
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Display Name
                            </label>
                            <input
                                {...register('full_name')}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                            />
                            {errors.full_name && (
                                <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Username
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-2.5 text-gray-400">@</span>
                                <input
                                    {...register('username')}
                                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                                />
                            </div>
                            {errors.username && (
                                <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Bio
                        </label>
                        <textarea
                            {...register('bio')}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition resize-none"
                            placeholder="Tell your story..."
                        />
                        {errors.bio && (
                            <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>
                        )}
                    </div>

                    {/* Theme Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Page Theme
                        </label>
                        <ThemeSelector
                            currentTheme={currentTheme || 'light'}
                            onSelect={(theme) => setValue('theme', theme, { shouldDirty: true })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={updateProfileMutation.isPending || (!isDirty && !avatarFile)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {updateProfileMutation.isPending ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <Save size={20} />
                        )}
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
}

function UserIcon({ size }: { size: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}
