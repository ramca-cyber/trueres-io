import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOOLS } from '@/config/tool-registry';
import { TOOL_CATEGORIES } from '@/types/tools';
import { useFileTransferStore } from '@/stores/file-transfer-store';
import { ArrowRight } from 'lucide-react';

interface ToolActionGridProps {
  file: File;
  currentToolId: string;
}

export function ToolActionGrid({ file, currentToolId }: ToolActionGridProps) {
  const navigate = useNavigate();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  const groupedTools = useMemo(() => {
    const compatible = TOOLS.filter(
      (t) =>
        t.id !== currentToolId &&
        t.acceptsFormats?.includes(ext) &&
        t.category !== 'generators'
    );

    const groups: Record<string, typeof compatible> = {};
    for (const t of compatible) {
      const cat = t.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return groups;
  }, [ext, currentToolId]);

  const handleClick = (route: string) => {
    useFileTransferStore.getState().setPendingFile(file);
    navigate(route);
  };

  const categoryEntries = Object.entries(groupedTools);

  if (categoryEntries.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-heading font-semibold text-foreground">
          Continue with this file
        </h3>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {categoryEntries.map(([catId, tools]) => {
        const catInfo = TOOL_CATEGORIES.find((c) => c.id === catId);
        return (
          <div key={catId} className="space-y-2">
            <p className={`text-xs font-medium uppercase tracking-wider ${catInfo?.color || 'text-muted-foreground'}`}>
              {catInfo?.label || catId}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleClick(tool.route)}
                  className="group flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-sm transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <span className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                    {tool.shortName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
