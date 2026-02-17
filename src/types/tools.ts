import { type LucideIcon } from 'lucide-react';

export type ToolCategory =
  | 'analysis'
  | 'processing'
  | 'video'
  | 'generators'
  | 'reference';

export type EngineType = 'analysis' | 'ffmpeg' | 'oscillator' | 'none';

export interface ToolDefinition {
  id: string;
  name: string;
  shortName: string;
  route: string;
  category: ToolCategory;
  engine: EngineType;
  description: string;
  metaDescription: string;
  icon: string; // lucide icon name
  acceptsFormats?: string[];
  analyses?: string[];
  keywords: string[];
}

export interface ToolCategoryInfo {
  id: ToolCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const TOOL_CATEGORIES: ToolCategoryInfo[] = [
  {
    id: 'analysis',
    label: 'Audio Analysis & Forensics',
    description: 'Inspect, verify, and analyze audio files',
    icon: 'Search',
    color: 'text-status-info',
  },
  {
    id: 'processing',
    label: 'Audio Processing',
    description: 'Convert, trim, normalize, and edit audio',
    icon: 'Wand2',
    color: 'text-primary',
  },
  {
    id: 'video',
    label: 'Video Processing',
    description: 'Extract, convert, compress, and edit video',
    icon: 'Video',
    color: 'text-status-pass',
  },
  {
    id: 'generators',
    label: 'Signal Generators & Testing',
    description: 'Generate tones, sweeps, noise, and run tests',
    icon: 'Waves',
    color: 'text-status-warn',
  },
  {
    id: 'reference',
    label: 'Reference & Education',
    description: 'Calculators, format guides, and comparisons',
    icon: 'BookOpen',
    color: 'text-muted-foreground',
  },
];
