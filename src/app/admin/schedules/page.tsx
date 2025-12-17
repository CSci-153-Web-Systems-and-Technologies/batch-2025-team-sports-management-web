'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Filter, 
  Search, 
  Edit, 
  Trash2,
  RefreshCw,
  Gamepad2
} from 'lucide-react';

interface GameSchedule {
  id: string;
  title: string;
  description: string | null;
  schedule_type: string;
  team1_id: string | null;
  team2_id: string | null;
  start_time: string;
  end_time: string;
  location: string;
  created_at: string;
  created_by: string | null;
  team1: {
    id: string;
    name: string;
    sport_type: string;
  } | null;
  team2: {
    id: string;
    name: string;
    sport_type: string;
  } | null;
  created_by_user: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<GameSchedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<GameSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [teams, setTeams] = useState<{id: string, name: string}[]>([]);
  
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterSchedules();
  }, [schedules, searchTerm, filterTeam, filterType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all teams first
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch schedules with team1, team2, and creator info
      const { data: schedulesData, error } = await supabase
        .from('schedules')
        .select(`
          *,
          team1:teams!schedules_team1_id_fkey(id, name, sport_type),
          team2:teams!schedules_team2_id_fkey(id, name, sport_type),
          created_by_user:user_profiles!schedules_created_by_fkey(first_name, last_name)
        `)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching schedules:', error);
        
        // If columns don't exist yet, fetch basic data
        if (error.message.includes('team1_id') || error.message.includes('team2_id')) {
          console.log('Team columns might not exist yet in schedules table.');
          
          // Fetch basic schedule data without team joins
          const { data: basicData, error: basicError } = await supabase
            .from('schedules')
            .select('*')
            .order('start_time', { ascending: true });
          
          if (basicError) throw basicError;
          
          // Map to include null team data
          const mappedData = basicData?.map(schedule => ({
            ...schedule,
            team1: null,
            team2: null,
            team1_id: null,
            team2_id: null,
            created_by_user: null
          })) || [];
          
          setSchedules(mappedData);
          setFilteredSchedules(mappedData);
          setMessage({ 
            type: 'error', 
            text: 'Please add team1_id and team2_id columns to your schedules table in Supabase.' 
          });
          return;
        }
        throw error;
      }
      
      setSchedules(schedulesData || []);
      setFilteredSchedules(schedulesData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const filterSchedules = () => {
    let filtered = [...schedules];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(schedule => {
        const titleMatch = schedule.title?.toLowerCase().includes(searchLower);
        const locationMatch = schedule.location?.toLowerCase().includes(searchLower);
        const descriptionMatch = schedule.description?.toLowerCase().includes(searchLower);
        const team1Match = schedule.team1?.name?.toLowerCase().includes(searchLower);
        const team2Match = schedule.team2?.name?.toLowerCase().includes(searchLower);
        
        return titleMatch || locationMatch || descriptionMatch || team1Match || team2Match;
      });
    }

    // Apply team filter
    if (filterTeam !== 'all') {
      filtered = filtered.filter(schedule => 
        schedule.team1_id === filterTeam || 
        schedule.team2_id === filterTeam
      );
    }

    // Apply time filter
    const now = new Date();
    if (filterType === 'upcoming') {
      filtered = filtered.filter(schedule => new Date(schedule.start_time) >= now);
    } else if (filterType === 'past') {
      filtered = filtered.filter(schedule => new Date(schedule.start_time) < now);
    }

    setFilteredSchedules(filtered);
  };

  const deleteSchedule = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Schedule deleted successfully' });
      fetchData();

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameTitle = (schedule: GameSchedule) => {
    if (schedule.title) return schedule.title;
    
    // Generate title from team names
    if (schedule.team1 && schedule.team2) {
      return `${schedule.team1.name} vs ${schedule.team2.name}`;
    } else if (schedule.team1) {
      return `${schedule.team1.name} Game`;
    } else if (schedule.team2) {
      return `${schedule.team2.name} Game`;
    }
    
    return 'Game Schedule';
  };

  const getStatusColor = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now < start) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (now >= start && now <= end) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getStatusText = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now < start) return 'Upcoming';
    if (now >= start && now <= end) return 'Live';
    return 'Completed';
  };

  const getTeamStats = () => {
    const stats: Record<string, { total: number; upcoming: number; past: number }> = {};
    
    const now = new Date();
    
    schedules.forEach(schedule => {
      // Count team1
      if (schedule.team1) {
        const teamName = schedule.team1.name;
        if (!stats[teamName]) {
          stats[teamName] = { total: 0, upcoming: 0, past: 0 };
        }
        
        stats[teamName].total++;
        const isUpcoming = new Date(schedule.start_time) > now;
        if (isUpcoming) {
          stats[teamName].upcoming++;
        } else {
          stats[teamName].past++;
        }
      }
      
      // Count team2
      if (schedule.team2) {
        const teamName = schedule.team2.name;
        if (!stats[teamName]) {
          stats[teamName] = { total: 0, upcoming: 0, past: 0 };
        }
        
        stats[teamName].total++;
        const isUpcoming = new Date(schedule.start_time) > now;
        if (isUpcoming) {
          stats[teamName].upcoming++;
        } else {
          stats[teamName].past++;
        }
      }
    });
    
    return stats;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading schedules...</p>
        </div>
      </div>
    );
  }

  const teamStats = getTeamStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Game Schedules
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage and view all scheduled games
                </p>
              </div>
            </div>
            
            <Link
              href="/admin/schedules/create"
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all hover:shadow-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              Schedule New Game
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Games</p>
                <p className="text-2xl font-bold mt-1">{schedules.length}</p>
              </div>
              <Gamepad2 className="w-8 h-8 opacity-90" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Upcoming</p>
                <p className="text-2xl font-bold mt-1">
                  {schedules.filter(s => new Date(s.start_time) > new Date()).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 opacity-90" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">This Month</p>
                <p className="text-2xl font-bold mt-1">
                  {schedules.filter(s => {
                    const date = new Date(s.start_time);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <Clock className="w-8 h-8 opacity-90" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Teams</p>
                <p className="text-2xl font-bold mt-1">
                  {Object.keys(teamStats).length}
                </p>
              </div>
              <Users className="w-8 h-8 opacity-90" />
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border-l-4 ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-500 dark:border-green-500'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-500 dark:border-red-500'
          }`}>
            <div className="flex items-center justify-between">
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-sm hover:opacity-75 transition-opacity"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Team Stats */}
        {Object.keys(teamStats).length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Games by Team</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(teamStats).map(([teamName, stats]) => (
                <div key={teamName} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{teamName}</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">↑ {stats.upcoming}</span>
                    <span className="text-gray-500 dark:text-gray-400">↓ {stats.past}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-3.5">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search games by title, team, or location..."
                className="w-full pl-11 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white outline-none transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white outline-none min-w-[140px]"
                >
                  <option value="all">All Teams</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none">
                  <Users className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="appearance-none pl-4 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white outline-none min-w-[140px]"
                >
                  <option value="all">All Games</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past Games</option>
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none">
                  <Filter className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              
              <button
                onClick={fetchData}
                className="p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Schedules Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Scheduled Games ({filteredSchedules.length})
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredSchedules.length} of {schedules.length} games
                </p>
              </div>
            </div>
          </div>

          {/* Schedules List */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredSchedules.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {schedules.length === 0 ? 'No games scheduled yet' : 'No matching games found'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {schedules.length === 0 
                    ? 'Get started by scheduling your first game.' 
                    : 'Try adjusting your search or filter.'}
                </p>
                <Link
                  href="/admin/schedules/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Schedule First Game
                </Link>
              </div>
            ) : (
              filteredSchedules.map((schedule) => (
                <div 
                  key={schedule.id} 
                  className="p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white dark:hover:from-gray-800/50 dark:hover:to-gray-900/50 transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Date & Time */}
                    <div className="lg:w-48 flex-shrink-0">
                      <div className="text-center lg:text-left">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          {formatDate(schedule.start_time)}
                        </div>
                        <div className="flex items-center justify-center lg:justify-start gap-2 text-gray-900 dark:text-white">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">
                            {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.start_time, schedule.end_time)}`}>
                            {getStatusText(schedule.start_time, schedule.end_time)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Game Details */}
                    <div className="flex-1">
                      <div className="mb-3">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {getGameTitle(schedule)}
                          </h3>
                          {/* Show team badges */}
                          {schedule.team1 && schedule.team2 ? (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-300 rounded-full text-xs font-medium">
                                {schedule.team1.name}
                              </span>
                              <span className="text-gray-400">vs</span>
                              <span className="px-3 py-1 bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/30 dark:to-red-800/30 dark:text-red-300 rounded-full text-xs font-medium">
                                {schedule.team2.name}
                              </span>
                            </div>
                          ) : schedule.team1 ? (
                            <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-300 rounded-full text-xs font-medium">
                              {schedule.team1.name}
                            </span>
                          ) : schedule.team2 ? (
                            <span className="px-3 py-1 bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/30 dark:to-red-800/30 dark:text-red-300 rounded-full text-xs font-medium">
                              {schedule.team2.name}
                            </span>
                          ) : null}
                        </div>

                        {/* Location & Description */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {schedule.location}
                            </span>
                          </div>
                          
                          {schedule.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {schedule.description}
                            </p>
                          )}
                          
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Created by: {schedule.created_by_user?.first_name} {schedule.created_by_user?.last_name} • 
                            {' '}{formatDate(schedule.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 lg:w-32 lg:justify-end">
                      <button
                        onClick={() => router.push(`/admin/schedules/${schedule.id}/edit`)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hover:shadow-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSchedule(schedule.id, getGameTitle(schedule))}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all hover:shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {filteredSchedules.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredSchedules.length}</span> games
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>Upcoming: {schedules.filter(s => new Date(s.start_time) > new Date()).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span>Past: {schedules.filter(s => new Date(s.start_time) <= new Date()).length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}