import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Shield } from 'lucide-react';
import { type ToolDefinition } from '@/types/tools';
import { CrossToolLinks } from './CrossToolLinks';
import { getToolFAQ } from '@/config/tool-faqs';

interface ToolPageProps {
  tool: ToolDefinition;
  children: ReactNode;
  faq?: { q: string; a: string }[];
}

export function ToolPage({ tool, children, faq: faqProp }: ToolPageProps) {
  const faq = faqProp || getToolFAQ(tool.id);

  // JSON-LD: WebApplication
  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    description: tool.metaDescription,
    url: `https://trueres.io${tool.route}`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires a modern web browser with Web Audio API support',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    creator: {
      '@type': 'Organization',
      name: 'TrueRes.io',
      url: 'https://trueres.io',
    },
  };

  // JSON-LD: FAQPage (if FAQ exists)
  const faqSchema = faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      }
    : null;

  return (
    <>
      <Helmet>
        <title>{tool.name} — TrueRes.io | Free Browser-Based Tool</title>
        <meta name="description" content={tool.metaDescription} />
        <meta property="og:title" content={`${tool.name} — TrueRes.io`} />
        <meta property="og:description" content={tool.metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://trueres.io${tool.route}`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${tool.name} — TrueRes.io`} />
        <meta name="twitter:description" content={tool.metaDescription} />
        <link rel="canonical" href={`https://trueres.io${tool.route}`} />
        <script type="application/ld+json">{JSON.stringify(webAppSchema)}</script>
        {faqSchema && (
          <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        )}
      </Helmet>

      <article className="container max-w-4xl py-6 space-y-6">
        {/* Tool Header */}
        <header>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">{tool.name}</h1>
          <p className="text-muted-foreground mt-1">{tool.description}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-status-pass" role="status">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium">No uploads. 100% browser-based.</span>
          </div>
        </header>

        {/* Tool Content */}
        <section aria-label={`${tool.name} interface`}>
          {children}
        </section>

        {/* Cross-tool links */}
        <nav aria-label="Related tools">
          <CrossToolLinks currentToolId={tool.id} category={tool.category} />
        </nav>

        {/* FAQ */}
        {faq.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-border" aria-label="Frequently asked questions">
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
      </article>
    </>
  );
}
