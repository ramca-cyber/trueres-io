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
  'media-player': [
    { q: 'What formats are supported?', a: 'WAV, FLAC, AIFF, MP3, OGG, AAC, M4A, MP4, WebM, AVI, MKV, and MOV. Playback depends on your browser\'s native codec support.' },
    { q: 'Is my file uploaded anywhere?', a: 'No. Your file stays on your device. The player uses a local object URL — nothing is sent to any server.' },
    { q: 'Why can\'t I play MKV or AVI files?', a: 'Some containers (MKV, AVI) may not be natively supported by all browsers. Chrome generally has the widest format support. Try converting with the Video Converter tool.' },
  ],
  'speaker-test': [
    { q: 'Does surround sound work in a browser?', a: 'Yes, if your system audio output is configured for multichannel (5.1/7.1). Chrome and Edge have the best support. The tool uses ChannelMergerNode to route to individual channels.' },
    { q: 'Why do I only hear stereo?', a: 'Your operating system or audio device may be set to stereo output. Check your sound settings and ensure your receiver/DAC is configured for surround.' },
  ],
  'subwoofer-test': [
    { q: 'Why can\'t I hear the 10 Hz tone?', a: 'Most subwoofers roll off below 20 Hz, and human hearing typically starts around 20 Hz. You may feel the vibration rather than hear it.' },
    { q: 'What is a crossover frequency?', a: 'The crossover frequency is where your subwoofer stops reproducing sound and your main speakers take over. Common settings are 60-120 Hz depending on speaker size.' },
  ],
  'burn-in-generator': [
    { q: 'Does headphone burn-in actually work?', a: 'Scientific evidence is inconclusive. Most controlled studies show no measurable difference. However, some users report perceived improvements. This tool is provided for experimentation.' },
    { q: 'What volume should I use?', a: 'Use a moderate volume — approximately your normal listening level. Excessive volume during burn-in can damage drivers.' },
  ],
  'turntable-test': [
    { q: 'How do I use the wow & flutter test?', a: 'Play the 3150 Hz tone through your turntable and listen for pitch wobble. A stable tone indicates good speed stability. Use a frequency counter app for precise measurement.' },
    { q: 'What is anti-skating?', a: 'Anti-skating is a force applied to the tonearm to counteract the natural inward pull of the spinning record. The left-channel-only test tone helps verify correct adjustment.' },
  ],
  'surround-reference': [
    { q: 'What is Dolby Atmos?', a: 'Dolby Atmos is an object-based audio format that adds height channels to traditional surround sound. It supports up to 7.1.4 configurations with four overhead speakers.' },
    { q: 'What speaker layout should I choose?', a: 'Start with 5.1 for most rooms. Add side/rear surrounds for 7.1 if your room supports it. Atmos (7.1.4) adds ceiling speakers for the most immersive experience.' },
  ],
  'db-converter': [
    { q: 'What is the difference between dBu and dBV?', a: 'dBu references 0.775V (the voltage across 600Ω that produces 1mW). dBV references 1V. Professional audio uses dBu (+4 dBu standard), consumer audio uses dBV (-10 dBV standard).' },
    { q: 'What is dBFS?', a: 'dBFS (decibels relative to Full Scale) is used in digital audio. 0 dBFS is the maximum level before clipping. All values are negative, with typical targets around -14 to -23 dBFS.' },
  ],
  'listening-monitor': [
    { q: 'How long can I safely listen?', a: 'At 85 dB SPL, WHO recommends a maximum of 8 hours. For every 3 dB increase, safe time halves. At 100 dB, the safe limit is only 15 minutes.' },
    { q: 'How do I know my actual SPL level?', a: 'Use a dedicated SPL meter or a calibrated smartphone app. This tool provides estimates based on the level you set — actual SPL depends on your equipment and volume setting.' },
  ],
  'abx-test': [
    { q: 'What is an ABX test?', a: 'An ABX test is a double-blind methodology where you compare two audio samples (A and B) with an unknown sample (X). X is randomly assigned as A or B, and you must identify which one it is.' },
    { q: 'How many trials do I need?', a: 'At least 10-16 trials are recommended for statistical significance. With 12 correct out of 16, you achieve p < 0.05, indicating a statistically significant ability to distinguish.' },
  ],
  'clipping-detector': [
    { q: 'What is inter-sample peaking?', a: 'Inter-sample peaks (ISP) occur when reconstructed analog signals between digital samples exceed 0 dBFS. This happens even when no individual sample clips, and can cause distortion in DACs.' },
    { q: 'How many clipped samples is too many?', a: 'Even a single clipped sample can be audible depending on context. A few isolated clips may be acceptable, but consecutive clipped samples indicate serious mastering issues.' },
  ],
  'room-analyzer': [
    { q: 'Do I need a calibrated microphone?', a: 'For casual use, your laptop or phone mic works fine to spot room modes and major issues. For accurate measurements, a calibrated measurement microphone (e.g., UMIK-1) is recommended.' },
    { q: 'What is RT60?', a: 'RT60 is the time it takes for sound to decay by 60 dB after the source stops. Typical values: studios 0.2-0.4s, living rooms 0.4-0.8s, concert halls 1.5-2.5s.' },
  ],
  'ir-viewer': [
    { q: 'What is an impulse response file?', a: 'An IR file captures how a space or device responds to a short burst of sound. It encodes the reverb characteristics and frequency response, used for convolution reverb and room correction.' },
    { q: 'What file formats work?', a: 'WAV is the most common IR format. FLAC and AIFF are also supported. Most IR files are mono or stereo, typically at 44.1 or 48 kHz.' },
  ],
  'bit-perfect-test': [
    { q: 'What is bit-perfect playback?', a: 'Bit-perfect playback means the digital audio signal reaches your DAC without any modification — no volume adjustment, sample rate conversion, or DSP processing by the OS or driver.' },
    { q: 'How do I achieve bit-perfect output?', a: 'On Windows, use WASAPI Exclusive mode. On macOS, set Audio MIDI Setup to match the file\'s sample rate. On Linux, use ALSA direct output. Disable all system sound effects.' },
  ],
};

/**
 * Get FAQ for a specific tool, or return an empty array
 */
export function getToolFAQ(toolId: string): { q: string; a: string }[] {
  return TOOL_FAQS[toolId] || [];
}
