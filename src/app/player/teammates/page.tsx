// app/player/teammates/page.tsx - PLAYER VIEW-ONLY WITH SAME UI
'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

interface UserProfile {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  role: string;
  team_id?: string | null;
  user_id?: string | null;
  created_at?: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
}

export default function PlayerTeammatesPage() {
  const [playerTeam, setPlayerTeam] = useState<Team | null>(null);
  const [teammates, setTeammates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        setError(`Authentication error: ${authError.message}`);
        return;
      }
      
      if (!user) {
        setError('Please log in to access this page');
        return;
      }

      // 2. Get player's profile
      const { data: playerProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!playerProfile) {
        setError('Player profile not found. Please contact administrator.');
        return;
      }

      if (playerProfile.role !== 'player') {
        setError('You are not authorized as a player.');
        return;
      }

      // 3. Get all teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*');

      // 4. Find player's team
      const currentTeam = teams?.find(t => t.id === playerProfile.team_id) || null;
      setPlayerTeam(currentTeam);

      // 5. Get players on the same team (including the current player)
      if (currentTeam) {
        const { data: players, error: playersError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'player')
          .eq('team_id', currentTeam.id);

        if (playersError) {
          setError(`Error loading teammates: ${playersError.message}`);
          return;
        }

        setTeammates(players || []);
      } else {
        // Player has no team
        setTeammates([]);
      }

    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading teammate data...</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">Please wait...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-300">Error</h2>
          </div>
          <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Teammates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View all players on your team
          </p>
        </div>
        <div className="flex items-center gap-4">
          {playerTeam && (
            <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg">
              <span className="font-semibold">Team:</span> {playerTeam.name}
            </div>
          )}
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Teammates */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {playerTeam ? `${playerTeam.name} Players` : 'My Team'} 
            <span className="ml-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-sm rounded-full">
              {teammates.length}
            </span>
          </h2>
          {!playerTeam && (
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 text-sm rounded">
              No Team Assigned
            </span>
          )}
        </div>

        {teammates.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-10a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {playerTeam ? 'No players on your team yet' : 'You are not assigned to a team'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {playerTeam 
                ? 'Players will appear here once they join your team' 
                : 'Please contact administrator to be assigned to a team'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {teammates.map((teammate) => (
              <div key={teammate.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {teammate.first_name} {teammate.last_name || ''}
                      </h3>
                      {!teammate.user_id && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-300 rounded">
                          Test
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{teammate.email}</p>
                    {teammate.phone && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">📞 {teammate.phone}</p>
                    )}
                  </div>
                  {/* No remove button - view only */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}