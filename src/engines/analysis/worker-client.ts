/**
 * Worker client — manages the singleton analysis worker and provides a
 * promise-based API for running analysis off the main thread.
 */

import type { AnalysisResult } from '@/types/analysis';

// Lazy-initialized singleton
let worker: Worker | null = null;
let idCounter = 0;

interface PendingRequest {
  resolve: (value: WorkerResponse) => void;
  reject: (reason: any) => void;
}

export interface WorkerResponse {
  result: AnalysisResult | null;
  subResults?: Record<string, AnalysisResult>;
}

const pending = new Map<number, PendingRequest>();

function getWorker(): Worker | null {
  if (worker) return worker;

  if (typeof Worker === 'undefined') return null;

  try {
    worker = new Worker(
      new URL('./analysis-worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e: MessageEvent) => {
      const { id, result, subResults, error } = e.data;
      const req = pending.get(id);
      if (!req) return;
      pending.delete(id);

      if (error) {
        req.reject(new Error(error));
      } else {
        req.resolve({ result, subResults });
      }
    };

    worker.onerror = (err) => {
      console.error('[analysis-worker] error:', err);
      // Reject all pending requests
      for (const [id, req] of pending) {
        req.reject(err);
        pending.delete(id);
      }
    };

    return worker;
  } catch {
    return null;
  }
}

export interface AnalysisInput {
  channelData: Float32Array[];
  sampleRate: number;
  bitDepth?: number;
  headerSampleRate?: number;
}

/**
 * Run an analysis key in the web worker. Returns the result (and subResults for verdict).
 * Falls back to null if workers are unavailable (caller should handle fallback).
 */
export function runAnalysisInWorker(
  key: string,
  input: AnalysisInput,
): Promise<WorkerResponse> | null {
  const w = getWorker();
  if (!w) return null; // signal caller to fall back

  const id = ++idCounter;

  return new Promise<WorkerResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject });

    w.postMessage({
      id,
      key,
      channelData: input.channelData,
      sampleRate: input.sampleRate,
      bitDepth: input.bitDepth,
      headerSampleRate: input.headerSampleRate,
    });
  });
}

/**
 * Terminate the worker and release resources.
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    // Reject any pending
    for (const [id, req] of pending) {
      req.reject(new Error('Worker terminated'));
      pending.delete(id);
    }
  }
}
