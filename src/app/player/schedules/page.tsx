'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

interface Schedule {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  type: 'practice' | 'meeting' | 'game';
  source_table: 'practice_schedules' | 'meeting_schedules' | 'schedules';
  team_id?: string;
  team1_id?: string;
  team2_id?: string;
  meeting_type?: string;
  schedule_type?: string;
  created_at?: string;
  updated_at?: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
}

export default function PlayerSchedulesPage() {
  const [playerTeam, setPlayerTeam] = useState<Team | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'practice' | 'meeting' | 'game'>('all');
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

      // 5. Get schedules from ALL THREE tables
      if (currentTeam) {
        const [
          { data: practiceSchedules, error: practiceError },
          { data: meetingSchedules, error: meetingError },
          { data: gameSchedules, error: gameError }
        ] = await Promise.all([
          // Practice schedules
          supabase
            .from('practice_schedules')
            .select('*')
            .eq('team_id', currentTeam.id)
            .order('start_time', { ascending: true }),
          
          // Meeting schedules
          supabase
            .from('meeting_schedules')
            .select('*')
            .eq('team_id', currentTeam.id)
            .order('start_time', { ascending: true }),
          
          // Game schedules
          supabase
            .from('schedules')
            .select('*')
            .or(`team1_id.eq.${currentTeam.id},team2_id.eq.${currentTeam.id}`)
            .order('start_time', { ascending: true })
        ]);

        if (practiceError) console.error('Practice schedules error:', practiceError);
        if (meetingError) console.error('Meeting schedules error:', meetingError);
        if (gameError) console.error('Game schedules error:', gameError);

        // Combine all schedules
        const allSchedules: Schedule[] = [];
        
        // Add practice schedules
        if (practiceSchedules) {
          practiceSchedules.forEach(schedule => {
            allSchedules.push({
              ...schedule,
              type: 'practice' as const,
              source_table: 'practice_schedules' as const
            });
          });
        }
        
        // Add meeting schedules
        if (meetingSchedules) {
          meetingSchedules.forEach(schedule => {
            allSchedules.push({
              ...schedule,
              type: 'meeting' as const,
              source_table: 'meeting_schedules' as const
            });
          });
        }
        
        // Add game schedules
        if (gameSchedules) {
          gameSchedules.forEach(schedule => {
            allSchedules.push({
              ...schedule,
              type: 'game' as const,
              source_table: 'schedules' as const,
              team_id: currentTeam.id // Add team_id for consistency
            });
          });
        }
        
        // Sort all schedules by start time
        const sortedSchedules = allSchedules.sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
        
        setSchedules(sortedSchedules);
      } else {
        // Player has no team
        setSchedules([]);
      }

    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter schedules by type
  const filteredSchedules = schedules.filter(schedule => {
    if (activeFilter === 'all') return true;
    return schedule.type === activeFilter;
  });

  // Extract date from timestamp
  const getDateFromTimestamp = (timestamp: string) => {
    return timestamp.split('T')[0]; // Get YYYY-MM-DD part
  };

  // Extract time from timestamp
  const getTimeFromTimestamp = (timestamp: string) => {
    return timestamp.split('T')[1]?.split(':').slice(0, 2).join(':'); // Get HH:MM part
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    if (!timeString) return 'TBD';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  // Check if schedule is upcoming or past
  const isUpcoming = (timestamp: string) => {
    const scheduleDateTime = new Date(timestamp);
    const now = new Date();
    return scheduleDateTime > now;
  };

  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'practice':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300';
      case 'meeting':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300';
      case 'game':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300';
    }
  };

  // Get type label
  const getTypeLabel = (schedule: Schedule) => {
    if (schedule.type === 'practice') return 'Practice';
    if (schedule.type === 'meeting') return schedule.meeting_type || 'Meeting';
    if (schedule.type === 'game') {
      if (schedule.schedule_type === 'scrimmage') return 'Scrimmage';
      if (schedule.schedule_type === 'tournament') return 'Tournament';
      return 'Game';
    }
    return 'Event';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading schedule data...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Schedule</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View all practices, meetings, and games for your team
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

      {/* Filter Buttons */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${activeFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            All Events
            <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
              {schedules.length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('practice')}
            className={`px-4 py-2 rounded-lg transition-colors ${activeFilter === 'practice' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            Practices
            <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
              {schedules.filter(s => s.type === 'practice').length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('meeting')}
            className={`px-4 py-2 rounded-lg transition-colors ${activeFilter === 'meeting' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            Meetings
            <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
              {schedules.filter(s => s.type === 'meeting').length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('game')}
            className={`px-4 py-2 rounded-lg transition-colors ${activeFilter === 'game' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            Games
            <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
              {schedules.filter(s => s.type === 'game').length}
            </span>
          </button>
        </div>
      </div>

      {/* Schedules */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {playerTeam ? `${playerTeam.name} Schedule` : 'Team Schedule'} 
            <span className="ml-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-sm rounded-full">
              {filteredSchedules.length} {activeFilter !== 'all' ? activeFilter + 's' : 'events'}
            </span>
          </h2>
          {!playerTeam && (
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 text-sm rounded">
              No Team Assigned
            </span>
          )}
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {playerTeam ? `No ${activeFilter !== 'all' ? activeFilter + 's' : 'events'} found for your team` : 'You are not assigned to a team'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {playerTeam 
                ? 'Your coach will add events here' 
                : 'Please contact administrator to be assigned to a team'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSchedules.map((schedule) => {
              const upcoming = isUpcoming(schedule.start_time);
              const date = getDateFromTimestamp(schedule.start_time);
              const startTime = getTimeFromTimestamp(schedule.start_time);
              const endTime = schedule.end_time ? getTimeFromTimestamp(schedule.end_time) : null;
              const typeLabel = getTypeLabel(schedule);
              const typeBadgeColor = getTypeBadgeColor(schedule.type);
              
              return (
                <div key={`${schedule.source_table}-${schedule.id}`} className={`p-6 rounded-lg border ${upcoming ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'} hover:bg-opacity-80 transition-colors`}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div className={`w-3 h-3 rounded-full ${upcoming ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {schedule.title}
                        </h3>
                        <span className={`px-3 py-1 text-sm rounded ${typeBadgeColor}`}>
                          {typeLabel}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded">
                          {schedule.source_table === 'practice_schedules' ? 'Coach Schedule' : 
                           schedule.source_table === 'meeting_schedules' ? 'Meeting' : 'Game Schedule'}
                        </span>
                        {!upcoming && (
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded">
                            Past Event
                          </span>
                        )}
                      </div>
                      
                      {schedule.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {schedule.description}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Date */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(date)}</p>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatTime(startTime)}
                              {endTime && ` - ${formatTime(endTime)}`}
                            </p>
                          </div>
                        </div>

                        {/* Location */}
                        {schedule.location && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                              <p className="font-medium text-gray-900 dark:text-white">{schedule.location}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Additional info for games */}
                      {schedule.type === 'game' && schedule.team1_id && schedule.team2_id && (
                        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Match:</span> {schedule.team1_id === schedule.team_id ? 'Your Team' : 'Opponent'} vs {schedule.team2_id === schedule.team_id ? 'Your Team' : 'Opponent'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className={`px-4 py-2 rounded-lg ${upcoming ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'} font-medium`}>
                      {upcoming ? 'Upcoming' : 'Completed'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Schedule Information</h3>
            <p className="text-blue-700 dark:text-blue-400 text-sm">
              This page shows all scheduled events for your team from multiple sources:
            </p>
            <ul className="mt-2 text-blue-700 dark:text-blue-400 text-sm space-y-1">
              <li>• <span className="font-medium">Practices:</span> Regular training sessions scheduled by your coach</li>
              <li>• <span className="font-medium">Meetings:</span> Team meetings and strategy sessions</li>
              <li>• <span className="font-medium">Games:</span> Matches against other teams</li>
            </ul>
            <p className="mt-2 text-blue-700 dark:text-blue-400 text-sm">
              Upcoming events are highlighted in blue. Please check this schedule regularly.
              If you have any questions about the schedule, please contact your coach.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}