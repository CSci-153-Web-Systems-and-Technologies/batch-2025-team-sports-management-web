// app/coach/layout.tsx
import { ThemeProvider } from '@/contexts/ThemeContext';
import Navigation from '@/components/Navigation';
import '../globals.css';

export const metadata = {
  title: 'Coach Dashboard - Sports Management',
  description: 'Coach management dashboard',
};

export default function CoachLayout({
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