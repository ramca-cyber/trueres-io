import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToolNav } from './ToolNav';
import { BrowserCompatBanner } from '@/components/shared/BrowserCompatBanner';
import { MiniPlayer } from '@/components/shared/MiniPlayer';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>

      <BrowserCompatBanner />
      <Header />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 border-r border-border bg-card shrink-0" aria-label="Tool navigation">
          <ToolNav />
        </aside>
        {/* Main content */}
        <main id="main-content" className="flex-1 min-w-0" role="main">
          {children}
        </main>
      </div>
      <Footer />
      <MiniPlayer />
    </div>
  );
}
