import type { Node } from '../types';

function uid(prefix: string, i: number): string {
  return `${prefix}${i}`;
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  build: (param?: number) => { nodes: Node[]; suggestedStruts?: [number, number][] };
}

/**
 * Triplex (3-prism) — 6 nodes forming a twisted triangular prism.
 * The canonical tensegrity prism has struts connecting each top vertex
 * to a bottom vertex offset by one (twisted by 150°).
 */
function triplex(): { nodes: Node[]; suggestedStruts: [number, number][] } {
  const r = 1;
  const h = 1.5;
  const twist = (5 * Math.PI) / 6; // 150°
  const nodes: Node[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3;
    nodes.push({ id: uid('n', i), position: [r * Math.cos(a), 0, r * Math.sin(a)] });
  }
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3 + twist;
    nodes.push({ id: uid('n', i + 3), position: [r * Math.cos(a), h, r * Math.sin(a)] });
  }
  // Struts: bottom i -> top i+1 (mod 3)
  const suggestedStruts: [number, number][] = [
    [0, 4],
    [1, 5],
    [2, 3],
  ];
  return { nodes, suggestedStruts };
}

function icosahedron(): { nodes: Node[]; suggestedStruts: [number, number][] } {
  // 12 vertices of a regular icosahedron (golden ratio).
  const phi = (1 + Math.sqrt(5)) / 2;
  const s = 1;
  const coords: [number, number, number][] = [
    [0, s, phi],
    [0, -s, phi],
    [0, s, -phi],
    [0, -s, -phi],
    [s, phi, 0],
    [-s, phi, 0],
    [s, -phi, 0],
    [-s, -phi, 0],
    [phi, 0, s],
    [phi, 0, -s],
    [-phi, 0, s],
    [-phi, 0, -s],
  ];
  const nodes = coords.map((p, i) => ({ id: uid('n', i), position: p }));
  // Six struts connecting antipodal-ish opposite pairs of the "expanded
  // octahedron" configuration (classical 6-strut icosahedral tensegrity).
  const suggestedStruts: [number, number][] = [
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
    [8, 10],
    [9, 11],
  ];
  return { nodes, suggestedStruts };
}

function randomCloud(n = 8): { nodes: Node[] } {
  const nodes: Node[] = [];
  for (let i = 0; i < n; i++) {
    nodes.push({
      id: uid('n', i),
      position: [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1],
    });
  }
  return { nodes };
}

export const PRESETS: Preset[] = [
  {
    id: 'triplex',
    label: 'Triplex (3-prism)',
    description: '6-node twisted triangular prism — the canonical tensegrity primitive.',
    build: triplex,
  },
  {
    id: 'icosahedron',
    label: 'Icosahedron',
    description: '12-node expanded-octahedron tensegrity (6 struts + 24 cables).',
    build: icosahedron,
  },
  {
    id: 'random',
    label: 'Random cloud',
    description: 'Random 3D node cloud for exploratory experiments.',
    build: (n?: number) => randomCloud(n ?? 8),
  },
];
