import { type ToolDefinition } from '@/types/tools';

/**
 * Per-tool FAQ content for SEO (FAQPage schema)
 */
export const TOOL_FAQS: Record<string, { q: string; a: string }[]> = {
  'hires-verifier': [
    { q: 'How does the Hi-Res Audio Verifier work?', a: 'It analyzes the effective bit depth, frequency bandwidth, and spectral content of your audio file to determine if it truly contains high-resolution information or was upsampled from a lower-quality source.' },
    { q: 'What file formats are supported?', a: 'WAV, FLAC, AIFF, MP3, OGG, AAC, and M4A files are supported. For best results, test lossless files (WAV, FLAC, AIFF).' },
    { q: 'Is my file uploaded to a server?', a: 'No. All analysis happens entirely in your browser using the Web Audio API. Your files never leave your device.' },
  ],
  'spectrogram': [
    { q: 'What is a spectrogram?', a: 'A spectrogram is a visual representation of the frequency spectrum of audio over time. Frequency is shown on the vertical axis, time on the horizontal axis, and color intensity represents amplitude.' },
    { q: 'How can I detect lossy encoding from a spectrogram?', a: 'Lossy codecs like MP3 and AAC cut off high frequencies. Look for a sharp horizontal line where frequencies abruptly stop — this is a telltale sign of lossy encoding.' },
  ],
  'lufs-meter': [
    { q: 'What is LUFS?', a: 'LUFS (Loudness Units relative to Full Scale) is a standard measurement of perceived loudness defined by ITU-R BS.1770-4. Streaming platforms use LUFS targets to normalize playback volume.' },
    { q: 'What LUFS should I target for Spotify?', a: 'Spotify normalizes to -14 LUFS with a true peak of -1 dBTP. Music louder than this will be turned down automatically.' },
    { q: 'What is LRA?', a: 'LRA (Loudness Range) measures the variation in loudness over time in LU. Higher LRA values indicate more dynamic content.' },
  ],
  'dynamic-range': [
    { q: 'What is a DR score?', a: 'The DR (Dynamic Range) score measures the difference between the loudest and quietest parts of audio. Higher scores indicate more dynamic, less compressed audio. DR14+ is considered excellent.' },
    { q: 'What causes low dynamic range?', a: 'Heavy compression and limiting during mastering reduces dynamic range. This is often called the "loudness war" where music is made as loud as possible at the expense of dynamics.' },
  ],
  'lossy-detector': [
    { q: 'What is a lossy transcode?', a: 'A lossy transcode is when audio is converted from a lossy format (like MP3) to a lossless format (like FLAC). The file appears lossless but actually contains lossy-quality audio.' },
    { q: 'How does the detector identify fake lossless?', a: 'It analyzes the frequency spectrum for spectral holes and sharp frequency cutoffs that are characteristic of lossy encoding. These patterns remain even after converting to a lossless container.' },
  ],
  'audio-converter': [
    { q: 'What formats can I convert between?', a: 'You can convert between MP3, WAV, FLAC, AAC (M4A), OGG Vorbis, and Opus. All conversion happens in your browser using ffmpeg.wasm.' },
    { q: 'Is there a file size limit?', a: 'There is no hard limit, but very large files (500MB+) may be slow on mobile devices due to memory constraints. Desktop browsers handle files up to several GB.' },
  ],
  'video-to-mp3': [
    { q: 'How do I extract audio from a video?', a: 'Simply drop your video file (MP4, WebM, AVI, MKV, or MOV) and choose your desired MP3 bitrate. The tool extracts and re-encodes the audio track as MP3.' },
    { q: 'What video formats are supported?', a: 'MP4, WebM, AVI, MKV, and MOV are supported. The video is processed entirely in your browser.' },
  ],
  'tone-generator': [
    { q: 'What waveforms are available?', a: 'Sine, square, triangle, and sawtooth waveforms are available. Sine is a pure tone, while the others contain harmonics useful for testing audio equipment.' },
    { q: 'Can I download the generated tone?', a: 'Yes. Click "Generate WAV" to create a downloadable WAV file of your configured tone.' },
  ],
  'hearing-test': [
    { q: 'Is this a medical hearing test?', a: 'No. This is an informal screening tool. For accurate hearing assessment, please consult an audiologist. Use headphones for the most reliable results.' },
    { q: 'What frequencies are tested?', a: 'The test covers 250 Hz, 500 Hz, 1 kHz, 2 kHz, 4 kHz, 8 kHz, 12 kHz, and 16 kHz — the key frequencies for speech and music perception.' },
  ],
  'bitrate-calculator': [
    { q: 'How is file size calculated?', a: 'File size = (sample rate × bit depth × channels × duration) / 8 for uncompressed formats. Lossy formats use the specified bitrate × duration.' },
  ],
  'format-reference': [
    { q: 'What is the difference between lossless and lossy?', a: 'Lossless formats (FLAC, WAV, ALAC) preserve the original audio data perfectly. Lossy formats (MP3, AAC, OGG) discard some data to achieve smaller file sizes.' },
  ],
  'bluetooth-codecs': [
    { q: 'Which Bluetooth codec has the best quality?', a: 'LDAC at 990kbps offers the highest quality, approaching CD quality. aptX HD and LHDC are also high-quality options. SBC is the baseline codec with the lowest quality.' },
  ],
};

/**
 * Get FAQ for a specific tool, or return an empty array
 */
export function getToolFAQ(toolId: string): { q: string; a: string }[] {
  return TOOL_FAQS[toolId] || [];
}
