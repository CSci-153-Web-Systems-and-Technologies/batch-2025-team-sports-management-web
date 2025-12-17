// app/coach/announcements/page.tsx - FINAL VERSION
'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Megaphone, 
  Filter, 
  Users, 
  Globe,
  AlertCircle,
  Calendar,
  User,
  RefreshCw,
  Shield
} from 'lucide-react';

export default function CoachAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'global' | 'team'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachTeam, setCoachTeam] = useState<{id: string, name: string} | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    fetchCoachData();
  }, []);

  const fetchCoachData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo('Starting data fetch...');
      
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        setDebugInfo(`Auth error: ${authError.message}`);
        setError('Please login to access announcements.');
        setLoading(false);
        router.push('/login');
        return;
      }
      
      if (!user) {
        setDebugInfo('No user found');
        setError('Please login to access announcements.');
        setLoading(false);
        router.push('/login');
        return;
      }

      setDebugInfo(`User authenticated: ${user.email}`);

      // Get coach profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        setDebugInfo(`Profile error: ${profileError.message}`);
        setError('Unable to load your profile. Please try again.');
        setLoading(false);
        return;
      }

      if (!profile) {
        setDebugInfo('No profile found for user');
        setError('No coach profile found. Please contact administrator.');
        setLoading(false);
        return;
      }

      setDebugInfo(`Profile loaded: ID=${profile.id}, Team=${profile.team_id}, Role=${profile.role}`);

      // Set coach team
      if (profile.team_id) {
        // Get team name
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('name')
          .eq('id', profile.team_id)
          .single();

        if (teamError) {
          setCoachTeam({ id: profile.team_id, name: 'My Team' });
        } else if (team) {
          setCoachTeam({ id: profile.team_id, name: team.name });
        }
      }

      // Fetch announcements
      await fetchAnnouncements(profile.team_id);
      
    } catch (err: any) {
      console.error('Error in fetchCoachData:', err);
      setDebugInfo(`Caught error: ${err.message}`);
      setError('Failed to load announcements.');
      setLoading(false);
    }
  };

  const fetchAnnouncements = async (teamId: string | null) => {
    try {
      setDebugInfo(prev => prev + `\nFetching announcements for team: ${teamId || 'none'}`);

      // Build query
      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      // If coach has a team, get BOTH global AND team-specific announcements
      if (teamId) {
        query = query.or(`team_id.eq.${teamId},team_id.is.null`);
      } else {
        // If no team, only get global announcements
        query = query.is('team_id', null);
      }

      const { data, error } = await query;

      if (error) {
        setDebugInfo(prev => prev + `\nAnnouncements query error: ${error.message}`);
        
        // Try a simpler query
        const { data: simpleData, error: simpleError } = await supabase
          .from('announcements')
          .select('*')
          .limit(5);
        
        if (simpleError) {
          throw simpleError;
        }
        
        setAnnouncements(simpleData || []);
        setDebugInfo(prev => prev + `\nSimple query successful: ${simpleData?.length || 0} announcements`);
      } else {
        setAnnouncements(data || []);
        setDebugInfo(prev => prev + `\nAnnouncements loaded: ${data?.length || 0} items`);
        
        // If we got data but no author/team info, fetch separately
        if (data && data.length > 0) {
          await fetchAdditionalAnnouncementInfo(data);
        }
      }
      
    } catch (err: any) {
      console.error('Error in fetchAnnouncements:', err);
      setDebugInfo(prev => prev + `\nFetch error: ${err.message}`);
      setError(`Failed to load announcements: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdditionalAnnouncementInfo = async (announcementsData: any[]) => {
    try {
      const updatedAnnouncements = await Promise.all(
        announcementsData.map(async (announcement) => {
          // Fetch author info
          if (announcement.created_by) {
            const { data: authorData } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, role')
              .eq('id', announcement.created_by)
              .single();
            
            if (authorData) {
              announcement.author = authorData;
            }
          }
          
          // Fetch team info if team_id exists
          if (announcement.team_id) {
            const { data: teamData } = await supabase
              .from('teams')
              .select('name')
              .eq('id', announcement.team_id)
              .single();
            
            if (teamData) {
              announcement.team = teamData;
            }
          }
          
          return announcement;
        })
      );
      
      setAnnouncements(updatedAnnouncements);
      
    } catch (err) {
      console.error('Error fetching additional info:', err);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'; // Changed from green to gray
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Filter announcements based on selected filter
  const filteredAnnouncements = announcements.filter(announcement => {
    if (filter === 'all') return true;
    if (filter === 'global') return !announcement.team_id;
    if (filter === 'team') return announcement.team_id === coachTeam?.id;
    return true;
  });

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    fetchCoachData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading announcements...</p>
          <button
            onClick={handleRefresh}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Taking too long? Click here
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View all announcements for {coachTeam?.name || 'your team'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {coachTeam ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {coachTeam.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{coachTeam.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Your Team</p>
                </div>
              </div>
            ) : (
              <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg">
                No team assigned
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-red-800 dark:text-red-300 mb-1">Error</h4>
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleRefresh}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setError(null)}
                  className="px-3 py-1 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Announcements</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{announcements.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">All announcements</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-blue-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Global Announcements</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{announcements.filter(a => !a.team_id).length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">From administrators</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Team Announcements</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {announcements.filter(a => a.team_id === coachTeam?.id).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">For your team only</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">Filter by:</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              All Announcements
            </button>
            <button
              onClick={() => setFilter('global')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'global' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              Global Only
            </button>
            <button
              onClick={() => setFilter('team')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'team' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              Team Only
            </button>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <Megaphone className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No announcements found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {filter !== 'all' 
              ? `No ${filter} announcements available.` 
              : 'No announcements have been posted yet.'}
          </p>
          {coachTeam && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You are viewing announcements for: <span className="font-medium">{coachTeam.name}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAnnouncements.map((announcement) => {
            const isGlobal = !announcement.team_id;
            const priority = announcement.priority || 'low';
            
            return (
              <div key={announcement.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {announcement.title}
                        </h3>
                        {/* Only show priority badge if it's not LOW */}
                        {priority !== 'low' && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(priority)}`}>
                            {priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          {announcement.author?.role === 'admin' ? (
                            <Shield className="w-4 h-4 text-purple-500" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                          <span>
                            {announcement.author?.first_name} {announcement.author?.last_name}
                            {announcement.author?.role === 'admin' && ' (Admin)'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(announcement.created_at)}</span>
                        </div>
                        
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          isGlobal 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {isGlobal ? (
                            <>
                              <Globe className="w-3 h-3" />
                              <span>Global Announcement</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-3 h-3" />
                              <span>{announcement.team?.name || 'Team Announcement'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="mt-6">
                    <div className="prose max-w-none dark:prose-invert">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                  
                  {/* Footer - REMOVED the priority text */}
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>
                        Posted {formatDate(announcement.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Priority indicator removed from here */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Removed the "About Announcements" section completely */}
    </div>
  );
}