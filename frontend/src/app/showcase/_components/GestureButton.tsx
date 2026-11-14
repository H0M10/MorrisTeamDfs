"use client";
// La cámara solo se activa con este botón (AGENTS.md sección 8). Hoy solo pide
// el permiso y apaga la cámara de inmediato: el reconocimiento de gestos con
// @mediapipe/tasks-vision lo construye la persona 5 (ver README.md).
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

type CameraState = "idle" | "asking" | "granted" | "denied" | "unavailable";

export function GestureButton() {
  const { t } = useI18n();
  const [camera, setCamera] = useState<CameraState>("idle");

  async function askForCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("unavailable");
      return;
    }
    setCamera("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCamera("granted");
    } catch {
      setCamera("denied");
    }
  }

  const message = {
    idle: "",
    asking: t.showcase.cameraAsking,
    granted: t.showcase.cameraGranted,
    denied: t.showcase.cameraDenied,
    unavailable: t.showcase.cameraUnavailable,
  }[camera];

  return (
    <section aria-labelledby="gestures-title">
      <h2 id="gestures-title">{t.showcase.gesturesTitle}</h2>
      <p>{t.showcase.gesturesNote}</p>
      <button type="button" onClick={askForCamera} disabled={camera === "asking"}>
        {t.showcase.enableGestures}
      </button>
      <p role="status" aria-live="polite" data-testid="camera-status">
        {message}
      </p>
    </section>
  );
}
