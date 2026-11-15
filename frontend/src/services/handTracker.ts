// src/services/handTracker.ts
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

let handLandmarker: HandLandmarker | null = null;
let handLandmarkerPromise: Promise<HandLandmarker> | null = null;

export async function initHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker;
  if (handLandmarkerPromise) return handLandmarkerPromise;

  handLandmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks('/mediapipe');
    const options = {
      baseOptions: { modelAssetPath: '/mediapipe/hand_landmarker.task' },
      runningMode: 'VIDEO' as const,
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    };

    try {
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { ...options.baseOptions, delegate: 'GPU' },
      });
    } catch {
      handLandmarker = await HandLandmarker.createFromOptions(vision, options);
    }
    return handLandmarker;
  })();

  try {
    return await handLandmarkerPromise;
  } catch (error) {
    handLandmarkerPromise = null;
    throw error;
  }
}

export function closeHandLandmarker(): void {
  handLandmarker?.close();
  handLandmarker = null;
  handLandmarkerPromise = null;
}
