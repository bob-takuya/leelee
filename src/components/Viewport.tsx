import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import type { Member } from '../types';

function NodeMeshes() {
  const nodes = useStore((s) => s.nodes);
  const selected = useStore((s) => s.selectedNodeId);
  const setSelected = useStore((s) => s.setSelectedNode);
  const deleteNode = useStore((s) => s.deleteNode);
  const step = useStore((s) => s.step);

  return (
    <group>
      {nodes.map((n) => {
        const isSelected = selected === n.id;
        return (
          <group key={n.id} position={n.position}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                setSelected(isSelected ? null : n.id);
              }}
              onContextMenu={(e) => {
                e.stopPropagation();
                if (step === 'place') deleteNode(n.id);
              }}
            >
              <sphereGeometry args={[0.07, 24, 24]} />
              <meshStandardMaterial
                color={isSelected ? '#6ee7ff' : '#ffffff'}
                emissive={isSelected ? '#6ee7ff' : '#000000'}
                emissiveIntensity={isSelected ? 0.6 : 0}
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
            <Html
              center
              distanceFactor={8}
              position={[0.12, 0.12, 0]}
              style={{
                pointerEvents: 'none',
                fontSize: 10,
                fontFamily: 'monospace',
                color: '#94a3b8',
                whiteSpace: 'nowrap',
              }}
            >
              {n.id}
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function MemberMesh({ m }: { m: Member }) {
  const nodes = useStore((s) => s.nodes);
  const hovered = useStore((s) => s.hoveredMemberId);
  const setHover = useStore((s) => s.setHoveredMember);
  const toggleStrut = useStore((s) => s.toggleStrut);
  const step = useStore((s) => s.step);
  const thicknessScale = useStore((s) => s.thicknessScale);
  const forceDensities = useStore((s) => s.forceDensities);

  const a = nodes.find((n) => n.id === m.nodeA);
  const b = nodes.find((n) => n.id === m.nodeB);
  if (!a || !b) return null;

  const color =
    m.type === 'strut'
      ? '#ef4444'
      : m.type === 'cable'
        ? '#3b82f6'
        : m.type === 'candidate'
          ? '#64748b'
          : '#1e293b';
  const isHovered = hovered === m.id;

  const { position, quaternion, length } = useMemo(() => {
    const pa = new THREE.Vector3(...a.position);
    const pb = new THREE.Vector3(...b.position);
    const dir = new THREE.Vector3().subVectors(pb, pa);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(pa, pb).multiplyScalar(0.5);
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: mid.toArray() as [number, number, number], quaternion: q, length: len };
  }, [a.position[0], a.position[1], a.position[2], b.position[0], b.position[1], b.position[2]]);

  if (m.type === 'removed') return null;

  let radius = 0.018;
  if (m.type === 'strut') radius = 0.04;
  if (m.type === 'cable') radius = 0.022;
  if (isHovered) radius *= 1.6;
  if (thicknessScale && forceDensities[m.id] !== undefined) {
    radius *= 0.5 + Math.min(2, Math.abs(forceDensities[m.id]));
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (step === 'strut') toggleStrut(m.id);
  };

  return (
    <mesh
      position={position}
      quaternion={quaternion}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(m.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHover(null);
      }}
    >
      <cylinderGeometry args={[radius, radius, length, 12, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={isHovered ? '#6ee7ff' : '#000000'}
        emissiveIntensity={isHovered ? 0.3 : 0}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}

function Members() {
  const members = useStore((s) => s.members);
  return (
    <group>
      {members.map((m) => (
        <MemberMesh key={m.id} m={m} />
      ))}
    </group>
  );
}

function ClickCatcher() {
  // Click on empty space adds a node (only in place step).
  const step = useStore((s) => s.step);
  const addNodeAt = useStore((s) => s.addNodeAt);
  if (step !== 'place') return null;
  return (
    <mesh
      onClick={(e) => {
        // Only add a node when the click is on the ground catcher itself.
        if (e.object !== e.eventObject) return;
        const p = e.point;
        addNodeAt([
          Math.round(p.x * 20) / 20,
          Math.round(p.y * 20) / 20,
          Math.round(p.z * 20) / 20,
        ]);
      }}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      visible={false}
    >
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial />
    </mesh>
  );
}

export default function Viewport() {
  const [cameraKey, setCameraKey] = useState(0);
  const controlsRef = useRef<any>(null);

  const resetView = (which: 'front' | 'top' | 'side' | 'iso') => {
    if (!controlsRef.current) return;
    const c = controlsRef.current;
    const cam = c.object as THREE.PerspectiveCamera;
    const dist = 6;
    if (which === 'front') cam.position.set(0, 0.5, dist);
    if (which === 'top') cam.position.set(0.01, dist, 0.01);
    if (which === 'side') cam.position.set(dist, 0.5, 0);
    if (which === 'iso') cam.position.set(dist * 0.7, dist * 0.7, dist * 0.7);
    c.target.set(0, 0.5, 0);
    c.update();
  };

  return (
    <div className="relative w-full h-full">
      <Canvas
        key={cameraKey}
        camera={{ position: [3.5, 3, 3.5], fov: 45 }}
        gl={{ antialias: true }}
        shadows
      >
        <color attach="background" args={['#0b0f17']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
        <directionalLight position={[-5, -3, -5]} intensity={0.25} />
        <Grid
          position={[0, 0, 0]}
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#1e293b"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#334155"
          fadeDistance={20}
          infiniteGrid
        />
        <ClickCatcher />
        <Members />
        <NodeMeshes />
        <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.12} />
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.9} />
        </GizmoHelper>
      </Canvas>
      <div className="absolute top-3 left-3 flex gap-2">
        <button className="btn" onClick={() => resetView('iso')}>
          ISO
        </button>
        <button className="btn" onClick={() => resetView('front')}>
          Front
        </button>
        <button className="btn" onClick={() => resetView('top')}>
          Top
        </button>
        <button className="btn" onClick={() => resetView('side')}>
          Side
        </button>
        <button className="btn" onClick={() => setCameraKey((k) => k + 1)}>
          Reset
        </button>
      </div>
      <HoverInfo />
    </div>
  );
}

function HoverInfo() {
  const hovered = useStore((s) => s.hoveredMemberId);
  const members = useStore((s) => s.members);
  const nodes = useStore((s) => s.nodes);
  if (!hovered) return null;
  const m = members.find((x) => x.id === hovered);
  if (!m) return null;
  const a = nodes.find((n) => n.id === m.nodeA);
  const b = nodes.find((n) => n.id === m.nodeB);
  if (!a || !b) return null;
  const len = Math.hypot(
    a.position[0] - b.position[0],
    a.position[1] - b.position[1],
    a.position[2] - b.position[2]
  );
  return (
    <div className="absolute bottom-3 left-3 bg-panel/90 border border-line rounded px-3 py-2 text-xs font-mono text-slate-300 pointer-events-none">
      <div>
        <span className="text-slate-500">id</span> {m.id}
      </div>
      <div>
        <span className="text-slate-500">nodes</span> {m.nodeA} ↔ {m.nodeB}
      </div>
      <div>
        <span className="text-slate-500">type</span> {m.type}
      </div>
      <div>
        <span className="text-slate-500">length</span> {len.toFixed(3)}
      </div>
      {m.forceDensity !== undefined && (
        <div>
          <span className="text-slate-500">q</span> {m.forceDensity.toFixed(4)}
        </div>
      )}
    </div>
  );
}
