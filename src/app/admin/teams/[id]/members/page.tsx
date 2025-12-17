'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  sport_type: string;
}

export default function TeamMembersPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const params = useParams();
  const supabase = createSupabaseBrowserClient();
  const teamId = params.id as string;

  useEffect(() => {
    if (teamId) {
      fetchTeamMembers();
    }
  }, [teamId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Fetch team details first
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch members for THIS SPECIFIC TEAM ONLY
      const { data: membersData, error: membersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, role')
        .eq('team_id', teamId) // This filters by team_id to only get members of this team
        .order('last_name', { ascending: true });

      if (membersError) throw membersError;
      
      // Format the data
      const formattedMembers = (membersData || []).map(member => ({
        id: member.id,
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        email: member.email || '',
        role: member.role || 'player'
      }));
      
      setMembers(formattedMembers);

    } catch (error: any) {
      console.error('Error fetching team members:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setMembers(prev => prev.map(member => 
        member.id === userId ? { ...member, role: newRole } : member
      ));
      
      setMessage({ type: 'success', text: 'Role updated successfully' });

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const removeFromTeam = async (userId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from ${team?.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          team_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Remove from local state
      setMembers(prev => prev.filter(member => member.id !== userId));
      
      setMessage({ type: 'success', text: `${userName} removed from team` });

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading team members...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Team not found</h2>
        <Link href="/admin/teams" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">
          ← Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/admin/teams"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ← Back to Teams
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {team.name} - Team Members
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {team.sport_type} Team • {members.length} members
                {members.length > 0 && (
                  <span className="ml-2">
                    ({members.filter(m => m.role === 'coach').length} coaches, {members.filter(m => m.role === 'player').length} players)
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={fetchTeamMembers}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Refresh
            </button>
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

        {/* Members Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Team Members ({members.length})
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Only showing members assigned to {team.name}
                </p>
              </div>
            </div>
          </div>

          {/* Members Table - Simple 3 column layout */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Member Name
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No members found in {team.name}.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      {/* Member Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            member.role === 'coach' 
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }`}>
                            <span className="font-medium">
                              {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {member.first_name} {member.last_name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {member.email}
                        </p>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            member.role === 'coach'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {member.role === 'coach' ? 'Coach' : 'Player'}
                          </span>
                          <select
                            value={member.role}
                            onChange={(e) => updateMemberRole(member.id, e.target.value)}
                            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="player">Player</option>
                            <option value="coach">Coach</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => removeFromTeam(member.id, `${member.first_name} ${member.last_name}`)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm px-3 py-1 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Remove
                        </button>
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
                Showing <span className="font-medium">{members.length}</span> members in {team.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {members.filter(m => m.role === 'coach').length} coaches • {members.filter(m => m.role === 'player').length} players
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}