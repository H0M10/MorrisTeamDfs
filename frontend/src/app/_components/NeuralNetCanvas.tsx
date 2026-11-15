"use client";
// Escena WebGL 3D interactiva para el Modelo 3 (GRU de 32 unidades + atención temporal).
// Se carga exclusivamente de forma dinámica desde la portada para no añadir three.js al bundle de /tool.
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  type ComponentRef,
  type ReactNode,
} from "react";
import * as THREE from "three";

export type MorphMode = "layers" | "constellation" | "helix";
export type DensityLevel = "low" | "medium" | "high";

export interface InputMonthDatum {
  index: number;
  month: string;
  label: string;
  colorHex: string;
  weight: number;
  isTopAttention: boolean;
  ndvi: number | null;
}

export interface OutputClassDatum {
  key: string;
  label: string;
  probability: number | null;
  isPredicted: boolean;
  isTruth: boolean;
}

export interface NeuralNetCanvasProps {
  morphMode: MorphMode;
  frozen: boolean;
  reducedMotion: boolean;
  density: DensityLevel;
  yearIndex: number;
  resetSignal: number;
  yearInputs: InputMonthDatum[];
  allInputs: InputMonthDatum[];
  outputs: OutputClassDatum[];
  canvasAlt: string;
  webglFallback: string;
}

const GRU_COUNT = 32;
const ATTN_COUNT = 1;
const PULSE_COUNT = 64;

interface NodeMeta {
  kind: "input" | "gru" | "attention" | "output";
  index: number;
  baseColor: THREE.Color;
  haloColor: THREE.Color;
  baseScale: number;
  haloScale: number;
  isHighlight: boolean;
}

interface SynapseEdge {
  from: number;
  to: number;
  weight: number;
  tier: "low" | "medium" | "high";
}

function clampColor(hex: string, lift = 0.25): THREE.Color {
  const c = new THREE.Color();
  try {
    c.set(hex || "#7a6c56");
  } catch {
    c.set("#7a6c56");
  }
  // Aclara colores oscuros de suelo para que se distingan sobre el fondo cósmico.
  const gold = new THREE.Color("#f5d061");
  c.lerp(gold, lift);
  return c;
}

function createGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.18, "rgba(255, 248, 225, 0.85)");
    grad.addColorStop(0.45, "rgba(245, 208, 97, 0.28)");
    grad.addColorStop(0.75, "rgba(96, 165, 250, 0.08)");
    grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function fibonacciPoint(i: number, total: number, radius: number): THREE.Vector3 {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(1, total));
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}

function computeTargetPositions(
  mode: MorphMode,
  inputCount: number,
  outputCount: number,
): THREE.Vector3[] {
  const targets: THREE.Vector3[] = [];
  if (mode === "layers") {
    // Izquierda -> Derecha: 12 meses HLS -> 32 unidades GRU -> Hub Atención -> 4 Clases
    for (let i = 0; i < inputCount; i += 1) {
      const a = (i / Math.max(1, inputCount)) * Math.PI * 2 - Math.PI / 2;
      targets.push(new THREE.Vector3(-4.8, Math.sin(a) * 2.35, Math.cos(a) * 1.45));
    }
    for (let i = 0; i < GRU_COUNT; i += 1) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const a = (row / 8) * Math.PI * 2 + col * 0.42;
      const x = -1.6 + col * 0.92;
      const r = 1.65 + (col % 2) * 0.45;
      targets.push(new THREE.Vector3(x, Math.sin(a) * r, Math.cos(a) * r));
    }
    targets.push(new THREE.Vector3(2.45, 0, 0));
    for (let i = 0; i < outputCount; i += 1) {
      const y = (1.5 - i) * 1.38;
      targets.push(new THREE.Vector3(5.05, y, (i % 2 === 0 ? 1 : -1) * 0.45));
    }
    return targets;
  }

  if (mode === "constellation") {
    for (let i = 0; i < inputCount; i += 1) {
      const p = fibonacciPoint(i, inputCount, 3.85);
      targets.push(p);
    }
    for (let i = 0; i < GRU_COUNT; i += 1) {
      const p = fibonacciPoint(i, GRU_COUNT, 2.25);
      targets.push(p);
    }
    targets.push(new THREE.Vector3(0, 0, 0));
    for (let i = 0; i < outputCount; i += 1) {
      const angle = (i / Math.max(1, outputCount)) * Math.PI * 2 + Math.PI / 4;
      targets.push(new THREE.Vector3(Math.cos(angle) * 4.9, Math.sin(angle) * 1.65, Math.sin(angle * 2) * 2.1));
    }
    return targets;
  }

  // "helix": ciclo temporal de hasta 36 meses rodeando el núcleo GRU de 32 unidades
  for (let i = 0; i < inputCount; i += 1) {
    const t = i / Math.max(1, inputCount - 1);
    const turns = 3;
    const angle = t * Math.PI * 2 * turns;
    const x = -5.2 + t * 8.2;
    const radius = 2.65;
    targets.push(new THREE.Vector3(x, Math.sin(angle) * radius, Math.cos(angle) * radius));
  }
  for (let i = 0; i < GRU_COUNT; i += 1) {
    const t = i / (GRU_COUNT - 1);
    const angle = t * Math.PI * 4 + Math.PI / 3;
    targets.push(new THREE.Vector3(-4.1 + t * 6.4, Math.sin(angle) * 1.15, Math.cos(angle) * 1.15));
  }
  targets.push(new THREE.Vector3(2.95, 0, 0));
  for (let i = 0; i < outputCount; i += 1) {
    const angle = (i / Math.max(1, outputCount)) * Math.PI * 2;
    targets.push(new THREE.Vector3(5.35, Math.sin(angle) * 1.9, Math.cos(angle) * 1.35));
  }
  return targets;
}

class WebGLErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch() {
    // Error manejado visualmente con la alternativa accesible.
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function Invalidator({ signal }: { signal: string }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [signal, invalidate]);
  return null;
}

function NeuralNetworkScene({
  morphMode,
  frozen,
  reducedMotion,
  density,
  yearIndex,
  resetSignal,
  yearInputs,
  allInputs,
  outputs,
}: Omit<NeuralNetCanvasProps, "canvasAlt" | "webglFallback">) {
  const activeInputs = morphMode === "helix" && allInputs.length > 0 ? allInputs : yearInputs;
  const inputCount = activeInputs.length;
  const outputCount = outputs.length;
  const totalNodes = inputCount + GRU_COUNT + ATTN_COUNT + outputCount;
  const attnIndex = inputCount + GRU_COUNT;
  const outputStartIndex = attnIndex + 1;

  const controlsRef = useRef<ComponentRef<typeof OrbitControls> | null>(null);
  const { camera, invalidate } = useThree();

  useEffect(() => {
    if (resetSignal === 0) return;
    camera.position.set(0, 0.7, 12.2);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.reset();
    invalidate();
  }, [resetSignal, camera, invalidate]);

  const glowTexture = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => glowTexture.dispose(), [glowTexture]);

  const sphereGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const ringGeo = useMemo(() => new THREE.RingGeometry(1.35, 1.58, 32), []);
  const cageGeo = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(4.65, 1);
    const wire = new THREE.WireframeGeometry(ico);
    ico.dispose();
    return wire;
  }, []);
  useEffect(() => {
    return () => {
      sphereGeo.dispose();
      ringGeo.dispose();
      cageGeo.dispose();
    };
  }, [sphereGeo, ringGeo, cageGeo]);

  // Metadatos visuales de cada nodo derivados de los datos reales.
  const nodesMeta = useMemo<NodeMeta[]>(() => {
    const list: NodeMeta[] = [];
    for (let i = 0; i < inputCount; i += 1) {
      const m = activeInputs[i];
      const w = m?.weight ?? 0.08;
      const isTop = m?.isTopAttention ?? false;
      const baseColor = m ? clampColor(m.colorHex, isTop ? 0.55 : 0.22) : new THREE.Color("#7a6c56");
      const haloColor = isTop ? new THREE.Color("#fde047") : clampColor(m?.colorHex ?? "#93c5fd", 0.45);
      list.push({
        kind: "input",
        index: i,
        baseColor,
        haloColor,
        baseScale: 0.14 + Math.min(0.18, w * 0.9) + (isTop ? 0.06 : 0),
        haloScale: 0.55 + Math.min(0.85, w * 4.2) + (isTop ? 0.35 : 0),
        isHighlight: isTop,
      });
    }
    for (let i = 0; i < GRU_COUNT; i += 1) {
      const shade = (i % 5) / 5;
      const baseColor = new THREE.Color().setHSL(0.61 + shade * 0.12, 0.78, 0.72);
      const haloColor = new THREE.Color().setHSL(0.6 + shade * 0.14, 0.85, 0.64);
      list.push({
        kind: "gru",
        index: i,
        baseColor,
        haloColor,
        baseScale: 0.11 + (i % 3 === 0 ? 0.035 : 0),
        haloScale: 0.48 + (i % 4 === 0 ? 0.22 : 0),
        isHighlight: false,
      });
    }
    // Hub de atención temporal
    list.push({
      kind: "attention",
      index: 0,
      baseColor: new THREE.Color("#fef08a"),
      haloColor: new THREE.Color("#f59e0b"),
      baseScale: 0.3,
      haloScale: 1.45,
      isHighlight: true,
    });
    // 4 salidas de cultivo
    for (let i = 0; i < outputCount; i += 1) {
      const out = outputs[i];
      const p = out?.probability;
      const isPred = out?.isPredicted ?? false;
      const baseColor = isPred
        ? new THREE.Color("#4ade80")
        : out?.isTruth
          ? new THREE.Color("#facc15")
          : new THREE.Color("#93c5fd");
      const haloColor = isPred
        ? new THREE.Color("#22c55e")
        : new THREE.Color("#60a5fa");
      const probBoost = p !== null && p !== undefined ? p * 0.26 : 0.08;
      list.push({
        kind: "output",
        index: i,
        baseColor,
        haloColor,
        baseScale: 0.2 + probBoost + (isPred ? 0.07 : 0),
        haloScale: 0.85 + (p ?? 0.25) * 1.35 + (isPred ? 0.4 : 0),
        isHighlight: isPred || (out?.isTruth ?? false),
      });
    }
    return list;
  }, [activeInputs, inputCount, outputCount, outputs]);

  // Sinapsis entre capas (deterministas para evitar parpadeos al re-renderizar).
  const allEdges = useMemo<SynapseEdge[]>(() => {
    const edges: SynapseEdge[] = [];
    for (let i = 0; i < inputCount; i += 1) {
      const weight = activeInputs[i]?.weight ?? 0.08;
      const top = activeInputs[i]?.isTopAttention ?? false;
      for (let k = 0; k < 4; k += 1) {
        const g = (i * 5 + k * 7) % GRU_COUNT;
        const gruIdx = inputCount + g;
        const tier: SynapseEdge["tier"] =
          k === 0 || top ? "low" : k === 1 ? "medium" : "high";
        edges.push({
          from: i,
          to: gruIdx,
          weight: Math.max(0.2, Math.min(1, weight * 5.2 + (top ? 0.4 : 0))),
          tier,
        });
      }
      if (top || i % 3 === 0) {
        edges.push({
          from: i,
          to: attnIndex,
          weight: top ? 1.0 : 0.35,
          tier: top ? "low" : "high",
        });
      }
    }
    for (let g = 0; g < GRU_COUNT; g += 1) {
      const gruIdx = inputCount + g;
      const nextGru = inputCount + ((g + 1) % GRU_COUNT);
      edges.push({
        from: gruIdx,
        to: nextGru,
        weight: 0.35,
        tier: g % 2 === 0 ? "medium" : "high",
      });
      edges.push({
        from: gruIdx,
        to: attnIndex,
        weight: g % 3 === 0 ? 0.8 : 0.42,
        tier: g % 4 === 0 ? "low" : g % 2 === 0 ? "medium" : "high",
      });
    }
    for (let o = 0; o < outputCount; o += 1) {
      const outIdx = outputStartIndex + o;
      const out = outputs[o];
      const p = out?.probability ?? 0.25;
      edges.push({
        from: attnIndex,
        to: outIdx,
        weight: Math.max(0.35, Math.min(1, p * 1.15 + (out?.isPredicted ? 0.25 : 0))),
        tier: "low",
      });
      for (let g = 0; g < 4; g += 1) {
        const gruIdx = inputCount + ((o * 8 + g * 3) % GRU_COUNT);
        edges.push({
          from: gruIdx,
          to: outIdx,
          weight: Math.max(0.25, Math.min(1, p * 0.9)),
          tier: g < 2 ? "medium" : "high",
        });
      }
    }
    return edges;
  }, [activeInputs, attnIndex, inputCount, outputCount, outputStartIndex, outputs]);

  const visibleEdges = useMemo(() => {
    if (density === "high") return allEdges;
    if (density === "medium") return allEdges.filter((e) => e.tier !== "high");
    return allEdges.filter((e) => e.tier === "low");
  }, [allEdges, density]);

  const targetPositions = useMemo(
    () => computeTargetPositions(morphMode, inputCount, outputCount),
    [morphMode, inputCount, outputCount],
  );

  // Estado mutable para interpolación fluida a 60fps sin re-renderizar React ni leer refs en render.
  const currentPositions = useRef<THREE.Vector3[]>([]);

  const nodeGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const lineGroupRef = useRef<THREE.LineSegments | null>(null);
  const pulsePointsRef = useRef<THREE.Points | null>(null);
  const phaseRef = useRef(0);

  const lineGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const pulseGeo = useMemo(() => new THREE.BufferGeometry(), []);

  useEffect(() => {
    const count = Math.max(1, visibleEdges.length);
    const posArr = new Float32Array(count * 2 * 3);
    const colArr = new Float32Array(count * 2 * 3);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
    lineGeo.setDrawRange(0, visibleEdges.length * 2);
  }, [visibleEdges, lineGeo]);

  useEffect(() => {
    const posArr = new Float32Array(PULSE_COUNT * 3);
    const colArr = new Float32Array(PULSE_COUNT * 3);
    pulseGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    pulseGeo.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
  }, [pulseGeo]);

  useEffect(() => {
    return () => {
      lineGeo.dispose();
      pulseGeo.dispose();
    };
  }, [lineGeo, pulseGeo]);

  // Inicializa o salta al destino cuando cambia el tamaño o está congelado/reducido.
  useEffect(() => {
    if (currentPositions.current.length !== totalNodes) {
      currentPositions.current = targetPositions.map((p) => p.clone());
      invalidate();
      return;
    }
    if (!frozen && !reducedMotion) return;
    for (let i = 0; i < totalNodes; i += 1) {
      const target = targetPositions[i];
      const cur = currentPositions.current[i];
      if (target && cur) cur.copy(target);
    }
    invalidate();
  }, [morphMode, yearIndex, density, frozen, reducedMotion, targetPositions, totalNodes, invalidate]);

  const pulseSeeds = useMemo(
    () =>
      Array.from({ length: PULSE_COUNT }, (_, i) => ({
        offset: (i * 0.6180339887) % 1,
        speed: 0.22 + (i % 5) * 0.075,
        edgeIndex: i,
      })),
    [],
  );

  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const colFrom = useMemo(() => new THREE.Color(), []);
  const colTo = useMemo(() => new THREE.Color(), []);

  useFrame((_state, delta) => {
    if (currentPositions.current.length !== totalNodes) {
      currentPositions.current = targetPositions.map((p) => p.clone());
    }
    const animate = !frozen && !reducedMotion;
    if (animate) {
      phaseRef.current += Math.min(0.05, delta);
    }
    const phase = phaseRef.current;
    const lerpSpeed = animate ? Math.min(1, delta * 4.8) : 1;

    for (let i = 0; i < totalNodes; i += 1) {
      const cur = currentPositions.current[i];
      const tgt = targetPositions[i];
      if (!cur || !tgt) continue;
      if (animate) {
        cur.lerp(tgt, lerpSpeed);
      } else {
        cur.copy(tgt);
      }
      const grp = nodeGroupRefs.current[i];
      if (grp) {
        const bob = animate ? Math.sin(phase * 1.4 + i * 0.6) * 0.045 : 0;
        grp.position.set(cur.x, cur.y + bob, cur.z);
        const meta = nodesMeta[i];
        if (meta?.isHighlight && animate) {
          const pulse = 1 + Math.sin(phase * 3.1 + i) * 0.1;
          grp.scale.setScalar(pulse);
        } else {
          grp.scale.setScalar(1);
        }
      }
    }

    const posAttr = lineGeo.getAttribute("position") as THREE.BufferAttribute | undefined;
    const colAttr = lineGeo.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (posAttr && colAttr && visibleEdges.length > 0) {
      const pArr = posAttr.array as Float32Array;
      const cArr = colAttr.array as Float32Array;
      for (let e = 0; e < visibleEdges.length; e += 1) {
        const edge = visibleEdges[e];
        if (!edge) continue;
        const a = currentPositions.current[edge.from];
        const b = currentPositions.current[edge.to];
        const mA = nodesMeta[edge.from];
        const mB = nodesMeta[edge.to];
        if (!a || !b || !mA || !mB) continue;
        const base = e * 6;
        pArr[base] = a.x;
        pArr[base + 1] = a.y;
        pArr[base + 2] = a.z;
        pArr[base + 3] = b.x;
        pArr[base + 4] = b.y;
        pArr[base + 5] = b.z;

        const gain = 0.28 + edge.weight * 0.72;
        colFrom.copy(mA.baseColor).multiplyScalar(gain);
        colTo.copy(mB.baseColor).multiplyScalar(gain);
        cArr[base] = colFrom.r;
        cArr[base + 1] = colFrom.g;
        cArr[base + 2] = colFrom.b;
        cArr[base + 3] = colTo.r;
        cArr[base + 4] = colTo.g;
        cArr[base + 5] = colTo.b;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    const pulsePos = pulseGeo.getAttribute("position") as THREE.BufferAttribute | undefined;
    const pulseCol = pulseGeo.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (pulsePos && pulseCol && visibleEdges.length > 0) {
      const pArr = pulsePos.array as Float32Array;
      const cArr = pulseCol.array as Float32Array;
      for (let i = 0; i < PULSE_COUNT; i += 1) {
        const seed = pulseSeeds[i];
        if (!seed) continue;
        const edge = visibleEdges[seed.edgeIndex % visibleEdges.length];
        if (!edge) continue;
        const a = currentPositions.current[edge.from];
        const b = currentPositions.current[edge.to];
        const mB = nodesMeta[edge.to];
        if (!a || !b || !mB) continue;
        const t = animate ? (seed.offset + phase * seed.speed) % 1 : seed.offset;
        tempVec.copy(a).lerp(b, t);
        const idx = i * 3;
        pArr[idx] = tempVec.x;
        pArr[idx + 1] = tempVec.y;
        pArr[idx + 2] = tempVec.z;
        cArr[idx] = Math.min(1, mB.haloColor.r + 0.35);
        cArr[idx + 1] = Math.min(1, mB.haloColor.g + 0.35);
        cArr[idx + 2] = Math.min(1, mB.haloColor.b + 0.35);
      }
      pulsePos.needsUpdate = true;
      pulseCol.needsUpdate = true;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      {morphMode === "constellation" && (
        <lineSegments geometry={cageGeo}>
          <lineBasicMaterial color="#475569" transparent opacity={0.18} />
        </lineSegments>
      )}
      <lineSegments ref={lineGroupRef} geometry={lineGeo}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.44}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      <points ref={pulsePointsRef} geometry={pulseGeo}>
        <pointsMaterial
          size={0.28}
          map={glowTexture}
          vertexColors
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      {nodesMeta.map((meta, idx) => (
        <group
          key={`${meta.kind}-${meta.index}-${idx}`}
          ref={(el) => {
            nodeGroupRefs.current[idx] = el;
          }}
        >
          <mesh geometry={sphereGeo} scale={meta.baseScale}>
            <meshBasicMaterial color={meta.baseColor} toneMapped={false} />
          </mesh>
          <sprite scale={[meta.haloScale, meta.haloScale, 1]}>
            <spriteMaterial
              map={glowTexture}
              color={meta.haloColor}
              transparent
              opacity={meta.isHighlight ? 0.92 : 0.56}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
          {meta.isHighlight && (
            <mesh geometry={ringGeo} scale={meta.baseScale * 1.35}>
              <meshBasicMaterial
                color={meta.haloColor}
                side={THREE.DoubleSide}
                transparent
                opacity={0.75}
                toneMapped={false}
              />
            </mesh>
          )}
        </group>
      ))}
      <OrbitControls
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        autoRotate={!frozen && !reducedMotion}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function NeuralNetCanvas(props: NeuralNetCanvasProps) {
  const { canvasAlt, webglFallback, ...sceneProps } = props;
  const sig = `${props.morphMode}-${props.yearIndex}-${props.density}-${props.frozen}-${props.resetSignal}-${props.yearInputs[0]?.month ?? ""}`;

  return (
    <div className="nn-canvas-frame" role="region" aria-label={canvasAlt}>
      <WebGLErrorBoundary
        fallback={
          <div className="nn-webgl-fallback" role="status">
            <p>{webglFallback}</p>
          </div>
        }
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.7, 12.2], fov: 46, near: 0.1, far: 100 }}
          frameloop={props.frozen || props.reducedMotion ? "demand" : "always"}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        >
          <Invalidator signal={sig} />
          <NeuralNetworkScene {...sceneProps} />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
export default NeuralNetCanvas;
