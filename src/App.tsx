import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Suspense, lazy } from "react";
import { AppShell } from "@/components/layout/AppShell";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const AllTools = lazy(() => import("./pages/AllTools"));
const About = lazy(() => import("./pages/About"));

// Lazy-loaded tool pages
const HiResVerifier = lazy(() => import("./pages/tools/HiResVerifier"));
const SpectrogramViewer = lazy(() => import("./pages/tools/SpectrogramViewer"));
const LufsMeter = lazy(() => import("./pages/tools/LufsMeter"));
const DynamicRangeMeter = lazy(() => import("./pages/tools/DynamicRangeMeter"));
const WaveformViewer = lazy(() => import("./pages/tools/WaveformViewer"));
const StereoAnalyzer = lazy(() => import("./pages/tools/StereoAnalyzer"));
const FileInspector = lazy(() => import("./pages/tools/FileInspector"));
const LossyDetector = lazy(() => import("./pages/tools/LossyDetector"));
const SpectrumAnalyzer = lazy(() => import("./pages/tools/SpectrumAnalyzer"));
const AudioComparator = lazy(() => import("./pages/tools/AudioComparator"));
const BatchAnalyzer = lazy(() => import("./pages/tools/BatchAnalyzer"));
const FreqResponse = lazy(() => import("./pages/tools/FreqResponse"));
const AudioConverter = lazy(() => import("./pages/tools/AudioConverter"));
const AudioTrimmer = lazy(() => import("./pages/tools/AudioTrimmer"));
const AudioNormalizer = lazy(() => import("./pages/tools/AudioNormalizer"));
const WaveformImage = lazy(() => import("./pages/tools/WaveformImage"));
const TagEditor = lazy(() => import("./pages/tools/TagEditor"));
const MetadataStripper = lazy(() => import("./pages/tools/MetadataStripper"));
const SampleRateConverter = lazy(() => import("./pages/tools/SampleRateConverter"));
const ChannelOps = lazy(() => import("./pages/tools/ChannelOps"));
const VideoToMp3 = lazy(() => import("./pages/tools/VideoToMp3"));
const VideoTrimmer = lazy(() => import("./pages/tools/VideoTrimmer"));
const VideoCompressor = lazy(() => import("./pages/tools/VideoCompressor"));
const VideoToGif = lazy(() => import("./pages/tools/VideoToGif"));
const VideoConverter = lazy(() => import("./pages/tools/VideoConverter"));
const VideoMute = lazy(() => import("./pages/tools/VideoMute"));
const VideoToAudio = lazy(() => import("./pages/tools/VideoToAudio"));
const ToneGenerator = lazy(() => import("./pages/tools/ToneGenerator"));
const SweepGenerator = lazy(() => import("./pages/tools/SweepGenerator"));
const NoiseGenerator = lazy(() => import("./pages/tools/NoiseGenerator"));
const HearingTest = lazy(() => import("./pages/tools/HearingTest"));
const DacTest = lazy(() => import("./pages/tools/DacTest"));
const BitrateCalculator = lazy(() => import("./pages/tools/BitrateCalculator"));
const FormatReference = lazy(() => import("./pages/tools/FormatReference"));
const BluetoothCodecs = lazy(() => import("./pages/tools/BluetoothCodecs"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex items-center justify-center py-16">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppShell>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/tools" element={<AllTools />} />
                <Route path="/about" element={<About />} />

                {/* Audio Analysis & Forensics */}
                <Route path="/hires-verifier" element={<HiResVerifier />} />
                <Route path="/spectrogram" element={<SpectrogramViewer />} />
                <Route path="/lufs-meter" element={<LufsMeter />} />
                <Route path="/dynamic-range" element={<DynamicRangeMeter />} />
                <Route path="/waveform-viewer" element={<WaveformViewer />} />
                <Route path="/stereo-analyzer" element={<StereoAnalyzer />} />
                <Route path="/file-inspector" element={<FileInspector />} />
                <Route path="/lossy-detector" element={<LossyDetector />} />
                <Route path="/spectrum-analyzer" element={<SpectrumAnalyzer />} />
                <Route path="/audio-compare" element={<AudioComparator />} />
                <Route path="/batch-analyzer" element={<BatchAnalyzer />} />
                <Route path="/freq-response" element={<FreqResponse />} />

                {/* Audio Processing */}
                <Route path="/audio-converter" element={<AudioConverter />} />
                <Route path="/audio-trimmer" element={<AudioTrimmer />} />
                <Route path="/audio-normalizer" element={<AudioNormalizer />} />
                <Route path="/waveform-image" element={<WaveformImage />} />
                <Route path="/tag-editor" element={<TagEditor />} />
                <Route path="/metadata-stripper" element={<MetadataStripper />} />
                <Route path="/sample-rate-converter" element={<SampleRateConverter />} />
                <Route path="/channel-ops" element={<ChannelOps />} />

                {/* Video Processing */}
                <Route path="/video-to-mp3" element={<VideoToMp3 />} />
                <Route path="/video-trimmer" element={<VideoTrimmer />} />
                <Route path="/video-compressor" element={<VideoCompressor />} />
                <Route path="/video-to-gif" element={<VideoToGif />} />
                <Route path="/video-converter" element={<VideoConverter />} />
                <Route path="/video-mute" element={<VideoMute />} />
                <Route path="/video-to-audio" element={<VideoToAudio />} />

                {/* Signal Generators */}
                <Route path="/tone-generator" element={<ToneGenerator />} />
                <Route path="/sweep-generator" element={<SweepGenerator />} />
                <Route path="/noise-generator" element={<NoiseGenerator />} />
                <Route path="/hearing-test" element={<HearingTest />} />
                <Route path="/dac-test" element={<DacTest />} />

                {/* Reference */}
                <Route path="/bitrate-calculator" element={<BitrateCalculator />} />
                <Route path="/format-reference" element={<FormatReference />} />
                <Route path="/bluetooth-codecs" element={<BluetoothCodecs />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AppShell>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
