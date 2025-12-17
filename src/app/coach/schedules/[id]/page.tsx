// app/coach/schedules/[id]/page.tsx - UPDATED (Block Game Editing)
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { Calendar, Clock, MapPin, Shield, Edit, Trash2, ArrowLeft, Lock } from 'lucide-react';

type Schedule = {
  id: string;
  title: string;
  description: string | null;
  schedule_type: 'practice' | 'game' | 'meeting' | 'other';
  start_time: string;
  end_time: string | null;
  location: string | null;
  created_at: string;
  team_id: string;
  created_by: string | null;
};

export default function ScheduleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;
  
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachTeamId, setCoachTeamId] = useState<string | null>(null);
  const [isGame, setIsGame] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchScheduleData();
  }, [scheduleId]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get coach profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('team_id, role')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setError('Coach profile not found.');
        setLoading(false);
        return;
      }

      setCoachTeamId(profile.team_id);

      // Fetch schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (scheduleError) throw scheduleError;

      if (!scheduleData) {
        setError('Schedule not found.');
        setLoading(false);
        return;
      }

      // Check if schedule belongs to coach's team
      if (scheduleData.team_id !== profile.team_id) {
        setError('You do not have permission to view this schedule.');
        setLoading(false);
        return;
      }

      setSchedule(scheduleData);
      
      // Check if schedule is a game
      const isGameSchedule = scheduleData.schedule_type === 'game';
      setIsGame(isGameSchedule);
      
      // Coaches can only edit non-game schedules
      setIsEditable(!isGameSchedule);
      
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setError('Failed to load schedule details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!schedule || !isEditable) {
      alert(isGame 
        ? 'You cannot delete game schedules. Game schedules are managed by administrators.' 
        : 'You do not have permission to delete this schedule.');
      return;
    }

    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', schedule.id);

      if (error) throw error;

      alert('Schedule deleted successfully!');
      router.push('/coach/schedules');
      router.refresh();
      
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert('Failed to delete schedule. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'practice': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'game': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'meeting': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading schedule details...</p>
        </div>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Error</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error || 'Schedule not found'}</p>
            <Link
              href="/coach/schedules"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Schedules
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/coach/schedules"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Schedules
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(schedule.schedule_type)}`}>
                  {schedule.schedule_type.charAt(0).toUpperCase() + schedule.schedule_type.slice(1)}
                </div>
                {isGame && (
                  <div className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 rounded-full">
                    <Shield className="w-3 h-3" />
                    <span>Admin Created</span>
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {schedule.title}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              {isEditable ? (
                <>
                  <Link
                    href={`/coach/schedules/${schedule.id}/edit`}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Schedule
                  </Link>
                  
                  <button
                    onClick={handleDeleteSchedule}
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              ) : isGame ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg">
                  <Lock className="w-4 h-4" />
                  <span>View Only</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Game Schedule Warning */}
        {isGame && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              </div>
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                  Game Schedule - Admin Managed
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  This game schedule was created by an administrator. Coaches can view game details 
                  but cannot edit or delete them. If you notice any issues with this game schedule, 
                  please contact the administrator.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Date and Time */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Date</h3>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-lg font-medium text-gray-900 dark:text-white">
                      {formatDate(schedule.start_time)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Time</h3>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        {formatTime(schedule.start_time)}
                      </span>
                      {schedule.end_time && (
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          to {formatTime(schedule.end_time)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Location */}
              <div className="space-y-4">
                {schedule.location && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Location</h3>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        {schedule.location}
                      </span>
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Status</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5"></div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      new Date(schedule.start_time) > new Date()
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                    }`}>
                      {new Date(schedule.start_time) > new Date() ? 'Upcoming' : 'Past Event'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Description */}
            {schedule.description && (
              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Description</h3>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {schedule.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Created Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isGame ? 'Admin created' : 'Created'} on {formatDateTime(schedule.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}