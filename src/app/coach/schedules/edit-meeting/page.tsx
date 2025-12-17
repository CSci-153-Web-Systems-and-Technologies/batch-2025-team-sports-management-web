'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

export default function EditMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meeting_type: 'team_meeting',
    start_time: '',
    end_time: '',
    location: '',
    agenda: '',
    meeting_id: ''
  });
  const [meetings, setMeetings] = useState<any[]>([]);

  const supabase = createSupabaseBrowserClient();

  // Fetch user's meetings
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, team_id')
          .eq('user_id', user.id)
          .single();

        if (!profile || !profile.team_id) {
          alert('No team assigned');
          router.push('/coach/schedules');
          return;
        }

        // Fetch meetings for selection
        const { data: meetingsData, error } = await supabase
          .from('meeting_schedules')
          .select('*')
          .eq('team_id', profile.team_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setMeetings(meetingsData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load meetings');
      } finally {
        setFetching(false);
      }
    }

    fetchData();
  }, [router, supabase]);

  // Load meeting data when selected
  const handleMeetingSelect = (meetingId: string) => {
    const selectedMeeting = meetings.find(m => m.id === meetingId);
    if (selectedMeeting) {
      setFormData({
        title: selectedMeeting.title || '',
        description: selectedMeeting.description || '',
        meeting_type: selectedMeeting.meeting_type || 'team_meeting',
        start_time: selectedMeeting.start_time ? new Date(selectedMeeting.start_time).toISOString().slice(0, 16) : '',
        end_time: selectedMeeting.end_time ? new Date(selectedMeeting.end_time).toISOString().slice(0, 16) : '',
        location: selectedMeeting.location || '',
        agenda: selectedMeeting.agenda || '',
        meeting_id: meetingId
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, team_id')
        .eq('user_id', user.id)
        .single();

      if (!profile || !profile.team_id) {
        alert('No team assigned');
        return;
      }

      if (!formData.meeting_id) {
        alert('Please select a meeting to edit');
        setLoading(false);
        return;
      }

      // Update meeting schedule
      const { error } = await supabase
        .from('meeting_schedules')
        .update({
          title: formData.title,
          description: formData.description || null,
          meeting_type: formData.meeting_type,
          start_time: formData.start_time,
          end_time: formData.end_time || null,
          location: formData.location || null,
          agenda: formData.agenda || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.meeting_id)
        .eq('team_id', profile.team_id);

      if (error) throw error;

      alert('Meeting updated successfully!');
      router.push('/coach/schedules');
      
    } catch (error) {
      console.error('Error updating meeting:', error);
      alert('Failed to update meeting');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Meeting</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Meeting Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Meeting to Edit *
              </label>
              <select
                required
                value={formData.meeting_id}
                onChange={(e) => handleMeetingSelect(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Choose a meeting...</option>
                {meetings.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.title} - {new Date(meeting.start_time).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select which meeting you want to edit
              </p>
            </div>

            {/* Only show form if meeting selected */}
            {formData.meeting_id && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="E.g., Team Strategy Meeting"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Type *
                    </label>
                    <select
                      value={formData.meeting_type}
                      onChange={(e) => setFormData({...formData, meeting_type: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="team_meeting">Team Meeting</option>
                      <option value="parent_meeting">Parent Meeting</option>
                      <option value="coach_meeting">Coaches Meeting</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="E.g., Team Room, Virtual Meeting"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={2}
                    placeholder="Meeting purpose and overview"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Agenda
                  </label>
                  <textarea
                    value={formData.agenda}
                    onChange={(e) => setFormData({...formData, agenda: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={4}
                    placeholder="Meeting agenda points (one per line)"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Enter each agenda item on a new line
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.meeting_id}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Meeting'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}