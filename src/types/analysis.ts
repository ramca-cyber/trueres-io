export interface AnalysisResult {
  type: string;
  timestamp: number;
  duration: number; // ms to compute
}

export interface BitDepthResult extends AnalysisResult {
  type: 'bitDepth';
  effectiveBitDepth: number;
  reportedBitDepth: number;
  lsbZeroRatio: number;
  noiseFloor: number;
  confidence: number;
}

export interface BandwidthResult extends AnalysisResult {
  type: 'bandwidth';
  frequencyCeiling: number;
  cutoffSharpness: number;
  sourceGuess: string;
  isUpsampled: boolean;
  confidence: number;
}

export interface LossyDetectResult extends AnalysisResult {
  type: 'lossyDetect';
  isLossy: boolean;
  spectralHoles: number;
  encoderFingerprint: string | null;
  confidence: number;
}

export interface LUFSResult extends AnalysisResult {
  type: 'lufs';
  integrated: number;
  shortTerm: number[];
  momentary: number[];
  truePeak: number;
  lra: number;
}

export interface DynamicRangeResult extends AnalysisResult {
  type: 'dynamicRange';
  drScore: number;
  crestFactor: number;
  peakDbfs: number;
  rmsDbfs: number;
  clippedSamples: number;
}

export interface StereoResult extends AnalysisResult {
  type: 'stereo';
  correlation: number;
  stereoWidth: number;
  midEnergy: number;
  sideEnergy: number;
  monoCompatibilityLoss: number;
}

export interface SpectrogramData {
  magnitudes: Float32Array[];
  frequencies: Float32Array;
  times: Float32Array;
  fftSize: number;
  hopSize: number;
  sampleRate: number;
}

export interface WaveformData {
  peaks: Float32Array;
  rms: Float32Array;
  samplesPerPixel: number;
}

export interface SpectrumData {
  magnitudes: Float32Array;
  frequencies: Float32Array;
  octaveBands?: { center: number; magnitude: number }[];
}

export interface VerdictResult extends AnalysisResult {
  type: 'verdict';
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
  positives: string[];
  isGenuineHiRes: boolean;
}
