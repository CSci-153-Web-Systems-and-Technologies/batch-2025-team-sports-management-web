'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { Announcement } from '@/types';
import Link from 'next/link';
import { 
  PencilSquareIcon, 
  TrashIcon, 
  PlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (announcementsError) {
        console.error('Error loading announcements:', announcementsError);
        return;
      }
      
      if (!announcementsData || announcementsData.length === 0) {
        setAnnouncements([]);
        setLoading(false);
        return;
      }
      
      // Get user IDs for author info
      const authorIds = announcementsData.map(a => a.author_id).filter(id => id);
      const { data: authorsData } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .in('id', authorIds);
      
      // Get team IDs
      const teamIds = announcementsData.map(a => a.team_id).filter(id => id);
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);
      
      // Combine data
      const combinedData = announcementsData.map(announcement => ({
        ...announcement,
        author: authorsData?.find(a => a.id === announcement.author_id) || null,
        team: teamsData?.find(t => t.id === announcement.team_id) || null
      }));
      
      setAnnouncements(combinedData);
      
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Failed to delete announcement: ' + error.message);
        throw error;
      }

      // Remove from state
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      alert('Announcement deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const togglePinAnnouncement = async (id: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !currentPinned })
        .eq('id', id);

      if (error) {
        alert('Failed to update pin status: ' + error.message);
        throw error;
      }

      // Update local state
      setAnnouncements(prev => 
        prev.map(announcement => 
          announcement.id === id 
            ? { ...announcement, is_pinned: !currentPinned }
            : announcement
        )
      );
      
      alert(`Announcement ${!currentPinned ? 'pinned' : 'unpinned'} successfully!`);
    } catch (error) {
      console.error('Pin toggle error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Announcements
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage and create announcements for your organization
            </p>
          </div>
          <Link
            href="/admin/announcements/create"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <PlusIcon className="h-5 w-5" />
            New Announcement
          </Link>
        </div>

        {announcements.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No announcements yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first announcement to share with the team
            </p>
            <Link
              href="/admin/announcements/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Create Announcement
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Pinned Announcements */}
            {announcements.filter(a => a.is_pinned).length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-yellow-500" />
                  Pinned Announcements
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {announcements
                    .filter(a => a.is_pinned)
                    .map((announcement, index) => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        index={index}
                        deletingId={deletingId}
                        onDelete={deleteAnnouncement}
                        onTogglePin={togglePinAnnouncement}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* All Announcements */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                All Announcements
              </h2>
              <AnimatePresence>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {announcements
                    .filter(a => !a.is_pinned)
                    .map((announcement, index) => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        index={index}
                        deletingId={deletingId}
                        onDelete={deleteAnnouncement}
                        onTogglePin={togglePinAnnouncement}
                      />
                    ))}
                </div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Separate component for announcement card
function AnnouncementCard({ 
  announcement, 
  index, 
  deletingId, 
  onDelete, 
  onTogglePin 
}: { 
  announcement: Announcement;
  index: number;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, currentPinned: boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className={`relative group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-l-4 ${announcement.is_pinned ? 'border-yellow-500' : 'border-transparent'}`}
    >
      {deletingId === announcement.id && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {announcement.title}
              </h3>
              {announcement.is_pinned && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium">
                  <CheckCircleIcon className="h-3 w-3" />
                  Pinned
                </span>
              )}
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
              {announcement.content}
            </p>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <UserCircleIcon className="h-4 w-4" />
                <span>
                  {announcement.author?.first_name} {announcement.author?.last_name}
                </span>
                {announcement.author?.role && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
                    {announcement.author.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                <span>
                  {new Date(announcement.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {announcement.team && (
                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs">
                  {announcement.team.name}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onTogglePin(announcement.id, announcement.is_pinned)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={announcement.is_pinned ? 'Unpin' : 'Pin'}
            >
              {announcement.is_pinned ? (
                <XMarkIcon className="h-5 w-5 text-yellow-600 hover:text-yellow-700" />
              ) : (
                <SparklesIcon className="h-5 w-5 text-gray-400 hover:text-yellow-500" />
              )}
            </button>
            <Link
              href={`/admin/announcements/${announcement.id}`}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Edit"
            >
              <PencilSquareIcon className="h-5 w-5 text-blue-600 hover:text-blue-700" />
            </Link>
            <button
              onClick={() => onDelete(announcement.id)}
              disabled={deletingId === announcement.id}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete"
            >
              <TrashIcon className="h-5 w-5 text-red-600 hover:text-red-700" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}