'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { Team } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSportType, setFilterSportType] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        setMessage({ type: 'error', text: `Error: ${teamsError.message}` });
        return;
      }

      if (!teamsData) {
        setTeams([]);
        return;
      }

      // Store teams
      setTeams(teamsData);

      // Fetch creator names
      const creatorIds = teamsData
        .map(team => team.created_by)
        .filter((id): id is string => !!id);

      if (creatorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .in('id', creatorIds);

        if (!profilesError && profiles) {
          const namesMap: Record<string, string> = {};
          profiles.forEach(profile => {
            namesMap[profile.id] = `${profile.first_name} ${profile.last_name}`.trim();
          });
          setCreatorNames(namesMap);
        }
      }

      // Since team_id is in user_profiles table, count users per team
      const counts: Record<string, number> = {};
      
      for (const team of teamsData) {
        // Count users who have this team_id in their profile
        const { count, error } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);

        if (error) {
          console.error(`Error counting members for team ${team.id}:`, error);
          counts[team.id] = 0;
        } else {
          counts[team.id] = count || 0;
        }
      }
      
      setMemberCounts(counts);

    } catch (error: any) {
      console.error('Unexpected error:', error);
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also remove all team members.`)) {
      return;
    }

    try {
      // First, remove team_id from all user_profiles that reference this team
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ team_id: null })
        .eq('team_id', id);

      if (updateError) {
        console.error('Error removing team from users:', updateError);
      }

      // Then delete the team
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete team: ${error.message}`);
      }

      setMessage({ type: 'success', text: `Team "${name}" deleted successfully` });
      fetchTeams(); // Refresh the list
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterSportType('');
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = !searchTerm || 
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSportType = !filterSportType || 
      team.sport_type === filterSportType;
    
    return matchesSearch && matchesSportType;
  });

  const sportTypes = [...new Set(teams.map(t => t.sport_type).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Teams Management
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Create, edit, and manage your sports teams
              </p>
            </div>
            <Link
              href="/admin/teams/create"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Team
            </Link>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-sm hover:opacity-75"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Teams List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  All Teams ({filteredTeams.length})
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredTeams.length} of {teams.length} teams
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search teams..."
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                />
                <select
                  value={filterSportType}
                  onChange={(e) => setFilterSportType(e.target.value)}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Sports</option>
                  {sportTypes.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Teams Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sport
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No teams found
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      {/* Team Details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {team.name}
                            </p>
                            {team.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {team.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Sport Type */}
                      <td className="py-4 px-6">
                        {team.sport_type ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {team.sport_type}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                        )}
                      </td>

                      {/* Creator */}
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {team.created_by ? creatorNames[team.created_by] || 'Loading...' : '—'}
                        </div>
                      </td>

                      {/* Members */}
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <Link
                            href={`/admin/teams/${team.id}/members`}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            {memberCounts[team.id] || 0} members
                          </Link>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(team.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(team.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/admin/teams/${team.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          >
                            Edit
                          </Link>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <button
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing <span className="font-medium">{filteredTeams.length}</span> teams
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total: <span className="font-medium">{teams.length}</span> teams
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}