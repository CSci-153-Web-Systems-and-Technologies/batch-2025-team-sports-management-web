'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Install framer-motion: npm install framer-motion

export default function HomePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.role === 'admin') router.push('/admin/dashboard');
      else if (profile?.role === 'coach') router.push('/coach/dashboard');
      else if (profile?.role === 'player') router.push('/player/dashboard');
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg"></div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              SportSync
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/auth/signin" className="text-primary hover:text-primary/80 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signup" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Streamline Your{' '}
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Sports Management
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            A modern platform for teams, coaches, and administrators to coordinate schedules, manage rosters, and communicate effectively.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
            >
              Start Free Trial
            </Link>
            <Link
              href="/demo"
              className="border border-input bg-background px-8 py-4 rounded-xl font-semibold hover:bg-accent transition-all"
            >
              Watch Demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-card border rounded-2xl p-8 hover:shadow-xl transition-shadow"
          >
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white">👑</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3">Admin Dashboard</h3>
            <p className="text-muted-foreground mb-4">
              Complete control over teams, schedules, and user management with advanced analytics.
            </p>
            <ul className="space-y-2">
              {['User role management', 'Game scheduling', 'System analytics', 'Team oversight'].map((item) => (
                <li key={item} className="flex items-center text-sm">
                  <span className="text-primary mr-2">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-card border rounded-2xl p-8 hover:shadow-xl transition-shadow"
          >
            <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white">📋</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3">Coach Tools</h3>
            <p className="text-muted-foreground mb-4">
              Everything coaches need to manage practices, players, and team communication.
            </p>
            <ul className="space-y-2">
              {['Practice scheduling', 'Player management', 'Team announcements', 'Performance tracking'].map((item) => (
                <li key={item} className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-card border rounded-2xl p-8 hover:shadow-xl transition-shadow"
          >
            <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white">⚽</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3">Player Portal</h3>
            <p className="text-muted-foreground mb-4">
              Easy access to schedules, announcements, and team information for all players.
            </p>
            <ul className="space-y-2">
              {['Game schedules', 'Team announcements', 'Roster viewing', 'Personal dashboard'].map((item) => (
                <li key={item} className="flex items-center text-sm">
                  <span className="text-blue-500 mr-2">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-primary to-purple-600 rounded-3xl p-12 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Sports Management?</h2>
          <p className="text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join hundreds of teams already using SportSync to streamline their operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-white text-primary px-8 py-4 rounded-xl font-semibold hover:bg-white/90 transition-all hover:scale-105"
            >
              Get Started Free
            </Link>
            <Link
              href="/contact"
              className="bg-transparent border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all"
            >
              Schedule a Demo
            </Link>
          </div>
          <p className="text-sm text-primary-foreground/70 mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-br from-primary to-purple-600 rounded"></div>
              <span className="font-bold">SportSync</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 SportSync. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}