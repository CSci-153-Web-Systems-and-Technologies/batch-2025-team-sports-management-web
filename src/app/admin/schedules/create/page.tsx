'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Team } from '@/types';
import { Calendar, Clock, MapPin, Users, Gamepad2, ArrowLeft, Save } from 'lucide-react';

export default function CreateGameSchedulePage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [team1Id, setTeam1Id] = useState<string>('');
  const [team2Id, setTeam2Id] = useState<string>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate times
    if (new Date(startTime) >= new Date(endTime)) {
      setError('End time must be after start time');
      setLoading(false);
      return;
    }

    // Validate teams
    if (!team1Id || !team2Id) {
      setError('Please select both teams');
      setLoading(false);
      return;
    }

    if (team1Id === team2Id) {
      setError('Team 1 and Team 2 cannot be the same');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Get team names for title
      const team1 = teams.find(t => t.id === team1Id);
      const team2 = teams.find(t => t.id === team2Id);
      const gameTitle = team1 && team2 ? `${team1.name} vs ${team2.name}` : title;

      const { error: insertError } = await supabase
        .from('schedules')
        .insert({
          title: gameTitle,
          description: description || `Game between ${team1?.name} and ${team2?.name}`,
          schedule_type: 'game',
          team_id: team1Id, // Store first team as primary
          team2_id: team2Id, // Store second team
          start_time: startTime,
          end_time: endTime,
          location,
          created_by: profile.id
        });

      if (insertError) throw insertError;

      router.push('/admin/schedules');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const setDefaultTimes = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0); // 7:00 PM tomorrow
    
    const endTime = new Date(tomorrow);
    endTime.setHours(tomorrow.getHours() + 2); // 2 hours later
    
    setStartTime(formatDateTimeLocal(tomorrow));
    setEndTime(formatDateTimeLocal(endTime));
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Schedule New Game
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create a game schedule between two teams
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-sm hover:opacity-75"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Game Title (Optional)
              </label>
              <div className="relative">
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 pl-11 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all outline-none"
                  placeholder="e.g., Championship Final, League Match"
                />
                <Gamepad2 className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Leave empty to auto-generate from team names
              </p>
            </div>

            {/* Teams Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team 1 */}
              <div>
                <label htmlFor="team1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team 1 *
                  </div>
                </label>
                <div className="relative">
                  <select
                    id="team1"
                    required
                    value={team1Id}
                    onChange={(e) => setTeam1Id(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white appearance-none outline-none"
                  >
                    <option value="">Select Team 1...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.sport_type})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-3.5 pointer-events-none">
                    <div className="w-2 h-2 border-b-2 border-r-2 border-gray-400 rotate-45"></div>
                  </div>
                </div>
              </div>

              {/* Team 2 */}
              <div>
                <label htmlFor="team2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team 2 *
                  </div>
                </label>
                <div className="relative">
                  <select
                    id="team2"
                    required
                    value={team2Id}
                    onChange={(e) => setTeam2Id(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white appearance-none outline-none"
                  >
                    <option value="">Select Team 2...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.sport_type})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-3.5 pointer-events-none">
                    <div className="w-2 h-2 border-b-2 border-r-2 border-gray-400 rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Details */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Game Details (Optional)
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white outline-none transition-all"
                placeholder="Additional game details, notes, or information..."
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location *
                </div>
              </label>
              <div className="relative">
                <input
                  id="location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 pl-11 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all outline-none"
                  placeholder="e.g., Main Stadium, Field A, City Arena"
                />
                <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Time */}
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Game Start *
                  </div>
                </label>
                <div className="relative">
                  <input
                    id="startTime"
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 pl-11 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all outline-none"
                  />
                  <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* End Time */}
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Game End *
                  </div>
                </label>
                <div className="relative">
                  <input
                    id="endTime"
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 pl-11 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all outline-none"
                  />
                  <Clock className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={setDefaultTimes}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:shadow-sm font-medium"
              >
                Set Default Times
              </button>
              
              <div className="flex-1 flex gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:shadow-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Scheduling...' : 'Schedule Game'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}