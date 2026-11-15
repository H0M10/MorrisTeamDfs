"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

type CameraState = "idle" | "asking" | "active" | "denied" | "unavailable" | "error";

export function GestureButton({ onPinch }: { onPinch: () => void }) {
  const { t } = useI18n();
  const [camera, setCamera] = useState<CameraState>("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const closeLandmarkerRef = useRef<(() => void) | null>(null);
  const pinchArmedRef = useRef(true);

  function stopGestureControl() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    closeLandmarkerRef.current?.();
    closeLandmarkerRef.current = null;
    setCamera("idle");
  }

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    closeLandmarkerRef.current?.();
  }, []);

  async function askForCamera() {
    if (camera === "active") {
      stopGestureControl();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("unavailable");
      return;
    }
    setCamera("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("Video preview is unavailable");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const { closeHandLandmarker, initHandLandmarker } = await import("@/services/handTracker");
      const landmarker = await initHandLandmarker();
      closeLandmarkerRef.current = closeHandLandmarker;
      pinchArmedRef.current = true;
      setCamera("active");

      const detect = () => {
        const video = videoRef.current;
        if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const result = landmarker.detectForVideo(video, performance.now());
          const points = result.landmarks[0];
          if (points?.[4] && points[8]) {
            const thumb = points[4];
            const index = points[8];
            const distance = Math.hypot(thumb.x - index.x, thumb.y - index.y);
            if (distance < 0.06 && pinchArmedRef.current) {
              pinchArmedRef.current = false;
              onPinch();
            } else if (distance > 0.1) {
              pinchArmedRef.current = true;
            }
          } else {
            pinchArmedRef.current = true;
          }
        }
        frameRef.current = requestAnimationFrame(detect);
      };
      frameRef.current = requestAnimationFrame(detect);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCamera(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error");
    }
  }

  const message = {
    idle: "",
    asking: t.showcase.cameraAsking,
    active: t.showcase.cameraGranted,
    denied: t.showcase.cameraDenied,
    unavailable: t.showcase.cameraUnavailable,
    error: t.showcase.gestureError,
  }[camera];

  return (
    <section aria-labelledby="gestures-title">
      <h2 id="gestures-title">{t.showcase.gesturesTitle}</h2>
      <p>{t.showcase.gesturesNote}</p>
      <button type="button" onClick={askForCamera} disabled={camera === "asking"}>
        {camera === "active" ? t.showcase.disableGestures : t.showcase.enableGestures}
      </button>
      <video ref={videoRef} aria-label={t.showcase.cameraPreview} autoPlay playsInline muted hidden={camera !== "active"} />
      <p role="status" aria-live="polite" data-testid="camera-status">
        {message}
      </p>
    </section>
  );
}
