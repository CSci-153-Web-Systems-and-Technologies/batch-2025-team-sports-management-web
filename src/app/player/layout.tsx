import { ThemeProvider } from '@/contexts/ThemeContext';
import Navigation from '@/components/Navigation';
import '../globals.css';

export const metadata = {
  title: 'Player Dashboard - Sports Management',
  description: 'Player dashboard for sports management system',
};

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <html lang="en">
        <body>
          <Navigation />
          <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {children}
          </main>
        </body>
      </html>
    </ThemeProvider>
  );
}