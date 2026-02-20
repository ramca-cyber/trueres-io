import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ToolNav } from './ToolNav';
import { searchTools } from '@/config/tool-registry';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  const searchResults = searchQuery.length >= 2 ? searchTools(searchQuery) : [];

  const handleSearchSelect = (route: string) => {
    navigate(route);
    setSearchQuery('');
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
          <img src={logoImg} alt="TrueRes.io logo" className="h-7 w-7" />
          <span>TrueRes<span className="text-primary">.io</span></span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden md:flex relative max-w-sm flex-1 mx-8">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            className="pl-9 bg-secondary border-border"
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg">
              {searchResults.slice(0, 8).map((tool) => (
                <button
                  key={tool.id}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-left"
                  onMouseDown={() => handleSearchSelect(tool.route)}
                >
                  <span className="font-medium">{tool.shortName}</span>
                  <span className="text-muted-foreground text-xs truncate">{tool.description.slice(0, 60)}...</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-4">
          <Link to="/tools" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            All Tools
          </Link>
          <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
        </nav>

        {/* Mobile Menu */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 bg-card">
            <div className="p-4 border-b border-border">
              <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold" onClick={() => setMobileNavOpen(false)}>
                <img src={logoImg} alt="TrueRes.io logo" className="h-7 w-7" />
                <span>TrueRes<span className="text-primary">.io</span></span>
              </Link>
            </div>
            <div className="p-4">
              <div className="relative">
                <Input
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-1 bg-secondary"
                />
                {searchQuery.length >= 2 && searchResults.length > 0 && (
                  <div className="mb-3 rounded-md border border-border bg-card shadow-lg">
                    {searchResults.slice(0, 8).map((tool) => (
                      <button
                        key={tool.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-left"
                        onClick={() => { handleSearchSelect(tool.route); setMobileNavOpen(false); }}
                      >
                        <span className="font-medium">{tool.shortName}</span>
                        <span className="text-muted-foreground text-xs truncate">{tool.description.slice(0, 50)}...</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <ToolNav onNavigate={() => { setMobileNavOpen(false); setSearchQuery(''); }} />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
