import { Helmet } from 'react-helmet-async';
import { Shield, Globe, Cpu, Lock } from 'lucide-react';

const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About TrueRes.io',
  description: 'Learn how TrueRes.io works. All audio and video processing happens in your browser with no file uploads.',
  url: 'https://trueres.io/about',
  mainEntity: {
    '@type': 'Organization',
    name: 'TrueRes.io',
    url: 'https://trueres.io',
  },
};

const About = () => {
  return (
    <>
      <Helmet>
        <title>About — TrueRes.io | How It Works</title>
        <meta name="description" content="Learn how TrueRes.io works. All audio and video processing happens in your browser using Web Audio API and ffmpeg.wasm. No files are ever uploaded." />
        <meta property="og:title" content="About TrueRes.io — How It Works" />
        <meta property="og:description" content="All processing runs locally in your browser. No servers, no uploads, no accounts." />
        <link rel="canonical" href="https://trueres.io/about" />
        <script type="application/ld+json">{JSON.stringify(aboutSchema)}</script>
      </Helmet>

      <article className="container max-w-3xl py-8 space-y-8">
        <header>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">About TrueRes.io</h1>
          <p className="text-muted-foreground mt-2">
            TrueRes.io is a free collection of professional audio and video tools that run entirely in your browser.
            No files are ever uploaded to any server.
          </p>
        </header>

        <section className="space-y-4" aria-label="How it works">
          <h2 className="text-xl font-heading font-semibold">How It Works</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Lock, title: 'File Stays Local', desc: 'When you drop a file, it is read directly by your browser. The file data never leaves your device.' },
              { icon: Cpu, title: 'Web Audio API', desc: 'Audio decoding and analysis uses the Web Audio API and custom JavaScript algorithms running in Web Workers.' },
              { icon: Globe, title: 'WebAssembly (ffmpeg.wasm)', desc: 'Format conversion and video processing uses ffmpeg compiled to WebAssembly, running in your browser.' },
              { icon: Shield, title: 'No Account Needed', desc: 'No sign-up, no login, no tracking. Just drop your file and get results instantly.' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-5">
                <item.icon className="h-6 w-6 text-primary mb-2" aria-hidden="true" />
                <h3 className="font-heading font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3" aria-label="Technology stack">
          <h2 className="text-xl font-heading font-semibold">Technology Stack</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong className="text-foreground">Web Audio API</strong> — Audio decoding, playback, and real-time analysis</li>
            <li>• <strong className="text-foreground">ffmpeg.wasm</strong> — Format conversion, trimming, video processing</li>
            <li>• <strong className="text-foreground">Canvas 2D</strong> — High-performance spectrograms and visualizations</li>
            <li>• <strong className="text-foreground">Web Workers</strong> — Multi-threaded analysis to keep UI responsive</li>
            <li>• <strong className="text-foreground">IndexedDB</strong> — Caching WASM binaries for instant subsequent loads</li>
          </ul>
        </section>

        <section className="space-y-3" aria-label="Browser support">
          <h2 className="text-xl font-heading font-semibold">Browser Support</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-status-pass">Full support:</strong> Chrome 90+, Edge 90+, Firefox 90+</p>
            <p><strong className="text-status-warn">Partial support:</strong> Safari 15.4+ (some features limited)</p>
            <p><strong className="text-status-warn">Mobile:</strong> Works with memory limitations on large files (&gt;200MB)</p>
          </div>
        </section>
      </article>
    </>
  );
};

export default About;
