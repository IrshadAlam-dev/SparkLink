import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/ToastProvider';
import PreviewMockup from '../../components/PreviewMockup';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Plus, GripVertical, Trash2, ExternalLink } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Item Component ---
function SortableLink({ link, onDelete, onUpdate }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: link.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex gap-4 items-center group transition-colors ${isDragging ? 'opacity-50' : ''
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
                <GripVertical size={20} />
            </div>
            <div className="flex-1 space-y-2">
                <input
                    type="text"
                    defaultValue={link.title}
                    onBlur={(e) => onUpdate(link.id, { title: e.target.value })}
                    className="w-full bg-transparent font-medium focus:outline-none focus:border-b border-indigo-500"
                    placeholder="Link Title"
                />
                <input
                    type="text"
                    defaultValue={link.url}
                    onBlur={(e) => onUpdate(link.id, { url: e.target.value })}
                    className="w-full bg-transparent text-sm text-gray-500 dark:text-gray-400 focus:outline-none focus:border-b border-indigo-500"
                    placeholder="https://..."
                />
            </div>
            <button
                onClick={() => onDelete(link.id)}
                className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-2"
                title="Delete link"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
}

// --- Main Link Editor ---
export default function LinkEditor() {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [newLinkUrl, setNewLinkUrl] = useState('');

    // Fetch Profile
    const { data: profile, isLoading: isProfileLoading } = useQuery({
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

    // Fetch Links
    const { data: links = [], isLoading: isLinksLoading } = useQuery({
        queryKey: ['links'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('links')
                .select('*')
                .eq('user_id', user.id)
                .order('display_order', { ascending: true });

            if (error) throw error;

            // Ensure display_order is set for all links
            return data.map((link, index) => ({
                ...link,
                display_order: link.display_order ?? index
            }));
        },
    });

    // Mutations
    const addLinkMutation = useMutation({
        mutationFn: async (url: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const title = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];

            const { data, error } = await supabase
                .from('links')
                .insert({
                    user_id: user.id,
                    title: title || 'New Link',
                    url: url.startsWith('http') ? url : `https://${url}`,
                    display_order: links.length,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            setNewLinkUrl('');
            addToast('Link added successfully', 'success');
        },
        onError: (error: any) => addToast(error.message, 'error'),
    });

    const updateLinkMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
            const { error } = await supabase.from('links').update(updates).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links'] }),
    });

    const deleteLinkMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('links').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            addToast('Link deleted', 'info');
        },
    });

    const reorderLinksMutation = useMutation({
        mutationFn: async (newLinks: any[]) => {
            // Supabase upsert for batch update not easily supported solely by ID in one go without creating valid rows
            // Better to loop or use `upsert` if we have all fields.
            // For list of <20 links, loop is fine.

            for (const [index, link] of newLinks.entries()) {
                await supabase.from('links').update({ display_order: index }).eq('id', link.id);
            }
        },
        onSuccess: () => {
            // Silent success or toast?
        },
        onError: () => {
            addToast('Failed to save order', 'error');
            queryClient.invalidateQueries({ queryKey: ['links'] });
        }
    });

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = links.findIndex((l: any) => l.id === active.id);
            const newIndex = links.findIndex((l: any) => l.id === over.id);

            const newLinks = arrayMove(links, oldIndex, newIndex);

            // Optimistic update? We should update cache immediately
            queryClient.setQueryData(['links'], newLinks);

            // Trigger mutation
            reorderLinksMutation.mutate(newLinks);
        }
    };

    const handleAddLink = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLinkUrl.trim()) return;
        addLinkMutation.mutate(newLinkUrl);
    };

    if (isProfileLoading || isLinksLoading) return <LoadingSpinner />;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Editor Section */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-xl font-semibold mb-4">Add New Link</h2>
                    <form onSubmit={handleAddLink} className="flex gap-4">
                        <input
                            type="text"
                            value={newLinkUrl}
                            onChange={(e) => setNewLinkUrl(e.target.value)}
                            placeholder="Paste URL here (e.g. https://instagram.com/...)"
                            className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={addLinkMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {addLinkMutation.isPending ? <LoadingSpinner /> : <Plus size={20} />}
                            Add
                        </button>
                    </form>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">Your Links</h3>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={links.map((l: any) => l.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3">
                                {links.map((link: any) => (
                                    <SortableLink
                                        key={link.id}
                                        link={link}
                                        onDelete={(id: string) => deleteLinkMutation.mutate(id)}
                                        onUpdate={(id: string, updates: any) =>
                                            updateLinkMutation.mutate({ id, updates })
                                        }
                                    />
                                ))}
                                {links.length === 0 && (
                                    <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                        No links yet. Add one above!
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Preview Section */}
            <div className="lg:col-span-1">
                <div className="sticky top-8">
                    <h2 className="text-xl font-semibold mb-4 text-center lg:text-left">Live Preview</h2>
                    <div className="flex justify-center lg:justify-start">
                        <PreviewMockup profile={profile} links={links} />
                    </div>
                    <div className="mt-6 text-center lg:text-left">
                        <a
                            href={`/u/${profile.username || 'me'}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            View Public Page <ExternalLink size={16} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
