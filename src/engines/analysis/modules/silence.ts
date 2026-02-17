/**
 * Detect silent regions in audio
 */
export interface SilentRegion {
  startSample: number;
  endSample: number;
  startTime: number;
  endTime: number;
  duration: number;
}

export function detectSilence(
  channelData: Float32Array[],
  sampleRate: number,
  thresholdDb: number = -60,
  minDurationMs: number = 100
): SilentRegion[] {
  const mono = channelData.length > 1
    ? mixToMono(channelData)
    : channelData[0];

  const threshold = Math.pow(10, thresholdDb / 20);
  const minSamples = Math.round((minDurationMs / 1000) * sampleRate);
  const regions: SilentRegion[] = [];

  let silenceStart = -1;
  // Use blocks for efficiency
  const blockSize = 256;

  for (let i = 0; i < mono.length; i += blockSize) {
    const end = Math.min(i + blockSize, mono.length);
    let peak = 0;
    for (let j = i; j < end; j++) {
      const abs = Math.abs(mono[j]);
      if (abs > peak) peak = abs;
    }

    if (peak < threshold) {
      if (silenceStart < 0) silenceStart = i;
    } else {
      if (silenceStart >= 0) {
        const duration = i - silenceStart;
        if (duration >= minSamples) {
          regions.push({
            startSample: silenceStart,
            endSample: i,
            startTime: silenceStart / sampleRate,
            endTime: i / sampleRate,
            duration: duration / sampleRate,
          });
        }
        silenceStart = -1;
      }
    }
  }

  // Handle trailing silence
  if (silenceStart >= 0) {
    const duration = mono.length - silenceStart;
    if (duration >= minSamples) {
      regions.push({
        startSample: silenceStart,
        endSample: mono.length,
        startTime: silenceStart / sampleRate,
        endTime: mono.length / sampleRate,
        duration: duration / sampleRate,
      });
    }
  }

  return regions;
}

function mixToMono(channels: Float32Array[]): Float32Array {
  const length = channels[0].length;
  const mono = new Float32Array(length);
  const n = channels.length;
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < n; ch++) sum += channels[ch][i];
    mono[i] = sum / n;
  }
  return mono;
}
