'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  sport_type?: string;
}

interface Schedule {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  type: 'practice' | 'game' | 'meeting';
  description?: string;
  meeting_type?: string;
  schedule_type?: string;
  team_id?: string;
  team1_id?: string;
  team2_id?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  team_id: string | null;
  author?: {
    first_name: string;
    last_name: string;
  };
}

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name?: string;
  email: string;
  team_id?: string;
  role?: string;
  phone?: string;
}

export default function PlayerDashboard() {
  const [playerTeam, setPlayerTeam] = useState<Team | null>(null);
  const [teammates, setTeammates] = useState<UserProfile[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Schedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchPlayerData();
  }, []);

  const fetchPlayerData = async () => {
    try {
      // 1. Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Get player's profile
      const { data: playerProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!playerProfile) return;

      // 3. Get player's team
      if (playerProfile.team_id) {
        const { data: team } = await supabase
          .from('teams')
          .select('*')
          .eq('id', playerProfile.team_id)
          .single();

        if (team) {
          setPlayerTeam(team);

          // 4. Get teammates - Get all players on the team, then filter out current player
          const { data: teamPlayers } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('role', 'player')
            .eq('team_id', team.id);

          const otherPlayers = teamPlayers?.filter(player => player.user_id !== user.id) || [];
          setTeammates(otherPlayers);

          // 5. Get upcoming events from ALL THREE schedule tables
          const currentDate = new Date().toISOString();
          
          // Fetch from all three tables in parallel
          const [
            { data: practiceSchedules },
            { data: meetingSchedules },
            { data: gameSchedules }
          ] = await Promise.all([
            // Practice schedules
            supabase
              .from('practice_schedules')
              .select('*')
              .eq('team_id', team.id)
              .gte('start_time', currentDate)
              .order('start_time', { ascending: true })
              .limit(10),
            
            // Meeting schedules
            supabase
              .from('meeting_schedules')
              .select('*')
              .eq('team_id', team.id)
              .gte('start_time', currentDate)
              .order('start_time', { ascending: true })
              .limit(10),
            
            // Game schedules
            supabase
              .from('schedules')
              .select('*')
              .or(`team1_id.eq.${team.id},team2_id.eq.${team.id}`)
              .gte('start_time', currentDate)
              .order('start_time', { ascending: true })
              .limit(10)
          ]);

          // Combine all events
          const allEvents: Schedule[] = [];
          
          // Add practice events
          if (practiceSchedules && practiceSchedules.length > 0) {
            practiceSchedules.forEach(event => {
              allEvents.push({
                ...event,
                type: 'practice' as const
              });
            });
          }
          
          // Add meeting events
          if (meetingSchedules && meetingSchedules.length > 0) {
            meetingSchedules.forEach(event => {
              allEvents.push({
                ...event,
                type: 'meeting' as const
              });
            });
          }
          
          // Add game events
          if (gameSchedules && gameSchedules.length > 0) {
            gameSchedules.forEach(event => {
              allEvents.push({
                ...event,
                type: 'game' as const
              });
            });
          }
          
          // Sort all events by start time and take top 5
          const sortedEvents = allEvents
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            .slice(0, 5);
          
          setUpcomingEvents(sortedEvents);

          // 6. Get announcements for the team
          const { data: announcementsData } = await supabase
            .from('announcements')
            .select(`
              *,
              author:user_profiles(first_name, last_name)
            `)
            .eq('team_id', team.id)
            .order('created_at', { ascending: false })
            .limit(3);

          setAnnouncements(announcementsData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching player data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const getEventTypeLabel = (event: Schedule) => {
    if (event.type === 'practice') return 'Practice';
    if (event.type === 'meeting') return event.meeting_type || 'Meeting';
    if (event.type === 'game') {
      if (event.schedule_type === 'scrimmage') return 'Scrimmage';
      if (event.schedule_type === 'tournament') return 'Tournament';
      return 'Game';
    }
    return 'Event';
  };

  const getEventTypeColor = (event: Schedule) => {
    if (event.type === 'practice') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
    if (event.type === 'meeting') {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    }
    if (event.type === 'game') {
      if (event.schedule_type === 'scrimmage') {
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      }
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">Please wait...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        Player Dashboard
      </h1>

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-xl shadow-lg p-6 mb-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome to Your Dashboard!</h2>
        <p className="opacity-90">
          {playerTeam 
            ? `You're part of ${playerTeam.name}. Check your teammates, upcoming events, and team announcements here.`
            : 'You are not assigned to a team yet. Please contact your coach.'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* My Team Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">My Team</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {playerTeam ? playerTeam.name : 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Teammates Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 mr-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Teammates</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{teammates.length}</p>
            </div>
          </div>
        </div>

        {/* Upcoming Events Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 mr-4">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Events</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{upcomingEvents.length}</p>
            </div>
          </div>
        </div>

        {/* Announcements Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 mr-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Announcements</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{announcements.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Teammates Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Teammates</h2>
            <Link
              href="/player/teams"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All
            </Link>
          </div>
          {teammates.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              {playerTeam 
                ? 'No other teammates on your team yet.' 
                : 'You are not assigned to a team.'}
            </p>
          ) : (
            <div className="space-y-3">
              {teammates.slice(0, 3).map((teammate) => (
                <div key={teammate.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {teammate.first_name} {teammate.last_name || ''}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{teammate.email}</p>
                  </div>
                  {teammate.phone && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      📞 {teammate.phone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events Section - FIXED: Now shows all event types */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upcoming Events</h2>
            <Link
              href="/player/schedules"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              {playerTeam 
                ? 'No upcoming events scheduled for your team.' 
                : 'You are not assigned to a team.'}
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => {
                const { date, time } = formatDateTime(event.start_time);
                const eventTypeLabel = getEventTypeLabel(event);
                const eventTypeColor = getEventTypeColor(event);
                
                return (
                  <div key={event.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{event.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${eventTypeColor}`}>
                        {eventTypeLabel}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-1">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.location || 'Location TBD'}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {date} • {time}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Announcements Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Latest Announcements</h2>
            <Link
              href="/player/announcements"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              {playerTeam 
                ? 'No announcements from your team yet.' 
                : 'You are not assigned to a team.'}
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                    {announcement.content}
                  </p>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {announcement.author 
                        ? `By: ${announcement.author.first_name} ${announcement.author.last_name || ''}`
                        : 'By: Coach'}
                    </span>
                    <span>
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Type Legend */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Event Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Practice - Regular training sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Meeting - Team meetings and strategy sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Game - Matches against other teams</span>
          </div>
        </div>
      </div>
    </div>
  );
}