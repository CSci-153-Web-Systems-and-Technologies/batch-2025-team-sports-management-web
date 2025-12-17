'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

export default function EditPracticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    notes: '',
    practice_id: ''
  });
  const [practices, setPractices] = useState<any[]>([]);

  const supabase = createSupabaseBrowserClient();

  // Fetch user's practices
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

        // Fetch practices for selection
        const { data: practicesData, error } = await supabase
          .from('practice_schedules')
          .select('*')
          .eq('team_id', profile.team_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setPractices(practicesData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load practices');
      } finally {
        setFetching(false);
      }
    }

    fetchData();
  }, [router, supabase]);

  // Load practice data when selected
  const handlePracticeSelect = (practiceId: string) => {
    const selectedPractice = practices.find(p => p.id === practiceId);
    if (selectedPractice) {
      setFormData({
        title: selectedPractice.title || '',
        description: selectedPractice.description || '',
        start_time: selectedPractice.start_time ? new Date(selectedPractice.start_time).toISOString().slice(0, 16) : '',
        end_time: selectedPractice.end_time ? new Date(selectedPractice.end_time).toISOString().slice(0, 16) : '',
        location: selectedPractice.location || '',
        notes: selectedPractice.notes || '',
        practice_id: practiceId
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

      if (!formData.practice_id) {
        alert('Please select a practice to edit');
        setLoading(false);
        return;
      }

      // Update practice schedule
      const { error } = await supabase
        .from('practice_schedules')
        .update({
          title: formData.title,
          description: formData.description || null,
          start_time: formData.start_time,
          end_time: formData.end_time || null,
          location: formData.location || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.practice_id)
        .eq('team_id', profile.team_id);

      if (error) throw error;

      alert('Practice updated successfully!');
      router.push('/coach/schedules');
      
    } catch (error) {
      console.error('Error updating practice:', error);
      alert('Failed to update practice');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading practices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Practice</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Practice Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Practice to Edit *
              </label>
              <select
                required
                value={formData.practice_id}
                onChange={(e) => handlePracticeSelect(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Choose a practice...</option>
                {practices.map((practice) => (
                  <option key={practice.id} value={practice.id}>
                    {practice.title} - {new Date(practice.start_time).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select which practice you want to edit
              </p>
            </div>

            {/* Only show form if practice selected */}
            {formData.practice_id && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Practice Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="E.g., Evening Practice, Shooting Drills"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                    placeholder="Practice focus, objectives, etc."
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
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="E.g., Main Gym, Field A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={2}
                    placeholder="Equipment needed, special instructions, etc."
                  />
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
                disabled={loading || !formData.practice_id}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Practice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}