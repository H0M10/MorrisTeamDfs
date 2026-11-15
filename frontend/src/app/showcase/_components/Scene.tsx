"use client";
// Lienzo de prueba con three. Este archivo es el único de la app que importa
// three; llega al navegador solo cuando /showcase lo pide (ver page.tsx).
// Hoy: un cuadro plano con el color real de la parcela en el mes elegido.
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function CameraRig({
  cameraDistance,
  reducedMotion,
  onCameraStateChange,
}: {
  cameraDistance: number;
  reducedMotion: boolean;
  onCameraStateChange: (animating: boolean, distance: number) => void;
}) {
  const animating = useRef(false);
  const lastReported = useRef({ animating: false, distance: 5 });

  useFrame(({ camera }, delta) => {
    const report = (nextAnimating: boolean, distance: number) => {
      if (
        lastReported.current.animating === nextAnimating &&
        Math.abs(lastReported.current.distance - distance) < 0.01
      ) {
        return;
      }
      lastReported.current = { animating: nextAnimating, distance };
      onCameraStateChange(nextAnimating, distance);
    };

    if (reducedMotion) {
      camera.position.set(0, 0, cameraDistance);
      camera.lookAt(0, 0, 0);
      animating.current = false;
      report(false, cameraDistance);
      return;
    }

    const difference = cameraDistance - camera.position.z;
    if (Math.abs(difference) > 0.01) {
      if (!animating.current) {
        animating.current = true;
        report(true, camera.position.z);
      }
      camera.position.z += difference * Math.min(1, delta * 3);
      camera.lookAt(0, 0, 0);
      return;
    }

    camera.position.set(0, 0, cameraDistance);
    camera.lookAt(0, 0, 0);
    animating.current = false;
    report(false, cameraDistance);
  });
  return null;
}

function Tile({ color, animate }: { color: string; animate: boolean }) {
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (animate && mesh.current) mesh.current.rotation.z += delta * 0.15;
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 3, 0, 0]}>
      <planeGeometry args={[3, 3, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export default function Scene({
  color,
  reducedMotion,
  label,
  cameraDistance,
  onCameraStateChange,
}: {
  color: string;
  reducedMotion: boolean;
  label: string;
  cameraDistance: number;
  onCameraStateChange: (animating: boolean, distance: number) => void;
}) {
  return (
    <Canvas
      role="img"
      aria-label={label}
      frameloop={reducedMotion ? "demand" : "always"}
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 1.5]}
    >
      <CameraRig
        cameraDistance={cameraDistance}
        reducedMotion={reducedMotion}
        onCameraStateChange={onCameraStateChange}
      />
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 4, 3]} intensity={1.5} />
      <Tile color={color} animate={!reducedMotion} />
    </Canvas>
  );
}
