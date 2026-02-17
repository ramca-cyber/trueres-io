import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TOOLS } from '@/config/tool-registry';
import { TOOL_CATEGORIES } from '@/types/tools';
import {
  Search, Wand2, Video, Waves, BookOpen, Star, ChevronRight,
  ShieldCheck, BarChart3, Volume2, Activity, AudioWaveform,
  Disc3, FileSearch, ScanSearch, BarChart, Columns2, ListMusic,
  TrendingUp, RefreshCw, Scissors, SlidersHorizontal, Image,
  Tags, Eraser, ArrowUpDown, Split, Music, Minimize2,
  FileImage, FileVideo, VolumeX, FileAudio, Zap, ArrowRight,
  Ear, Headphones, Calculator, Bluetooth,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

const FEATURED_IDS = [
  'media-player',
  'spectrogram-viewer',
  'lufs-meter',
  'audio-converter',
  'video-to-mp3',
  'hi-res-verifier',
];

const iconMap: Record<string, LucideIcon> = {
  ShieldCheck, BarChart3, Volume2, Activity, AudioWaveform,
  Disc3, FileSearch, ScanSearch, BarChart, Columns2, ListMusic,
  TrendingUp, RefreshCw, Scissors, SlidersHorizontal, Image,
  Tags, Eraser, ArrowUpDown, Split, Music, Minimize2,
  FileImage, FileVideo, VolumeX, FileAudio, Zap, ArrowRight,
  Ear, Headphones, Calculator, BookOpen, Bluetooth,
  Search, Wand2, Video, Waves,
  ScissorsLineDashed: Scissors,
  Sine: Waves,
};

const categoryIcons: Record<string, LucideIcon> = {
  Search, Wand2, Video, Waves, BookOpen,
};

interface ToolNavProps {
  onNavigate?: () => void;
}

export function ToolNav({ onNavigate }: ToolNavProps) {
  const location = useLocation();

  const featuredTools = FEATURED_IDS
    .map((id) => TOOLS.find((t) => t.id === id))
    .filter(Boolean) as typeof TOOLS;

  return (
    <ScrollArea className="h-[calc(100vh-10rem)] scrollbar-thin">
      <nav className="px-3 pb-4">
        {/* Featured Section */}
        <div className="mb-2">
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-primary" />
            <span>Featured</span>
          </div>
          <ul className="mt-1 space-y-0.5">
            {featuredTools.map((tool) => {
              const ToolIcon = iconMap[tool.icon] || Search;
              const isActive = location.pathname === tool.route;
              return (
                <li key={tool.id}>
                  <Link
                    to={tool.route}
                    onClick={onNavigate}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <ToolIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{tool.shortName}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-b border-border my-3 mx-2" />

        {/* All Tools - Collapsible Categories */}
        {TOOL_CATEGORIES.map((cat) => {
          const CategoryIcon = categoryIcons[cat.icon] || Search;
          const tools = TOOLS.filter((t) => t.category === cat.id);
          const isCategoryActive = tools.some((t) => location.pathname === t.route);

          return (
            <Collapsible key={cat.id} defaultOpen={isCategoryActive} className="mb-1">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary/50 transition-colors group">
                <div className="flex items-center gap-2">
                  <CategoryIcon className={`h-3.5 w-3.5 ${cat.color}`} />
                  <span>{cat.label}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-1 space-y-0.5 mb-3">
                  {tools.map((tool) => {
                    const ToolIcon = iconMap[tool.icon] || Search;
                    const isActive = location.pathname === tool.route;
                    return (
                      <li key={tool.id}>
                        <Link
                          to={tool.route}
                          onClick={onNavigate}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          <ToolIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{tool.shortName}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>
    </ScrollArea>
  );
}
