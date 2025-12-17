'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { useTheme } from '@/contexts/ThemeContext';
import { UserProfile } from '@/types';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Navigation() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setMobileMenuOpen(false);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActiveLink = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  const getInitials = (profile: UserProfile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (profile.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    if (profile.email) {
      return profile.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'coach': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'player': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <nav className="bg-white dark:bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              <div className="hidden md:block">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main menu */}
          <div className="flex items-center">
            <Link 
              href={user?.role === 'admin' ? '/admin/dashboard' : 
                    user?.role === 'coach' ? '/coach/dashboard' :
                    user?.role === 'player' ? '/player/dashboard' : '/'} 
              className="text-xl font-bold text-gray-800 dark:text-white hover:opacity-90 transition-opacity"
            >
              SportsHub
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              {/* Admin Navigation */}
              {user?.role === 'admin' && (
                <>
                  <NavLink href="/admin/dashboard" active={isActiveLink('/admin/dashboard')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </NavLink>
                  <NavLink href="/admin/users" active={isActiveLink('/admin/users')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-10a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    Users
                  </NavLink>
                  <NavLink href="/admin/players" active={isActiveLink('/admin/players')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Players
                  </NavLink>
                  <NavLink href="/admin/coaches" active={isActiveLink('/admin/coaches')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Coaches
                  </NavLink>
                  <NavLink href="/admin/teams" active={isActiveLink('/admin/teams')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Teams
                  </NavLink>
                  <NavLink href="/admin/schedules" active={isActiveLink('/admin/schedules')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Games
                  </NavLink>
                  <NavLink href="/admin/announcements" active={isActiveLink('/admin/announcements')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    Announcements
                  </NavLink>
                </>
              )}

              {/* Coach Navigation */}
              {user?.role === 'coach' && (
                <>
                  <NavLink href="/coach/dashboard" active={isActiveLink('/coach/dashboard')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </NavLink>
                  
                  {/* SCHEDULE DROPDOWN */}
                  <div className="relative group">
                    <NavLink href="/coach/schedules" active={isActiveLink('/coach/schedules')}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule
                    </NavLink>
                    
                    {/* Dropdown for schedule actions */}
                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <Link
                          href="/coach/schedules/create-practice"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          New Practice
                        </Link>
                        <Link
                          href="/coach/schedules/create-meeting"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          New Meeting
                        </Link>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                        <Link
                          href="/coach/schedules/edit-practice"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Practice
                        </Link>
                        <Link
                          href="/coach/schedules/edit-meeting"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Meeting
                        </Link>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                        <Link
                          href="/coach/schedules"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          View All
                        </Link>
                      </div>
                    </div>
                  </div>
                  
                  <NavLink href="/coach/players" active={isActiveLink('/coach/players')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Players
                  </NavLink>
                  <NavLink href="/coach/announcements" active={isActiveLink('/coach/announcements')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    Announcements
                  </NavLink>
                </>
              )}

              {/* Player Navigation - UPDATED WITH CORRECT LINKS */}
              {user?.role === 'player' && (
                <>
                  <NavLink href="/player/dashboard" active={isActiveLink('/player/dashboard')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </NavLink>
                  <NavLink href="/player/teammates" active={isActiveLink('/player/teammates')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    My Teammates
                  </NavLink>
                  <NavLink href="/player/schedules" active={isActiveLink('/player/schedules')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Schedule
                  </NavLink>
                  <NavLink href="/player/announcements" active={isActiveLink('/player/announcements')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    Announcements
                  </NavLink>
                </>
              )}

              {/* Public Navigation (when not logged in) */}
              {!user && (
                <>
                  <NavLink href="/" active={pathname === '/'}>
                    Home
                  </NavLink>
                  <NavLink href="/announcements" active={isActiveLink('/announcements')}>
                    Announcements
                  </NavLink>
                  <NavLink href="/schedules" active={isActiveLink('/schedules')}>
                    Schedules
                  </NavLink>
                  <NavLink href="/teams" active={isActiveLink('/teams')}>
                    Teams
                  </NavLink>
                </>
              )}
            </div>
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
                "text-gray-700 dark:text-gray-300"
              )}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="hidden sm:flex items-center space-x-3">
                <div className="relative group">
                  <div className="flex items-center space-x-2 cursor-pointer p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-medium",
                      user.role === 'admin' ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300" :
                      user.role === 'coach' ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" :
                      "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                    )}>
                      {getInitials(user)}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user.first_name || user.email.split('@')[0]}
                      </div>
                      <div className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full capitalize inline-block",
                        getRoleBadgeColor(user.role || 'user')
                      )}>
                        {user.role || 'user'}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                      
                      {/* Admin Profile Links */}
                      {user.role === 'admin' && (
                        <>
                          <Link
                            href="/admin/profile"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Admin Profile
                          </Link>
                          <Link
                            href="/admin/profile/edit"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Edit Profile
                          </Link>
                        </>
                      )}
                      
                      {/* Coach Profile Links */}
                      {user.role === 'coach' && (
                        <>
                          <Link
                            href="/coach/profile"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            My Profile
                          </Link>
                          <Link
                            href="/coach/profile/edit"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Edit Profile
                          </Link>
                        </>
                      )}
                      
                      {/* Player Profile Links */}
                      {user.role === 'player' && (
                        <>
                          <Link
                            href="/player/profile"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Player Profile
                          </Link>
                          <Link
                            href="/player/profile/edit"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Edit Profile
                          </Link>
                        </>
                      )}
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-3">
                <Link
                  href="/auth/signin"
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white",
                    "hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    "bg-blue-600 text-white hover:bg-blue-700",
                    "dark:bg-blue-500 dark:hover:bg-blue-600"
                  )}
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                "sm:hidden p-2 rounded-md transition-colors",
                "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
                "dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
              )}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Mobile User Info */}
            {user && (
              <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium text-lg",
                    user.role === 'admin' ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300" :
                    user.role === 'coach' ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" :
                    "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                  )}>
                    {getInitials(user)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                    </div>
                    <div className={cn(
                      "text-xs px-2 py-0.5 rounded-full capitalize inline-block mt-1",
                      getRoleBadgeColor(user.role || 'user')
                    )}>
                      {user.role || 'user'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Navigation Links */}
            <div className="px-2 space-y-1">
              {/* Admin Mobile Links */}
              {user?.role === 'admin' && (
                <>
                  <MobileNavLink href="/admin/dashboard" active={isActiveLink('/admin/dashboard')} onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </MobileNavLink>
                  <MobileNavLink href="/admin/users" active={isActiveLink('/admin/users')} onClick={() => setMobileMenuOpen(false)}>
                    Users
                  </MobileNavLink>
                  <MobileNavLink href="/admin/players" active={isActiveLink('/admin/players')} onClick={() => setMobileMenuOpen(false)}>
                    Players
                  </MobileNavLink>
                  <MobileNavLink href="/admin/coaches" active={isActiveLink('/admin/coaches')} onClick={() => setMobileMenuOpen(false)}>
                    Coaches
                  </MobileNavLink>
                  <MobileNavLink href="/admin/teams" active={isActiveLink('/admin/teams')} onClick={() => setMobileMenuOpen(false)}>
                    Teams
                  </MobileNavLink>
                  <MobileNavLink href="/admin/schedules" active={isActiveLink('/admin/schedules')} onClick={() => setMobileMenuOpen(false)}>
                    Games
                  </MobileNavLink>
                  <MobileNavLink href="/admin/announcements" active={isActiveLink('/admin/announcements')} onClick={() => setMobileMenuOpen(false)}>
                    Announcements
                  </MobileNavLink>
                </>
              )}

              {/* Coach Mobile Links */}
              {user?.role === 'coach' && (
                <>
                  <MobileNavLink href="/coach/dashboard" active={isActiveLink('/coach/dashboard')} onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </MobileNavLink>
                  
                  {/* Schedule Actions in Mobile */}
                  <MobileNavLink href="/coach/schedules" active={isActiveLink('/coach/schedules')} onClick={() => setMobileMenuOpen(false)}>
                    View Schedule
                  </MobileNavLink>
                  <MobileNavLink href="/coach/schedules/create-practice" onClick={() => setMobileMenuOpen(false)}>
                    + New Practice
                  </MobileNavLink>
                  <MobileNavLink href="/coach/schedules/create-meeting" onClick={() => setMobileMenuOpen(false)}>
                    + New Meeting
                  </MobileNavLink>
                  <MobileNavLink href="/coach/schedules/edit-practice" onClick={() => setMobileMenuOpen(false)}>
                    Edit Practice
                  </MobileNavLink>
                  <MobileNavLink href="/coach/schedules/edit-meeting" onClick={() => setMobileMenuOpen(false)}>
                    Edit Meeting
                  </MobileNavLink>
                  
                  <MobileNavLink href="/coach/players" active={isActiveLink('/coach/players')} onClick={() => setMobileMenuOpen(false)}>
                    Players
                  </MobileNavLink>
                  <MobileNavLink href="/coach/announcements" active={isActiveLink('/coach/announcements')} onClick={() => setMobileMenuOpen(false)}>
                    Announcements
                  </MobileNavLink>
                </>
              )}

              {/* Player Mobile Links - UPDATED WITH CORRECT LINKS */}
              {user?.role === 'player' && (
                <>
                  <MobileNavLink href="/player/dashboard" active={isActiveLink('/player/dashboard')} onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </MobileNavLink>
                  <MobileNavLink href="/player/teammates" active={isActiveLink('/player/teammates')} onClick={() => setMobileMenuOpen(false)}>
                    My Teammates
                  </MobileNavLink>
                  <MobileNavLink href="/player/schedules" active={isActiveLink('/player/schedules')} onClick={() => setMobileMenuOpen(false)}>
                    Schedule
                  </MobileNavLink>
                  <MobileNavLink href="/player/announcements" active={isActiveLink('/player/announcements')} onClick={() => setMobileMenuOpen(false)}>
                    Announcements
                  </MobileNavLink>
                </>
              )}

              {/* Public Mobile Links */}
              {!user && (
                <>
                  <MobileNavLink href="/" active={pathname === '/'} onClick={() => setMobileMenuOpen(false)}>
                    Home
                  </MobileNavLink>
                  <MobileNavLink href="/announcements" active={isActiveLink('/announcements')} onClick={() => setMobileMenuOpen(false)}>
                    Announcements
                  </MobileNavLink>
                  <MobileNavLink href="/schedules" active={isActiveLink('/schedules')} onClick={() => setMobileMenuOpen(false)}>
                    Schedules
                  </MobileNavLink>
                  <MobileNavLink href="/teams" active={isActiveLink('/teams')} onClick={() => setMobileMenuOpen(false)}>
                    Teams
                  </MobileNavLink>
                </>
              )}

              {/* Profile Links for Mobile */}
              {user && (
                <>
                  {/* Admin Profile Links */}
                  {user.role === 'admin' && (
                    <>
                      <MobileNavLink href="/admin/profile" onClick={() => setMobileMenuOpen(false)}>
                        Admin Profile
                      </MobileNavLink>
                      <MobileNavLink href="/admin/profile/edit" onClick={() => setMobileMenuOpen(false)}>
                        Edit Profile
                      </MobileNavLink>
                    </>
                  )}
                  
                  {/* Coach Profile Links */}
                  {user.role === 'coach' && (
                    <>
                      <MobileNavLink href="/coach/profile" onClick={() => setMobileMenuOpen(false)}>
                        My Profile
                      </MobileNavLink>
                      <MobileNavLink href="/coach/profile/edit" onClick={() => setMobileMenuOpen(false)}>
                        Edit Profile
                      </MobileNavLink>
                    </>
                  )}
                  
                  {/* Player Profile Links */}
                  {user.role === 'player' && (
                    <>
                      <MobileNavLink href="/player/profile" onClick={() => setMobileMenuOpen(false)}>
                        Player Profile
                      </MobileNavLink>
                      <MobileNavLink href="/player/profile/edit" onClick={() => setMobileMenuOpen(false)}>
                        Edit Profile
                      </MobileNavLink>
                    </>
                  )}
                  
                  <button
                    onClick={handleSignOut}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors",
                      "text-red-600 hover:bg-red-50",
                      "dark:text-red-400 dark:hover:bg-red-900/20"
                    )}
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>

            {/* Mobile Auth Links (when not logged in) */}
            {!user && (
              <div className="px-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <MobileNavLink href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </MobileNavLink>
                <MobileNavLink href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                  Sign Up
                </MobileNavLink>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// Desktop NavLink component
interface NavLinkProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

function NavLink({ href, active, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-blue-600 text-white dark:bg-blue-500"
          : "text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
      )}
    >
      {children}
    </Link>
  );
}

// Mobile NavLink component
interface MobileNavLinkProps {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}

function MobileNavLink({ href, onClick, children, active = false }: MobileNavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "block px-3 py-2 rounded-md text-base font-medium transition-colors",
        active
          ? "bg-blue-600 text-white dark:bg-blue-500"
          : "text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
      )}
    >
      {children}
    </Link>
  );
}