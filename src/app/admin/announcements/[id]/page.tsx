'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { useRouter, useParams } from 'next/navigation';
import { Team } from '@/types';
import { 
  ArrowLeftIcon, 
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
  XMarkIcon,
  MapPinIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export default function EditAnnouncementPage() {
  const params = useParams();
  const announcementId = params.id as string;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [teamId, setTeamId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (announcementId) {
      fetchAnnouncement();
      fetchTeams();
    }
  }, [announcementId]);

  const fetchAnnouncement = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:user_profiles!announcements_author_id_fkey (
            id,
            first_name,
            last_name
          ),
          team:teams (
            id,
            name
          )
        `)
        .eq('id', announcementId)
        .single();

      if (error) {
        console.error('Error fetching announcement:', error);
        throw error;
      }

      if (data) {
        setTitle(data.title);
        setContent(data.content);
        setIsPinned(data.is_pinned);
        setTeamId(data.team_id || '');
      }
    } catch (err: any) {
      setError('Failed to load announcement: ' + err.message);
    } finally {
      setFetching(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) setTeams(data);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Update the announcement
      const { error: updateError } = await supabase
        .from('announcements')
        .update({
          title: title.trim(),
          content: content.trim(),
          is_pinned: isPinned,
          team_id: teamId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', announcementId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update announcement: ${updateError.message}`);
      }

      setSuccess(true);
      
      // Success animation and redirect
      setTimeout(() => {
        router.push('/admin/announcements');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      console.error('Update announcement error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (title || content) {
      if (confirm('Are you sure? Your changes will be lost.')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={handleCancel}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 group transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          Back to Announcements
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="px-6 py-8 md:p-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <PencilSquareIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Edit Announcement
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Update announcement details
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center gap-3">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-300">Error!</p>
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              >
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">Success!</p>
                    <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                      Announcement updated successfully! Redirecting...
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                  placeholder="What's the announcement about?"
                  minLength={3}
                  maxLength={200}
                />
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {title.length}/200 characters
                </div>
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Content *
                </label>
                <textarea
                  id="content"
                  rows={8}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 resize-none"
                  placeholder="Share the details with your team..."
                  minLength={10}
                  maxLength={5000}
                />
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {content.length}/5000 characters
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label htmlFor="team" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="h-4 w-4" />
                      Target Audience
                    </div>
                  </label>
                  <select
                    id="team"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.5rem_1.5rem] bg-no-repeat bg-[right_1rem_center]"
                  >
                    <option value="">🌍 All Teams (General Announcement)</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        👥 {team.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Leave empty to send to everyone
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      Announcement Settings
                    </div>
                  </label>
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={isPinned}
                          onChange={(e) => setIsPinned(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Pin announcement
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Keep this announcement at the top of the list
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group"
                >
                  <XMarkIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl disabled:hover:shadow-lg transform hover:-translate-y-0.5 disabled:hover:translate-y-0 group"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircleIcon className="h-5 w-5 animate-bounce" />
                      Success!
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      Update Announcement
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}