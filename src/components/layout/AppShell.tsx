import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToolNav } from './ToolNav';
import { BrowserCompatBanner } from '@/components/shared/BrowserCompatBanner';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <BrowserCompatBanner />
      <Header />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 border-r border-border bg-card shrink-0">
          <ToolNav />
        </aside>
        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
