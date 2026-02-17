import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold mb-3">
              <img src={logoImg} alt="TrueRes.io logo" className="h-6 w-6" />
              <span>TrueRes<span className="text-primary">.io</span></span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Free, privacy-first audio & video tools. No uploads. No servers. 100% browser-based.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading font-semibold mb-3 text-sm">Navigation</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/tools" className="hover:text-foreground transition-colors">All Tools</Link></li>
              <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="/hires-verifier" className="hover:text-foreground transition-colors">Hi-Res Verifier</Link></li>
              <li><Link to="/spectrogram" className="hover:text-foreground transition-colors">Spectrogram</Link></li>
            </ul>
          </div>

          {/* Privacy */}
          <div>
            <h4 className="font-heading font-semibold mb-3 text-sm">Privacy</h4>
            <p className="text-sm text-muted-foreground">
              Your files never leave your device. All processing happens locally in your browser using Web Audio API and WebAssembly.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TrueRes.io — Built with Web Audio API & ffmpeg.wasm
        </div>
      </div>
    </footer>
  );
}
