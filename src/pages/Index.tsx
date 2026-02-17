import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TOOLS } from '@/config/tool-registry';
import { TOOL_CATEGORIES } from '@/types/tools';
import { Shield, Lock, Cpu, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'TrueRes.io',
  url: 'https://trueres.io',
  description: 'Free, privacy-first browser-based audio and video analysis, conversion, and processing tools.',
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TrueRes.io',
  url: 'https://trueres.io',
  description: 'Free browser-based audio and video tools. Analyze, convert, and process files without uploading.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://trueres.io/tools?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const Index = () => {
  return (
    <>
      <Helmet>
        <title>TrueRes.io — Free Browser-Based Audio & Video Tools</title>
        <meta name="description" content="Free, privacy-first audio and video tools. Analyze, convert, and process files in your browser. No uploads, no servers. 35 professional-grade tools." />
        <meta property="og:title" content="TrueRes.io — Free Browser-Based Audio & Video Tools" />
        <meta property="og:description" content="35 free professional audio & video tools. Analysis, conversion, processing — all in your browser." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://trueres.io" />
        <link rel="canonical" href="https://trueres.io" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      </Helmet>

      <div className="space-y-16 pb-12">
        {/* Hero */}
        <section className="relative overflow-hidden" aria-label="Introduction">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="container max-w-4xl py-16 md:py-24 text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                No uploads. No servers. 100% browser.
              </div>
              <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight leading-tight">
                Free Audio & Video
                <br />
                <span className="text-primary">Analysis Tools</span>
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                35 professional-grade tools for audio forensics, conversion, video processing, and signal testing. 
                Everything runs locally in your browser — your files never leave your device.
              </p>
              <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
                <Link
                  to="/hires-verifier"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-heading font-semibold text-primary-foreground hover:bg-accent transition-colors"
                >
                  Try Hi-Res Verifier
                </Link>
                <Link
                  to="/tools"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 font-heading font-semibold hover:bg-secondary transition-colors"
                >
                  Browse All Tools
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Why TrueRes */}
        <section className="container max-w-4xl" aria-label="Benefits">
          <h2 className="text-2xl font-heading font-bold text-center mb-8">Why TrueRes.io?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Lock, title: 'Privacy First', desc: 'Files never leave your device. Zero server uploads. No accounts needed.' },
              { icon: Cpu, title: 'Professional Grade', desc: 'ITU-R BS.1770-4 LUFS, spectral analysis, forensic-level verification.' },
              { icon: Zap, title: 'Instant Results', desc: 'Web Audio API and WebAssembly power fast analysis without installation.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
                className="rounded-lg border border-border bg-card p-6"
              >
                <item.icon className="h-8 w-8 text-primary mb-3" aria-hidden="true" />
                <h3 className="font-heading font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Tool Grid by Category */}
        <section className="container max-w-5xl" aria-label="Tool directory">
          <h2 className="text-2xl font-heading font-bold text-center mb-8">All Tools</h2>
          {TOOL_CATEGORIES.map((cat) => {
            const tools = TOOLS.filter((t) => t.category === cat.id);
            return (
              <div key={cat.id} className="mb-10">
                <h3 className={`font-heading font-semibold text-lg mb-4 ${cat.color}`}>
                  {cat.label}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tools.map((tool) => (
                    <Link
                      key={tool.id}
                      to={tool.route}
                      className="group rounded-lg border border-border bg-card p-4 hover:bg-card-elevated hover:border-primary/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label={`${tool.name}: ${tool.description.slice(0, 80)}`}
                    >
                      <h4 className="font-heading font-semibold text-sm group-hover:text-primary transition-colors">
                        {tool.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {tool.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
};

export default Index;
