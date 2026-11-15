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

function GlobeOrbits({ animate }: { animate: boolean }) {
  const group = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (animate && group.current) group.current.rotation.y += delta * 0.12;
  });
  return (
    <group position={[0, 0, -0.6]}>
      <mesh ref={group} rotation={[0.3, 0, 0.15]}>
        <sphereGeometry args={[1.35, 24, 18]} />
        <meshStandardMaterial color="#1247B8" wireframe transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[Math.PI / 2.6, 0.25, 0]}>
        <torusGeometry args={[1.65, 0.015, 8, 64]} />
        <meshStandardMaterial color="#E9B824" />
      </mesh>
      <mesh rotation={[Math.PI / 3.2, -0.4, 0]}>
        <torusGeometry args={[1.95, 0.012, 8, 64]} />
        <meshStandardMaterial color="#a9c8ff" />
      </mesh>
      <mesh rotation={[Math.PI / 1.9, 0.1, 0.3]}>
        <torusGeometry args={[2.25, 0.01, 8, 64]} />
        <meshStandardMaterial color="#8a94a3" />
      </mesh>
    </group>
  );
}

function Tile({ color, animate }: { color: string; animate: boolean }) {
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (animate && mesh.current) mesh.current.rotation.z += delta * 0.15;
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 3, 0, 0]} position={[0, 0, 0.25]}>
      <planeGeometry args={[1.35, 1.35, 1, 1]} />
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
      <GlobeOrbits animate={!reducedMotion} />
      <Tile color={color} animate={!reducedMotion} />
    </Canvas>
  );
}
