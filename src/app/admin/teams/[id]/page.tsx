'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditTeamPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sportType, setSportType] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  
  const params = useParams();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const teamId = params.id as string;

  useEffect(() => {
    fetchTeam();
  }, [teamId]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      
      // Fetch team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      setName(teamData.name);
      setDescription(teamData.description || '');
      setSportType(teamData.sport_type || '');

      // Count members in this team
      const { count, error: countError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      if (!countError) {
        setMemberCount(count || 0);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          name,
          description,
          sport_type: sportType,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId);

      if (updateError) throw updateError;

      router.push('/admin/teams');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis will:\n• Remove team from database\n• Set ${memberCount} members to "No Team" (they keep their roles)`)) {
      return;
    }

    try {
      // Remove team_id from all users first
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          team_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('team_id', teamId);

      if (updateError) {
        console.error('Error removing team from users:', updateError);
      }

      // Then delete the team from database
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      router.push('/admin/teams');
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/admin/teams"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Teams
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
            Edit Team
          </h1>
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              This team has <span className="font-bold">{memberCount}</span> member(s). 
              If deleted, they will keep their roles but be set to "No Team".
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Name *
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter team name"
              />
            </div>

            <div>
              <label htmlFor="sportType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sport Type
              </label>
              <input
                id="sportType"
                type="text"
                value={sportType}
                onChange={(e) => setSportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Basketball, Soccer"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Team description (optional)"
              />
            </div>

            <div className="flex justify-between pt-6 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Team
              </button>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/admin/teams')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}