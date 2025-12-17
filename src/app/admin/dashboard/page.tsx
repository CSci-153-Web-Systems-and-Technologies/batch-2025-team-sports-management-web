'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { UserProfile, Team, Announcement, Schedule } from '@/types';
import Link from 'next/link';

// Define a type for the user map
interface UserMap {
  [key: string]: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCoaches: 0,
    totalPlayers: 0,
    totalTeams: 0,
    totalAnnouncements: 0,
    upcomingEvents: 0
  });
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch stats - Total Users now excludes admins
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin');

      const { count: totalCoaches } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'coach');

      const { count: totalPlayers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'player');

      const { count: totalTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });

      const { count: totalAnnouncements } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true });

      const { count: upcomingEvents } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', new Date().toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        totalCoaches: totalCoaches || 0,
        totalPlayers: totalPlayers || 0,
        totalTeams: totalTeams || 0,
        totalAnnouncements: totalAnnouncements || 0,
        upcomingEvents: upcomingEvents || 0
      });

      // Fetch recent users (excluding admins)
      const { data: users } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false })
        .limit(5);

      if (users) setRecentUsers(users);

      // Fetch recent announcements - SIMPLIFIED query
      const { data: announcements } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (announcements) {
        // Get user IDs from announcements
        const userIds = announcements.map(ann => ann.user_id).filter(id => id);
        let userMap: UserMap = {};
        
        if (userIds.length > 0) {
          // Fetch user profiles for these IDs
          const { data: users } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);
          
          if (users) {
            userMap = users.reduce((map: UserMap, user) => {
              map[user.id] = {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name
              };
              return map;
            }, {});
          }
        }

        // Transform the data
        const formattedAnnouncements = announcements.map(ann => {
          const user = userMap[ann.user_id];
          return {
            ...ann,
            author: user ? {
              first_name: user.first_name || 'User',
              last_name: user.last_name || ''
            } : { first_name: 'Unknown', last_name: 'User' }
          };
        });
        
        setRecentAnnouncements(formattedAnnouncements as Announcement[]);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'coach': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'player': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        Admin Dashboard
      </h1>

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 dark:from-blue-700 dark:to-purple-800 rounded-xl shadow-lg p-6 mb-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome, Administrator!</h2>
        <p className="opacity-90">Manage teams, schedules, announcements, and user roles from this dashboard.</p>
      </div>

      {/* Stats Grid - UPDATED LINKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Users - Now links to /admin/users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0c-.966.65-1.931 1-2.5 1s-1.534-.35-2.5-1m-10 0c-.966.65-1.931 1-2.5 1s-1.534-.35-2.5-1" />
              </svg>
            </div>
          </div>
          <Link href="/admin/users" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm">
            View All Users →
          </Link>
        </div>

        {/* Coaches - Now links to /admin/coaches */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Coaches</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCoaches}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <Link href="/admin/coaches" className="mt-4 inline-block text-green-600 dark:text-green-400 hover:underline text-sm">
            View All Coaches →
          </Link>
        </div>

        {/* Teams - Links to teams management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Teams</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTeams}</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <Link href="/admin/teams" className="mt-4 inline-block text-yellow-600 dark:text-yellow-400 hover:underline text-sm">
            Manage Teams →
          </Link>
        </div>

        {/* Players - Now links to /admin/players */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Players</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPlayers}</p>
            </div>
            <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <Link href="/admin/players" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
            View All Players →
          </Link>
        </div>

        {/* Announcements - Links to announcements management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Announcements</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAnnouncements}</p>
            </div>
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
              <svg className="w-6 h-6 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
          </div>
          <Link href="/admin/announcements" className="mt-4 inline-block text-red-600 dark:text-red-400 hover:underline text-sm">
            Manage Announcements →
          </Link>
        </div>

        {/* Upcoming Events - Links to schedules management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Events</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.upcomingEvents}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <Link href="/admin/schedules" className="mt-4 inline-block text-purple-600 dark:text-purple-400 hover:underline text-sm">
            Manage Schedules →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users - Now links to /admin/users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Users</h2>
            <Link href="/admin/users" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
              View All Users
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {user.first_name} {user.last_name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <Link
                    href={user.role === 'coach' ? '/admin/coaches' : user.role === 'player' ? '/admin/players' : '/admin/users'}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No recent users
              </div>
            )}
          </div>
        </div>

        {/* Recent Announcements - FIXED */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Announcements</h2>
            <Link href="/admin/announcements" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentAnnouncements.length > 0 ? (
              recentAnnouncements.map((announcement) => (
                <div key={announcement.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {announcement.content}
                  </p>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>By {announcement.author?.first_name} {announcement.author?.last_name}</span>
                    <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No announcements yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/users/create"
            className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="font-medium text-gray-900 dark:text-white">Add User</span>
          </Link>
          
          <Link
            href="/admin/teams/create"
            className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
          >
            <svg className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium text-gray-900 dark:text-white">Create Team</span>
          </Link>
          
          <Link
            href="/admin/announcements/create"
            className="flex flex-col items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
          >
            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span className="font-medium text-gray-900 dark:text-white">Post Announcement</span>
          </Link>
          
          <Link
            href="/admin/schedules/create"
            className="flex flex-col items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
          >
            <svg className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-gray-900 dark:text-white">Schedule Event</span>
          </Link>
        </div>
      </div>
    </div>
  );
}