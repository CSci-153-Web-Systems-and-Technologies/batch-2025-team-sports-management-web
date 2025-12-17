// app/coach/schedules/[id]/edit/page.tsx - UPDATED (Block Game Editing)
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { ArrowLeft, Shield } from 'lucide-react';

type Schedule = {
  id: string;
  title: string;
  description: string | null;
  schedule_type: 'practice' | 'game' | 'meeting' | 'other';
  start_time: string;
  end_time: string | null;
  location: string | null;
  team_id: string;
};

export default function EditSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGame, setIsGame] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    schedule_type: 'practice',
    practice_date: '',
    practice_time: '',
    duration: '60',
    location: ''
  });

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
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setError('Coach profile not found.');
        setLoading(false);
        return;
      }

      // Fetch schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (scheduleError) throw scheduleError;

      if (!schedule) {
        setError('Schedule not found.');
        setLoading(false);
        return;
      }

      // Check if schedule belongs to coach's team
      if (schedule.team_id !== profile.team_id) {
        setError('You do not have permission to edit this schedule.');
        setLoading(false);
        return;
      }

      // Check if schedule is a game
      if (schedule.schedule_type === 'game') {
        setIsGame(true);
        setError('Game schedules cannot be edited. Game schedules are managed by administrators.');
        setLoading(false);
        return;
      }

      // Parse date and time from start_time
      const startDate = new Date(schedule.start_time);
      const practice_date = startDate.toISOString().split('T')[0];
      const practice_time = startDate.toTimeString().slice(0, 5);
      
      // Calculate duration in minutes
      let duration = '60';
      if (schedule.end_time) {
        const endDate = new Date(schedule.end_time);
        const durationMs = endDate.getTime() - startDate.getTime();
        duration = Math.round(durationMs / 60000).toString();
      }

      setFormData({
        title: schedule.title || '',
        description: schedule.description || '',
        schedule_type: schedule.schedule_type,
        practice_date,
        practice_time,
        duration,
        location: schedule.location || ''
      });
      
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setError('Failed to load schedule details.');
    } finally {
      setLoading(false);
    }
  };

  // If it's a game schedule, show error message
  if (isGame) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Game Schedule - Admin Managed
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md">
                Game schedules cannot be edited by coaches. Game schedules are created and managed by administrators only.
              </p>
              
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  href={`/coach/schedules/${scheduleId}`}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Schedule
                </Link>
                <Link
                  href="/coach/schedules"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  View All Schedules
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!formData.practice_date || !formData.practice_time) {
      setError('Date and time are required');
      return;
    }
    
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      setError('Duration must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get coach profile to verify team
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('Coach profile not found');
      }

      // Combine date and time
      const startDateTime = new Date(`${formData.practice_date}T${formData.practice_time}`);
      const durationMinutes = parseInt(formData.duration);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          schedule_type: formData.schedule_type,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: formData.location.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId)
        .eq('team_id', profile.team_id);

      if (updateError) throw updateError;

      // Redirect to schedule detail page
      router.push(`/coach/schedules/${scheduleId}`);
      router.refresh();
      
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError('Failed to update schedule. Please try again.');
    } finally {
      setSubmitting(false);
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

  if (error && !isGame) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Error</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <Link
              href={`/coach/schedules/${scheduleId}`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Schedule
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/coach/schedules/${scheduleId}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Schedule
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Edit Schedule
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Update the schedule details below.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Practice Session, Team Meeting"
                required
              />
            </div>

            {/* Schedule Type - Coaches can't create games */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Type *
              </label>
              <select
                name="schedule_type"
                value={formData.schedule_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="practice">Practice</option>
                <option value="meeting">Meeting</option>
                <option value="other">Other</option>
              </select>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Note: Game schedules can only be created and edited by administrators.
              </p>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  name="practice_date"
                  value={formData.practice_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  name="practice_time"
                  value={formData.practice_time}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration (minutes) *
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
                <option value="150">2.5 hours</option>
                <option value="180">3 hours</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Main Field, Gymnasium, Meeting Room"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Add any additional details, notes, or instructions for this event..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t dark:border-gray-700">
              <Link
                href={`/coach/schedules/${scheduleId}`}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={submitting}
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Updating...' : 'Update Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}