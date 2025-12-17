import { ThemeProvider } from '@/contexts/ThemeContext';
import Navigation from '@/components/Navigation';
import '../globals.css';

export const metadata = {
  title: 'Admin Dashboard - Sports Management',
  description: 'Administrator management dashboard',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <Navigation />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
        {children}
      </main>
    </ThemeProvider>
  );
}