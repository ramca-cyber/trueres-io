import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Shield } from 'lucide-react';
import { type ToolDefinition } from '@/types/tools';
import { CrossToolLinks } from './CrossToolLinks';

interface ToolPageProps {
  tool: ToolDefinition;
  children: ReactNode;
  faq?: { q: string; a: string }[];
}

export function ToolPage({ tool, children, faq }: ToolPageProps) {
  return (
    <>
      <Helmet>
        <title>{tool.name} — TrueRes.io | Free Browser-Based Tool</title>
        <meta name="description" content={tool.metaDescription} />
        <meta property="og:title" content={`${tool.name} — TrueRes.io`} />
        <meta property="og:description" content={tool.metaDescription} />
        <link rel="canonical" href={`https://trueres.io${tool.route}`} />
      </Helmet>

      <div className="container max-w-4xl py-6 space-y-6">
        {/* Tool Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">{tool.name}</h1>
          <p className="text-muted-foreground mt-1">{tool.description}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-status-pass">
            <Shield className="h-3.5 w-3.5" />
            <span className="font-medium">No uploads. 100% browser-based.</span>
          </div>
        </div>

        {/* Tool Content */}
        {children}

        {/* Cross-tool links */}
        <CrossToolLinks currentToolId={tool.id} category={tool.category} />

        {/* FAQ */}
        {faq && faq.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-lg font-heading font-semibold">Frequently Asked Questions</h2>
            <dl className="space-y-3">
              {faq.map((item, i) => (
                <div key={i}>
                  <dt className="font-medium text-sm">{item.q}</dt>
                  <dd className="text-sm text-muted-foreground mt-0.5">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </>
  );
}
