'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { Calendar, Clock, MapPin, Plus, Edit, Trash2, Eye, Shield, Users, Target, Briefcase } from 'lucide-react';

type PracticeSchedule = {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

type MeetingSchedule = {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  meeting_type: 'team_meeting' | 'parent_meeting' | 'coach_meeting' | 'other';
  start_time: string;
  end_time: string | null;
  location: string | null;
  agenda: string | null;
  created_by: string;
  created_at: string;
};

type GameSchedule = {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  opponent: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  home_game: boolean;
  created_by: string;
  created_at: string;
};

type CombinedSchedule = {
  id: string;
  type: 'practice' | 'meeting' | 'game';
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  subtype?: string;
  originalData: PracticeSchedule | MeetingSchedule | GameSchedule;
};

type FilterType = 'all' | 'practice' | 'meeting' | 'game';

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<CombinedSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachTeamId, setCoachTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchCoachData();
  }, []);

  const fetchCoachData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get coach profile with team_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, team_id, role')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.role !== 'coach') {
        setError('Access denied. Coach role required.');
        setLoading(false);
        return;
      }

      if (!profile.team_id) {
        setError('No team assigned to your profile.');
        setLoading(false);
        return;
      }

      setCoachTeamId(profile.team_id);

      // Get team name
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', profile.team_id)
        .single();

      if (team) {
        setTeamName(team.name);
      }

      // Fetch all schedules for this team
      await fetchAllSchedules(profile.team_id);
      
    } catch (err: any) {
      console.error('Error fetching coach data:', err);
      setError('Failed to load schedule data.');
      setLoading(false);
    }
  };

  const fetchAllSchedules = async (teamId: string) => {
    try {
      // Fetch from practice_schedules table
      const { data: practices, error: practiceError } = await supabase
        .from('practice_schedules')
        .select('*')
        .eq('team_id', teamId)
        .order('start_time', { ascending: true });

      if (practiceError) throw practiceError;

      // Fetch from meeting_schedules table (after you create it)
      const { data: meetings, error: meetingError } = await supabase
        .from('meeting_schedules')
        .select('*')
        .eq('team_id', teamId)
        .order('start_time', { ascending: true });

      if (meetingError && meetingError.code !== '42P01') { // Ignore table doesn't exist error for now
        console.warn('Meeting schedules error:', meetingError);
      }

      // Fetch from game_schedules table (if exists)
      const { data: games, error: gameError } = await supabase
        .from('game_schedules')
        .select('*')
        .eq('team_id', teamId)
        .order('start_time', { ascending: true });

      if (gameError && gameError.code !== '42P01') {
        console.warn('Game schedules error:', gameError);
      }

      // Combine all schedules
      const combinedSchedules: CombinedSchedule[] = [];

      // Add practices
      if (practices) {
        practices.forEach(practice => {
          combinedSchedules.push({
            id: practice.id,
            type: 'practice',
            title: practice.title,
            description: practice.description,
            start_time: practice.start_time,
            end_time: practice.end_time,
            location: practice.location,
            originalData: practice
          });
        });
      }

      // Add meetings
      if (meetings) {
        meetings.forEach(meeting => {
          combinedSchedules.push({
            id: meeting.id,
            type: 'meeting',
            title: meeting.title,
            description: meeting.description,
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            location: meeting.location,
            subtype: meeting.meeting_type,
            originalData: meeting
          });
        });
      }

      // Add games
      if (games) {
        games.forEach(game => {
          combinedSchedules.push({
            id: game.id,
            type: 'game',
            title: game.title,
            description: game.description,
            start_time: game.start_time,
            end_time: game.end_time,
            location: game.location,
            originalData: game
          });
        });
      }

      // Sort all schedules by start time
      combinedSchedules.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      setSchedules(combinedSchedules);
      
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPractice = (practiceId: string) => {
    setSelectedPracticeId(practiceId);
    // Navigate to edit practice page with the practice ID
    router.push(`/coach/schedules/edit-practice?id=${practiceId}`);
  };

  const handleEditMeeting = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    // Navigate to edit meeting page with the meeting ID
    router.push(`/coach/schedules/edit-meeting?id=${meetingId}`);
  };

  const handleDeleteSchedule = async (scheduleId: string, scheduleType: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      let error = null;

      // Delete from correct table based on type
      switch (scheduleType) {
        case 'practice':
          ({ error } = await supabase
            .from('practice_schedules')
            .delete()
            .eq('id', scheduleId));
          break;
        case 'meeting':
          ({ error } = await supabase
            .from('meeting_schedules')
            .delete()
            .eq('id', scheduleId));
          break;
        default:
          alert('Cannot delete this type of schedule.');
          return;
      }

      if (error) throw error;

      // Refresh the list
      if (coachTeamId) {
        await fetchAllSchedules(coachTeamId);
      }
      
      alert('Schedule deleted successfully!');
      
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert('Failed to delete schedule. Please try again.');
    }
  };

  const getScheduleIcon = (type: string, subtype?: string) => {
    switch (type) {
      case 'practice':
        return <Target className="w-4 h-4" />;
      case 'game':
        return <Shield className="w-4 h-4" />;
      case 'meeting':
        switch (subtype) {
          case 'parent_meeting':
            return <Users className="w-4 h-4" />;
          case 'coach_meeting':
            return <Briefcase className="w-4 h-4" />;
          default:
            return <Users className="w-4 h-4" />;
        }
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getScheduleColor = (type: string) => {
    switch (type) {
      case 'practice':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'game':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'meeting':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getScheduleTypeLabel = (type: string, subtype?: string) => {
    switch (type) {
      case 'practice':
        return 'Practice';
      case 'game':
        return 'Game';
      case 'meeting':
        switch (subtype) {
          case 'team_meeting':
            return 'Team Meeting';
          case 'parent_meeting':
            return 'Parent Meeting';
          case 'coach_meeting':
            return 'Coach Meeting';
          default:
            return 'Meeting';
        }
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Filter schedules
  const filteredSchedules = schedules.filter(schedule => {
    // Apply type filter
    if (filter !== 'all' && schedule.type !== filter) {
      return false;
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        schedule.title.toLowerCase().includes(searchLower) ||
        (schedule.description?.toLowerCase().includes(searchLower) || false) ||
        (schedule.location?.toLowerCase().includes(searchLower) || false)
      );
    }
    
    return true;
  });

  // Group schedules by date
  const groupedSchedules = filteredSchedules.reduce((groups, schedule) => {
    const date = new Date(schedule.start_time).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(schedule);
    return groups;
  }, {} as Record<string, CombinedSchedule[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedSchedules).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading schedules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Error</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <button
              onClick={fetchCoachData}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Schedules</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage schedules for {teamName || 'your team'}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link
              href="/coach/schedules/create-practice"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Target className="w-4 h-4" />
              Add Practice
            </Link>
            <Link
              href="/coach/schedules/create-meeting"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              Add Meeting
            </Link>
          </div>
        </div>

        {/* Team Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-medium">
                  {teamName?.charAt(0) || 'T'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{teamName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {schedules.length} total schedules
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                {schedules.filter(s => s.type === 'practice').length} Practices
              </div>
              <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                {schedules.filter(s => s.type === 'game').length} Games
              </div>
              <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                {schedules.filter(s => s.type === 'meeting').length} Meetings
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search schedules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilter('practice')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'practice' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              Practice
            </button>
            <button
              onClick={() => setFilter('game')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'game' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              Games
            </button>
            <button
              onClick={() => setFilter('meeting')}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === 'meeting' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              Meetings
            </button>
          </div>
        </div>
      </div>

      {/* Schedules List */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No schedules found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm || filter !== 'all' 
              ? 'No schedules match your search criteria.' 
              : 'No schedules have been created yet.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/coach/schedules/create-practice"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Target className="w-4 h-4" />
              Create Practice
            </Link>
            <Link
              href="/coach/schedules/create-meeting"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              Create Meeting
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {/* Date Header */}
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDate(date)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {groupedSchedules[date].length} event{groupedSchedules[date].length !== 1 ? 's' : ''}
                </p>
              </div>
              
              {/* Events List */}
              <div className="divide-y dark:divide-gray-700">
                {groupedSchedules[date].map((schedule) => {
                  const isGame = schedule.type === 'game';
                  const canEdit = schedule.type !== 'game'; // Can't edit games
                  
                  return (
                    <div key={schedule.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScheduleColor(schedule.type)}`}>
                              <div className="flex items-center gap-2">
                                {getScheduleIcon(schedule.type, schedule.subtype)}
                                {getScheduleTypeLabel(schedule.type, schedule.subtype)}
                              </div>
                            </div>
                            {isGame && (
                              <div className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 rounded-full">
                                <Shield className="w-3 h-3" />
                                <span>Admin Created</span>
                              </div>
                            )}
                          </div>
                          
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {schedule.title}
                          </h4>
                          
                          <div className="space-y-2 text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{formatDateTime(schedule.start_time)}</span>
                              {schedule.end_time && (
                                <>
                                  <span>to</span>
                                  <span>{formatTime(schedule.end_time)}</span>
                                </>
                              )}
                            </div>
                            
                            {schedule.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{schedule.location}</span>
                              </div>
                            )}
                            
                            {schedule.description && (
                              <p className="mt-3 text-gray-700 dark:text-gray-300">
                                {schedule.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/coach/schedules/${schedule.type}/${schedule.id}`}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          
                          {canEdit ? (
                            <>
                              <button
                                onClick={() => {
                                  if (schedule.type === 'practice') {
                                    handleEditPractice(schedule.id);
                                  } else if (schedule.type === 'meeting') {
                                    handleEditMeeting(schedule.id);
                                  }
                                }}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id, schedule.type)}
                                className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          ) : isGame ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 italic">
                              View Only
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Stats */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {schedules.filter(s => s.type === 'practice').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Practice Sessions</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You can edit/delete</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {schedules.filter(s => s.type === 'game').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Games</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">View only (Admin created)</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {schedules.filter(s => s.type === 'meeting').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Meetings</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You can edit/delete</p>
          </div>
        </div>
      </div>
    </div>
  );
}