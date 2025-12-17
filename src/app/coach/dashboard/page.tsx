// app/coach/dashboard/page.tsx - FIXED VERSION
'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Calendar, 
  Bell, 
  Plus,
  Clock,
  MapPin,
  ChevronRight,
  Megaphone,
  AlertCircle,
  Target,
  Briefcase,
  Users as UsersIcon
} from 'lucide-react';

export default function CoachDashboard() {
  const [coachTeam, setCoachTeam] = useState<{id: string, name: string} | null>(null);
  const [upcomingSchedules, setUpcomingSchedules] = useState<any[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    fetchCoachData();
  }, []);

  const fetchCoachData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError('Please login to access the coach dashboard.');
        setLoading(false);
        router.push('/login');
        return;
      }

      setUserEmail(user.email || '');

      // 2. Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('Profile data:', profile);

      // 3. Handle profile not found
      if (profileError?.code === 'PGRST116' || !profile) {
        console.log('Creating coach profile automatically...');
        
        // Get available teams (Red Dragon or Blue Dragon)
        const { data: availableTeams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .limit(2);
        
        if (teamsError) {
          console.error('Teams error:', teamsError);
          setError('Cannot load teams. Please try again.');
          setLoading(false);
          return;
        }
        
        let teamId = null;
        let teamName = 'Default Team';
        
        if (availableTeams && availableTeams.length > 0) {
          // Use the first available team
          teamId = availableTeams[0].id;
          teamName = availableTeams[0].name;
        } else {
          // Create Red Dragon team if none exists
          const { data: newTeam, error: teamError } = await supabase
            .from('teams')
            .insert({
              name: 'Red Dragon',
              sport_type: 'Basketball',
              description: 'Basketball team'
            })
            .select('id, name')
            .single();
          
          if (teamError) {
            console.error('Team creation error:', teamError);
            setError('Failed to create team. Please contact administrator.');
            setLoading(false);
            return;
          }
          
          teamId = newTeam.id;
          teamName = newTeam.name;
        }
        
        // Create coach profile
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            role: 'coach',
            first_name: 'Coach',
            last_name: 'User',
            team_id: teamId
          })
          .select('*')
          .single();
        
        if (createError) {
          console.error('Profile creation error:', createError);
          setError('Failed to create coach profile. Please try again.');
          setLoading(false);
          return;
        }
        
        // Set role
        setUserRole('coach');
        
        // Set team
        setCoachTeam({ id: teamId, name: teamName });
        
        // Fetch all data for this team
        await fetchTeamData(teamId);
        
      } else if (profileError) {
        console.error('Profile fetch error:', profileError);
        setError('Unable to load your profile. Please try again.');
        setLoading(false);
        return;
      } else {
        // Profile exists
        setUserRole(profile.role);
        
        // Check role
        if (profile.role !== 'coach' && profile.role !== 'admin') {
          setError(`Access denied. Your role is "${profile.role}". Only coaches can access this dashboard.`);
          setLoading(false);
          
          setTimeout(() => {
            if (profile.role === 'player') router.push('/player/dashboard');
            else if (profile.role === 'admin') router.push('/admin/dashboard');
            else router.push('/dashboard');
          }, 3000);
          return;
        }
        
        // Get team data if team_id exists
        if (profile.team_id) {
          // Get team name
          const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('name')
            .eq('id', profile.team_id)
            .single();
          
          if (!teamError && team) {
            setCoachTeam({ id: profile.team_id, name: team.name });
          } else {
            setCoachTeam({ id: profile.team_id, name: 'My Team' });
          }
          
          // Fetch all data for this team
          await fetchTeamData(profile.team_id);
        } else {
          setError('No team assigned to your profile. Please contact administrator.');
          setLoading(false);
        }
      }
      
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(`Failed to load dashboard: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const fetchTeamData = async (teamId: string) => {
    try {
      console.log('Fetching data for team:', teamId);
      
      // Fetch all data in parallel
      const [
        playersResult,
        announcementsResult,
        // Fetch from practice_schedules table
        practicesResult,
        // Fetch from meeting_schedules table
        meetingsResult
      ] = await Promise.all([
        // Get players in this team
        supabase
          .from('user_profiles')
          .select('*')
          .eq('team_id', teamId)
          .eq('role', 'player'),

        // Get announcements (BOTH global AND team-specific)
        supabase
          .from('announcements')
          .select('*')
          .or(`team_id.eq.${teamId},team_id.is.null`) // Team-specific OR global
          .order('created_at', { ascending: false })
          .limit(5),

        // Get upcoming practices for this team
        supabase
          .from('practice_schedules')
          .select('*')
          .eq('team_id', teamId)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(3),

        // Get upcoming meetings for this team
        supabase
          .from('meeting_schedules')
          .select('*')
          .eq('team_id', teamId)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(3)
      ]);

      // Set players
      if (!playersResult.error) {
        setTeamPlayers(playersResult.data || []);
      } else {
        console.error('Players error:', playersResult.error);
      }

      // Set announcements (both global and team-specific)
      if (!announcementsResult.error) {
        setAnnouncements(announcementsResult.data || []);
      } else {
        console.error('Announcements error:', announcementsResult.error);
      }

      // Combine practices and meetings into one array
      const allSchedules = [];
      
      // Add practices
      if (!practicesResult.error && practicesResult.data) {
        practicesResult.data.forEach(practice => {
          allSchedules.push({
            ...practice,
            type: 'practice',
            schedule_type: 'practice',
            icon: Target,
            color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
          });
        });
      } else {
        console.error('Practices error:', practicesResult.error);
      }

      // Add meetings
      if (!meetingsResult.error && meetingsResult.data) {
        meetingsResult.data.forEach(meeting => {
          allSchedules.push({
            ...meeting,
            type: 'meeting',
            schedule_type: 'meeting',
            icon: Briefcase,
            color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
          });
        });
      } else {
        console.error('Meetings error:', meetingsResult.error);
      }

      // Sort by start_time and limit to 5 total
      allSchedules.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      
      setUpcomingSchedules(allSchedules.slice(0, 5));

    } catch (err) {
      console.error('Error fetching team data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format date and time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading coach dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Issue</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
              
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={fetchCoachData}
                  className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
              
              {userEmail && (
                <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Logged in as: <span className="font-medium text-gray-900 dark:text-white">{userEmail}</span>
                  </p>
                  {userRole && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Role: <span className="font-medium text-gray-900 dark:text-white">{userRole}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coach Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, Coach! Managing {coachTeam?.name || 'your team'}.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {coachTeam?.name?.charAt(0) || 'T'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{coachTeam?.name || 'Team'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Team</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Team Players Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Team Players</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{teamPlayers.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active players in your team</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <Link
            href="/coach/players"
            className="mt-4 inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all players <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Upcoming Schedules Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Events</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{upcomingSchedules.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Practices & meetings</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <Link
            href="/coach/schedules"
            className="mt-4 inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Manage schedule <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Recent Announcements Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Announcements</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{announcements.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Latest updates</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <Link
            href="/coach/announcements"
            className="mt-4 inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all announcements <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Schedules Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Events</h2>
              <div className="flex gap-2">
                <Link
                  href="/coach/schedules/create-practice"
                  className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Practice
                </Link>
                <Link
                  href="/coach/schedules/create-meeting"
                  className="flex items-center gap-1 text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Meeting
                </Link>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {upcomingSchedules.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No upcoming events scheduled.</p>
                <div className="mt-3 flex gap-2 justify-center">
                  <Link
                    href="/coach/schedules/create-practice"
                    className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Schedule practice
                  </Link>
                  <span className="text-gray-400">or</span>
                  <Link
                    href="/coach/schedules/create-meeting"
                    className="inline-block text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Schedule meeting
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSchedules.map((schedule) => {
                  const Icon = schedule.type === 'practice' ? Target : Briefcase;
                  const typeColor = schedule.type === 'practice' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
                  
                  return (
                    <div key={schedule.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeColor}`}>
                              <Icon className="w-3 h-3" />
                              {schedule.type === 'practice' ? 'Practice' : 'Meeting'}
                            </span>
                            {schedule.meeting_type && schedule.type === 'meeting' && (
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                {schedule.meeting_type.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          
                          <h3 className="font-medium text-gray-900 dark:text-white">{schedule.title}</h3>
                          <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              {formatDate(schedule.start_time)} at {formatTime(schedule.start_time)}
                            </div>
                            {schedule.location && (
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2" />
                                {schedule.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/coach/schedules/${schedule.type}/${schedule.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {upcomingSchedules.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="/coach/schedules"
                  className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  View all events <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Team Players Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Players ({teamPlayers.length})</h2>
              <Link
                href="/coach/players"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Manage Players
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {teamPlayers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No players in your team yet.</p>
                <Link
                  href="/coach/players"
                  className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Add players to your team
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {teamPlayers.slice(0, 5).map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {player.first_name?.charAt(0) || player.last_name?.charAt(0) || 'P'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {player.first_name} {player.last_name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                          {player.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      Player
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {teamPlayers.length > 5 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="/coach/players"
                  className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  View all {teamPlayers.length} players <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Announcements Section (Full Width) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Announcements</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                  {announcements.filter(a => !a.team_id).length} Global
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  {announcements.filter(a => a.team_id).length} Team
                </span>
              </div>
              <Link
                href="/coach/announcements"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {announcements.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No announcements yet.</p>
                <Link
                  href="/coach/announcements"
                  className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Check for updates
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => {
                  const isGlobal = !announcement.team_id;
                  return (
                    <div key={announcement.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">{announcement.title}</h3>
                            {isGlobal ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                Global Announcement
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                Team Announcement
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                            {announcement.content}
                          </p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Posted on {formatDate(announcement.created_at)}
                            </span>
                            {announcement.priority && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                announcement.priority === 'high' 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                  : announcement.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              }`}>
                                {announcement.priority.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/coach/schedules"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow text-center"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 mx-auto mb-4 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Manage Schedules</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and edit all events</p>
        </Link>

        <Link
          href="/coach/players"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow text-center"
        >
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-4 flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Manage Players</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Add or remove team players</p>
        </Link>

        <Link
          href="/coach/announcements"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow text-center"
        >
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 mx-auto mb-4 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Announcements</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">View all announcements</p>
        </Link>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2024 SportsHub Coach Dashboard</p>
          <p className="mt-1">Team: {coachTeam?.name || 'Not assigned'}</p>
        </div>
      </footer>
    </div>
  );
}