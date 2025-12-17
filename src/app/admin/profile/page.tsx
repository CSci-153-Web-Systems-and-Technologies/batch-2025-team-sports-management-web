'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import Link from 'next/link';

interface AdminProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone_number: string | null;
  role: string;
  created_at: string;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user from Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Auth error:', authError);
        router.push('/login');
        return;
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        
        // Check if profile doesn't exist
        if (profileError.code === 'PGRST116') {
          // Profile doesn't exist - create one
          await createDefaultProfile(authUser);
          // Retry fetching
          await fetchProfile();
          return;
        }
        
        setError('Failed to load profile');
        return;
      }

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultProfile = async (authUser: any) => {
    try {
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authUser.id,
          email: authUser.email,
          first_name: authUser.email?.split('@')[0] || 'Admin',
          role: 'admin',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating profile:', insertError);
        setError('Failed to create profile');
      }
    } catch (error) {
      console.error('Error creating default profile:', error);
    }
  };

  const getDisplayName = () => {
    if (!profile) return 'Administrator';
    if (profile.full_name) return profile.full_name;
    if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`;
    if (profile.first_name) return profile.first_name;
    if (profile.email) return profile.email.split('@')[0];
    return 'Admin';
  };

  const getAdminStats = async () => {
    try {
      const [
        { count: usersCount },
        { count: playersCount },
        { count: coachesCount },
        { count: teamsCount }
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'player'),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'coach'),
        supabase.from('teams').select('*', { count: 'exact', head: true })
      ]);

      return {
        totalUsers: usersCount || 0,
        totalPlayers: playersCount || 0,
        totalCoaches: coachesCount || 0,
        totalTeams: teamsCount || 0
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        totalUsers: 0,
        totalPlayers: 0,
        totalCoaches: 0,
        totalTeams: 0
      };
    }
  };

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPlayers: 0,
    totalCoaches: 0,
    totalTeams: 0
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      getAdminStats().then(setStats);
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Profile Error</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'Profile not found. Please contact support or try again.'}
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => fetchProfile()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Administrator Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your admin account and system overview</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {getDisplayName().charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{getDisplayName()}</h2>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-1 bg-white/20 text-white text-sm rounded-full">
                          System Administrator
                        </span>
                        <span className="px-2 py-1 bg-white/20 text-white text-sm rounded-full">
                          Full Access
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/admin/profile/edit"
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  >
                    Edit Profile
                  </Link>
                </div>
              </div>

              {/* Profile Details */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                        <p className="text-gray-900 dark:text-white">{getDisplayName()}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email Address</label>
                        <p className="text-gray-900 dark:text-white">{profile.email || 'Not set'}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</label>
                        <p className="text-gray-900 dark:text-white">{profile.phone_number || 'Not set'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Account Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Administrator Role</label>
                        <p className="text-gray-900 dark:text-white capitalize">{profile.role || 'Admin'}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Created</label>
                        <p className="text-gray-900 dark:text-white">
                          {profile.created_at 
                            ? new Date(profile.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : 'N/A'
                          }
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</label>
                        <p className="text-gray-900 dark:text-white text-sm font-mono truncate">{profile.user_id || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Permissions */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Permissions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <div className="text-sm font-medium text-green-800 dark:text-green-300">User Management</div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">Full Access</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 dark:text-blue-300">Team Management</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">Full Access</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="text-sm font-medium text-purple-800 dark:text-purple-300">System Settings</div>
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">Full Access</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Analytics</div>
                      <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400 mt-1">Full Access</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back to Dashboard
              </button>
              <Link
                href="/admin/profile/edit"
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Right Column - System Overview */}
          <div className="space-y-6">
            {/* System Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Overview</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Users</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</div>
                  </div>
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-10a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Players</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPlayers}</div>
                  </div>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Coaches</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCoaches}</div>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Teams</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTeams}</div>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <Link
                  href="/admin/users"
                  className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-10a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Manage Users</span>
                </Link>
                
                <Link
                  href="/admin/teams"
                  className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Manage Teams</span>
                </Link>
                
                <Link
                  href="/admin/settings"
                  className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">System Settings</span>
                </Link>
                
                <Link
                  href="/admin/announcements"
                  className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">Manage Announcements</span>
                </Link>
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Account Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs rounded-full">
                    Active
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Last Login</span>
                  <span className="text-gray-900 dark:text-white">
                    {profile.created_at 
                      ? new Date(profile.created_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Security Level</span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs rounded-full">
                    Administrator
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}