import './globals.css';
import { Inter } from 'next/font/google';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Sports Management System',
  description: 'Team sports management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-gray-100">
        <Providers>
          {/* NO Navigation here - let nested layouts handle it */}
          {children}
        </Providers>
      </body>
    </html>
  );
}