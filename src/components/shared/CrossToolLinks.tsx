import { Link } from 'react-router-dom';
import { TOOLS } from '@/config/tool-registry';
import { type ToolCategory } from '@/types/tools';

interface CrossToolLinksProps {
  currentToolId: string;
  category: ToolCategory;
  defaultOpen?: boolean;
}

export function CrossToolLinks({ currentToolId, category, defaultOpen = true }: CrossToolLinksProps) {
  const related = TOOLS.filter((t) => t.category === category && t.id !== currentToolId).slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="pt-4 border-t border-border">
      <h3 className="text-sm font-heading font-semibold text-muted-foreground mb-3">Also try</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {related.map((tool) => (
          <Link
            key={tool.id}
            to={tool.route}
            className="rounded-md border border-border bg-card p-3 text-sm hover:bg-secondary transition-colors"
          >
            <span className="font-medium">{tool.shortName}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
