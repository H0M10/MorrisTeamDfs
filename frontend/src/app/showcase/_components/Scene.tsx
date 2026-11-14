"use client";
// Lienzo de prueba con three. Este archivo es el único de la app que importa
// three; llega al navegador solo cuando /showcase lo pide (ver page.tsx).
// Hoy: un cuadro plano con el color real de la parcela en el mes elegido.
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

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
}: {
  color: string;
  reducedMotion: boolean;
  label: string;
}) {
  return (
    <Canvas
      role="img"
      aria-label={label}
      frameloop={reducedMotion ? "demand" : "always"}
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 4, 3]} intensity={1.5} />
      <Tile color={color} animate={!reducedMotion} />
    </Canvas>
  );
}
