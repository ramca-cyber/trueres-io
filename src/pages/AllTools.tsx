import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TOOLS, searchTools } from '@/config/tool-registry';
import { TOOL_CATEGORIES } from '@/types/tools';

const AllTools = () => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = query.length >= 2
    ? searchTools(query)
    : activeCategory
      ? TOOLS.filter((t) => t.category === activeCategory)
      : TOOLS;

  return (
    <>
      <Helmet>
        <title>All Tools — TrueRes.io</title>
        <meta name="description" content="Browse all 35 free browser-based audio and video tools. Analysis, conversion, processing, and more." />
      </Helmet>

      <div className="container max-w-4xl py-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">All Tools</h1>
          <p className="text-muted-foreground mt-1">Browse all 35 free browser-based audio & video tools.</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-secondary"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                !activeCategory ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
              }`}
            >
              All
            </button>
            {TOOL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
                }`}
              >
                {cat.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((tool) => (
            <Link
              key={tool.id}
              to={tool.route}
              className="group rounded-lg border border-border bg-card p-4 hover:bg-card-elevated hover:border-primary/30 transition-all"
            >
              <h3 className="font-heading font-semibold text-sm group-hover:text-primary transition-colors">
                {tool.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tool.description}</p>
              <span className="inline-block mt-2 text-xs font-mono text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                {tool.engine === 'none' ? 'Reference' : tool.engine === 'ffmpeg' ? 'Processing' : tool.engine === 'oscillator' ? 'Generator' : 'Analysis'}
              </span>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No tools match your search.</p>
        )}
      </div>
    </>
  );
};

export default AllTools;
