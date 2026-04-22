'use client';
import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import styles from './GuessWho.module.scss';
import playersData from './players.json';

// ── Types ────────────────────────────────────────────────────────────────────

type HairColor = 'dark' | 'light' | 'bald';
type CardState = 'normal' | 'eliminated' | 'marked' | 'hovered' | 'markedHovered';
type GamePhase = 'start' | 'question' | 'guessing' | 'won';

interface Player {
  id: number;
  name: string;
  number: number;
  hairColor: HairColor;
  hairLength: 'short' | 'long' | null;
  beard: boolean;
  glasses: boolean;
  hat: boolean;
  position: string;
  age: number;
  eyeColor: 'dark' | 'light';
}

interface Question {
  id: string;
  text: string;
  check: (p: Player) => boolean;
}

interface GameStep {
  question: Question;
  answer: boolean;
  toEliminate: number[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const PLAYERS = playersData as Player[];

const QUESTIONS: Question[] = [
  { id: 'beard',    text: '¿Tiene barba?',               check: p => p.beard },
  { id: 'glasses',  text: '¿Lleva gafas?',               check: p => p.glasses },
  { id: 'hat',      text: '¿Lleva gorra?',               check: p => p.hat },
  { id: 'bald',     text: '¿Es calvo?',                  check: p => p.hairColor === 'bald' },
  { id: 'darkHair', text: '¿Tiene el pelo oscuro?',      check: p => p.hairColor === 'dark' },
  { id: 'lightHair',text: '¿Tiene el pelo rubio?',       check: p => p.hairColor === 'light' },
  { id: 'longHair', text: '¿Tiene el pelo largo?',       check: p => p.hairLength === 'long' },
  { id: 'lightEyes',text: '¿Tiene los ojos claros?',     check: p => p.eyeColor === 'light' },
  { id: 'gk',       text: '¿Es portero?',                check: p => p.position === 'portero' },
  { id: 'def',      text: '¿Es defensa?',                check: p => p.position === 'defensa' },
  { id: 'mid',      text: '¿Es centrocampista?',         check: p => p.position === 'centrocampista' },
  { id: 'fwd',      text: '¿Es delantero?',              check: p => p.position === 'delantero' },
  { id: 'over30',   text: '¿Tiene más de 30 años?',      check: p => p.age > 30 },
  { id: 'under25',  text: '¿Tiene menos de 25 años?',    check: p => p.age < 25 },
];

const CARD_W = 1.55;
const CARD_H = 2.0;
const COLS = 5;
const ROWS = 3;
const H_GAP = 0.22;
const V_GAP = 0.28;
const GRID_W = COLS * CARD_W + (COLS - 1) * H_GAP;
const GRID_H = ROWS * CARD_H + (ROWS - 1) * V_GAP;
const START_X = -GRID_W / 2 + CARD_W / 2;
const START_Y = GRID_H / 2 - CARD_H / 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

function cardPosition(i: number): [number, number, number] {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return [START_X + col * (CARD_W + H_GAP), START_Y - row * (CARD_H + V_GAP), 0.01];
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCard(player: Player, state: CardState): THREE.CanvasTexture {
  const W = 256, H = 320;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const e = state === 'eliminated';
  const m = state === 'marked' || state === 'markedHovered';
  const h = state === 'hovered';
  const mh = state === 'markedHovered';

  // Background
  ctx.fillStyle = e ? '#8a8a8a' : m ? (mh ? '#FFBFBF' : '#FFD0D0') : h ? '#FFFBDC' : '#FFF8E8';
  rrect(ctx, 0, 0, W, H, 16); ctx.fill();

  // Border
  ctx.strokeStyle = e ? '#666' : m ? (mh ? '#ff1a1a' : '#e74c3c') : h ? '#FFD700' : '#D4A017';
  ctx.lineWidth = 5;
  rrect(ctx, 2.5, 2.5, W - 5, H - 5, 14); ctx.stroke();

  // Shirt number badge
  ctx.fillStyle = e ? '#777' : '#c0392b';
  ctx.beginPath(); ctx.arc(W - 25, 25, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
  ctx.fillText(String(player.number), W - 25, 30);

  const fX = W / 2, fY = 118, fR = 57;

  // Hair (drawn behind face)
  if (player.hairColor !== 'bald') {
    ctx.fillStyle = e ? '#888' : player.hairColor === 'dark' ? '#1a0800' : '#C89000';
    if (player.hairLength === 'long') {
      ctx.beginPath(); ctx.ellipse(fX, fY - 20, fR + 10, fR * 0.78, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(fX - fR - 14, fY - 12, 18, fR + 18);
      ctx.fillRect(fX + fR - 4, fY - 12, 18, fR + 18);
    } else {
      ctx.beginPath(); ctx.ellipse(fX, fY - 13, fR + 4, fR * 0.7, 0, Math.PI, 0); ctx.fill();
    }
  }

  // Hat (over hair)
  if (player.hat) {
    ctx.fillStyle = e ? '#555' : '#1a1a1a';
    ctx.fillRect(fX - 62, fY - 72, 124, 14);
    ctx.beginPath(); ctx.ellipse(fX, fY - 70, 48, 38, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = e ? '#444' : '#e74c3c';
    ctx.fillRect(fX - 48, fY - 68, 96, 9);
  }

  // Face
  ctx.fillStyle = e ? '#AEAEAE' : '#F5C5A3';
  ctx.beginPath(); ctx.arc(fX, fY, fR, 0, Math.PI * 2); ctx.fill();

  // Ears
  ctx.fillStyle = e ? '#AEAEAE' : '#F5C5A3';
  ctx.beginPath(); ctx.ellipse(fX - fR - 4, fY, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(fX + fR + 4, fY, 10, 14, 0, 0, Math.PI * 2); ctx.fill();

  // Eye whites
  const eY = fY - 11;
  ctx.fillStyle = e ? '#bbb' : '#fff';
  ctx.beginPath(); ctx.ellipse(fX - 20, eY, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(fX + 20, eY, 13, 9, 0, 0, Math.PI * 2); ctx.fill();

  // Iris
  ctx.fillStyle = e ? '#888' : player.eyeColor === 'light' ? '#5DADE2' : '#3D1C02';
  ctx.beginPath(); ctx.arc(fX - 20, eY, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(fX + 20, eY, 6.5, 0, Math.PI * 2); ctx.fill();

  // Pupils
  ctx.fillStyle = e ? '#777' : '#000';
  ctx.beginPath(); ctx.arc(fX - 20, eY, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(fX + 20, eY, 3.5, 0, Math.PI * 2); ctx.fill();

  // Eye shine
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.arc(fX - 17, eY - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(fX + 23, eY - 2, 2.5, 0, Math.PI * 2); ctx.fill();

  // Eyebrows
  const browClr = e ? '#888' : player.hairColor === 'dark' ? '#1a0800' : player.hairColor === 'light' ? '#9A6E00' : '#888';
  ctx.strokeStyle = browClr; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(fX - 34, eY - 17); ctx.quadraticCurveTo(fX - 20, eY - 24, fX - 6, eY - 17); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fX + 6, eY - 17); ctx.quadraticCurveTo(fX + 20, eY - 24, fX + 34, eY - 17); ctx.stroke();

  // Glasses
  if (player.glasses) {
    ctx.strokeStyle = e ? '#777' : '#2C1810'; ctx.lineWidth = 3;
    rrect(ctx, fX - 37, eY - 12, 27, 21, 5); ctx.stroke();
    rrect(ctx, fX + 10, eY - 12, 27, 21, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fX - 10, eY); ctx.lineTo(fX + 10, eY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fX - 37, eY - 4); ctx.lineTo(fX - 54, eY - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fX + 37, eY - 4); ctx.lineTo(fX + 54, eY - 8); ctx.stroke();
  }

  // Nose
  ctx.fillStyle = e ? '#C0C0C0' : '#E8A882';
  ctx.beginPath(); ctx.ellipse(fX, fY + 8, 6, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Beard or mouth
  if (player.beard) {
    const bClr = e ? '#888' : player.hairColor === 'dark' ? '#1a0800' : player.hairColor === 'light' ? '#C89000' : '#777';
    ctx.fillStyle = bClr;
    ctx.beginPath(); ctx.ellipse(fX, fY + 30, 40, 26, 0, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fX, fY + 18, 23, 10, 0, 0, Math.PI); ctx.fill();
  } else {
    ctx.strokeStyle = e ? '#aaa' : '#C68642'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(fX, fY + 18, 13, 0.1, Math.PI - 0.1); ctx.stroke();
  }

  // Name
  ctx.fillStyle = e ? '#888' : '#1a1a2e';
  ctx.font = 'bold 19px Arial'; ctx.textAlign = 'center';
  ctx.fillText(player.name.toUpperCase(), W / 2, H - 52);

  // Position
  ctx.fillStyle = e ? '#aaa' : '#c0392b';
  ctx.font = '12px Arial';
  ctx.fillText(player.position, W / 2, H - 33);

  // Age
  ctx.fillStyle = e ? '#aaa' : '#888';
  ctx.font = '11px Arial';
  ctx.fillText(`${player.age} años`, W / 2, H - 14);

  // Eliminated X
  if (e) {
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(200, 30, 30, 0.7)'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(25, 25); ctx.lineTo(W - 25, H - 25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 25, 25); ctx.lineTo(25, H - 25); ctx.stroke();
  }

  // Marked overlay (about to be eliminated)
  if (m) {
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#e74c3c';
    ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(200, 30, 30, 0.65)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(25, 25); ctx.lineTo(W - 25, H - 25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 25, 25); ctx.lineTo(25, H - 25); ctx.stroke();
  }

  return new THREE.CanvasTexture(c);
}

function updateMesh(mesh: THREE.Mesh, player: Player, state: CardState) {
  const mat = mesh.material as THREE.MeshBasicMaterial;
  if (mat.map) mat.map.dispose();
  mat.map = drawCard(player, state);
  mat.needsUpdate = true;
  const s = state === 'hovered' || state === 'markedHovered' ? 1.06 : 1;
  mesh.scale.set(s, s, 1);
}

function generateStep(secret: Player, eliminated: Set<number>, usedQIds: Set<string>): GameStep | null {
  const active = PLAYERS.filter(p => !eliminated.has(p.id));
  const useful = QUESTIONS.filter(q => {
    if (usedQIds.has(q.id)) return false;
    const ans = q.check(secret);
    return active.some(p => q.check(p) !== ans);
  });
  if (!useful.length) return null;
  const q = useful[Math.floor(Math.random() * useful.length)];
  const ans = q.check(secret);
  return { question: q, answer: ans, toEliminate: active.filter(p => q.check(p) !== ans).map(p => p.id) };
}

// ── Component ────────────────────────────────────────────────────────────────

const GuessWho: React.FC<{ onScoreSaved?: () => void }> = ({ onScoreSaved }) => {
  const { username } = useContext(AppContext);
  const router = useRouter();

  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef = useRef<number>(0);
  const hoveredIdxRef = useRef<number>(-1);

  // Refs kept in sync for Three.js callbacks
  const phaseRef = useRef<GamePhase>('start');
  const eliminatedRef = useRef<Set<number>>(new Set());
  const guessModeRef = useRef<boolean>(false);
  const onClickCardRef = useRef<(p: Player) => void>(() => {});

  // Supabase IDs
  const userIdRef = useRef<string | null>(null);
  const gameIdRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<GamePhase>('start');
  const [secretPlayer, setSecretPlayer] = useState<Player | null>(null);
  const [eliminatedIds, setEliminatedIds] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState<GameStep | null>(null);
  const [usedQIds, setUsedQIds] = useState<Set<string>>(new Set());
  const [questionCount, setQuestionCount] = useState(0);
  const [guessTarget, setGuessTarget] = useState<Player | null>(null);
  const [guessMode, setGuessMode] = useState(false);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { eliminatedRef.current = eliminatedIds; }, [eliminatedIds]);
  useEffect(() => { guessModeRef.current = guessMode; }, [guessMode]);

  useEffect(() => {
    if (!username) router.push('/minijuegos');
  }, [username, router]);

  useEffect(() => {
    if (!username) return;
    const fetch = async () => {
      const { data: u } = await supabase.from('usuarios').select('id').eq('username', username.toLowerCase()).single();
      if (u) userIdRef.current = u.id;
      const { data: g } = await supabase.from('juegos').select('id').eq('slug', 'adivina-quien').single();
      if (g) gameIdRef.current = g.id;
    };
    fetch();
  }, [username]);

  // ── Three.js init ──────────────────────────────────────────────────────────

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 1200;
    const H = mount.clientHeight || 675;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
    camera.position.set(0, 0, 11);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Board background
    const boardMat = new THREE.MeshBasicMaterial({ color: 0x16213e });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(15, 11), boardMat);
    board.position.set(0, 0, -0.05);
    scene.add(board);

    // Card meshes
    const meshes: THREE.Mesh[] = [];
    PLAYERS.forEach((player, i) => {
      const mat = new THREE.MeshBasicMaterial({ map: drawCard(player, 'normal'), transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), mat);
      const [x, y, z] = cardPosition(i);
      mesh.position.set(x, y, z);
      (mesh as unknown as { __idx: number }).__idx = i;
      scene.add(mesh);
      meshes.push(mesh);
    });
    meshesRef.current = meshes;

    // Grid line decorations
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.6 });
    for (let col = 0; col <= COLS; col++) {
      const x = START_X - CARD_W / 2 - H_GAP / 2 + col * (CARD_W + H_GAP);
      const pts = [new THREE.Vector3(x, GRID_H / 2 + 0.1, 0), new THREE.Vector3(x, -GRID_H / 2 - 0.1, 0)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getHit = (cx: number, cy: number): number => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshes);
      return hits.length ? (hits[0].object as unknown as { __idx: number }).__idx : -1;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (phaseRef.current !== 'question') { mount.style.cursor = 'default'; return; }
      const idx = getHit(e.clientX, e.clientY);
      if (idx === hoveredIdxRef.current) return;
      const old = hoveredIdxRef.current;
      if (old >= 0) {
        const p = PLAYERS[old];
        updateMesh(meshes[old], p, eliminatedRef.current.has(p.id) ? 'eliminated' : 'normal');
      }
      hoveredIdxRef.current = idx;
      if (idx >= 0) {
        const p = PLAYERS[idx];
        if (!eliminatedRef.current.has(p.id)) {
          updateMesh(meshes[idx], p, 'hovered');
          mount.style.cursor = 'pointer';
          return;
        }
      }
      mount.style.cursor = 'default';
    };

    const onClick = (e: MouseEvent) => {
      if (phaseRef.current !== 'question') return;
      const idx = getHit(e.clientX, e.clientY);
      if (idx >= 0) {
        const p = PLAYERS[idx];
        if (!eliminatedRef.current.has(p.id)) onClickCardRef.current(p);
      }
    };

    const onTouch = (e: TouchEvent) => {
      if (phaseRef.current !== 'question') return;
      const t = e.touches[0];
      const idx = getHit(t.clientX, t.clientY);
      if (idx >= 0) {
        const p = PLAYERS[idx];
        if (!eliminatedRef.current.has(p.id)) onClickCardRef.current(p);
      }
    };

    mount.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('click', onClick);
    mount.addEventListener('touchstart', onTouch, { passive: true });

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      const W2 = mount.clientWidth;
      const H2 = mount.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('click', onClick);
      mount.removeEventListener('touchstart', onTouch);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Update card textures when elimination or step changes
  useEffect(() => {
    const meshes = meshesRef.current;
    if (!meshes.length) return;
    hoveredIdxRef.current = -1;
    PLAYERS.forEach((p, i) => {
      updateMesh(meshes[i], p, eliminatedIds.has(p.id) ? 'eliminated' : 'normal');
    });
  }, [eliminatedIds, currentStep]);

  // ── Game logic ─────────────────────────────────────────────────────────────

  // Called from Three.js: player clicked a card
  const handleCardClick = useCallback((p: Player) => {
    if (guessModeRef.current) {
      setGuessTarget(p);
      setPhase('guessing');
    } else {
      setEliminatedIds(prev => {
        const next = new Set([...prev, p.id]);
        const remaining = PLAYERS.filter(pl => !next.has(pl.id));
        if (remaining.length === 1 && secretPlayer && remaining[0].id === secretPlayer.id) {
          setTimeout(() => { setCurrentStep(null); setPhase('won'); }, 0);
        }
        return next;
      });
    }
  }, [secretPlayer]);

  useEffect(() => { onClickCardRef.current = handleCardClick; }, [handleCardClick]);

  const startGame = useCallback(() => {
    const secret = PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
    const step = generateStep(secret, new Set(), new Set());
    setSecretPlayer(secret);
    setEliminatedIds(new Set());
    setUsedQIds(step ? new Set([step.question.id]) : new Set());
    setCurrentStep(step);
    setQuestionCount(0);
    setGuessTarget(null);
    setGuessMode(false);
    setPhase('question');
  }, []);

  // Advance to next question — player decided which marked cards to keep or discard already
  const handleNext = useCallback(() => {
    if (!secretPlayer) return;
    const newUsed = new Set([...usedQIds, ...(currentStep ? [currentStep.question.id] : [])]);
    setQuestionCount(c => c + 1);
    const next = generateStep(secretPlayer, eliminatedIds, newUsed);
    setCurrentStep(next);
    setUsedQIds(newUsed);
  }, [currentStep, secretPlayer, eliminatedIds, usedQIds]);

  const confirmGuess = useCallback(() => {
    if (!guessTarget || !secretPlayer) return;
    if (guessTarget.id === secretPlayer.id) {
      setCurrentStep(null);
      setPhase('won');
    } else {
      setEliminatedIds(prev => new Set([...prev, guessTarget.id]));
      setGuessTarget(null);
      setGuessMode(false);
      setPhase('question');
    }
  }, [guessTarget, secretPlayer]);

  const cancelGuess = useCallback(() => {
    setGuessTarget(null);
    setGuessMode(false);
    setPhase('question');
  }, []);

  const saveScore = useCallback(async (qCount: number) => {
    if (!userIdRef.current || !gameIdRef.current) return;
    const finalScore = Math.max(10, 100 - qCount * 7);
    const { data: existing } = await supabase.from('puntuaciones').select('score')
      .eq('usuario_id', userIdRef.current).eq('juego_id', gameIdRef.current).maybeSingle();
    if (!existing || finalScore > existing.score) {
      const { error } = await supabase.from('puntuaciones').upsert({
        usuario_id: userIdRef.current, juego_id: gameIdRef.current,
        score: finalScore, alcanzado_at: new Date().toISOString(),
      }, { onConflict: 'usuario_id, juego_id' });
      if (!error && onScoreSaved) setTimeout(onScoreSaved, 300);
    }
  }, [onScoreSaved]);

  useEffect(() => {
    if (phase === 'won') saveScore(questionCount);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = PLAYERS.filter(p => !eliminatedIds.has(p.id)).length;
  const score = Math.max(10, 100 - questionCount * 7);

  return (
    <div className={styles.gw}>

      {/* ── Board (canvas + overlays) ─────────────────────────────────────── */}
      <div className={styles.gw__board}>
        <div ref={mountRef} className={styles.gw__canvas} />

        {/* Pulsing gold border in guess mode */}
        {guessMode && <div className={styles.gw__guessBorder} />}

        {/* HUD strip */}
        {phase === 'question' && (
          <div className={styles.gw__hud}>
            <span className={styles.gw__hudStat}>
              <b>{activeCount}</b> restantes
            </span>
            <span className={styles.gw__hudStat}>
              <b>{questionCount}</b> pistas
            </span>
          </div>
        )}

        {/* START overlay */}
        {phase === 'start' && (
          <div className={styles.gw__overlay}>
            <p className={styles.gw__sub}>MINIJUEGO</p>
            <h1 className={styles.gw__overlayTitle}>ADIVINA QUIÉN</h1>
            <p className={styles.gw__desc}>
              Recibe una pista y descarta jugadores haciendo clic en ellos.<br />
              Cuando creas que sabes quién es, pulsa <b>ADIVINAR</b>.<br />
              ¡Cuantas menos pistas uses, más puntos!
            </p>
            <button className={styles.gw__btn} onClick={startGame}>EMPEZAR</button>
          </div>
        )}

        {/* Guess confirmation overlay */}
        {phase === 'guessing' && guessTarget && (
          <div className={styles.gw__overlay}>
            <p className={styles.gw__sub}>TU APUESTA</p>
            <h2 className={styles.gw__overlayTitle}>¿Es {guessTarget.name}?</h2>
            <div className={styles.gw__overlayBtns}>
              <button className={`${styles.gw__btn} ${styles['gw__btn--yes']}`} onClick={confirmGuess}>
                ¡SÍ, ES ÉL!
              </button>
              <button className={`${styles.gw__btn} ${styles['gw__btn--cancel']}`} onClick={cancelGuess}>
                CANCELAR
              </button>
            </div>
          </div>
        )}

        {/* Won overlay */}
        {phase === 'won' && secretPlayer && (
          <div className={styles.gw__overlay}>
            <p className={styles.gw__sub}>¡LO HAS ADIVINADO!</p>
            <h2 className={styles.gw__overlayTitle}>¡{secretPlayer.name}!</h2>
            <div className={styles.gw__finalScore}>{score}</div>
            <p className={styles.gw__desc}>
              {questionCount} pista{questionCount !== 1 ? 's' : ''} · {activeCount} jugador{activeCount !== 1 ? 'es' : ''} restante{activeCount !== 1 ? 's' : ''}
            </p>
            <button className={styles.gw__btn} onClick={startGame}>JUGAR DE NUEVO</button>
          </div>
        )}
      </div>

      {/* ── Controls panel (below board) ──────────────────────────────────── */}
      {phase === 'question' && (
        <div className={`${styles.gw__controls} ${guessMode ? styles['gw__controls--guess'] : ''}`}>

          {/* Left: current instruction */}
          <div className={styles.gw__controlsInfo}>
            {guessMode ? (
              <>
                <span className={styles.gw__controlsLabel}>MODO ADIVINAR</span>
                <span className={styles.gw__controlsHint}>
                  Haz clic en el jugador que crees que es el secreto
                </span>
              </>
            ) : currentStep ? (
              <>
                <div className={styles.gw__questionRow}>
                  <span className={styles.gw__questionText}>{currentStep.question.text}</span>
                  <span className={`${styles.gw__answerBadge} ${currentStep.answer ? styles['gw__answerBadge--yes'] : styles['gw__answerBadge--no']}`}>
                    {currentStep.answer ? 'SÍ' : 'NO'}
                  </span>
                </div>
                <span className={styles.gw__controlsHint}>
                  Haz clic en los jugadores del tablero para descartarlos
                </span>
              </>
            ) : (
              <>
                <span className={styles.gw__controlsLabel}>SIN MÁS PISTAS</span>
                <span className={styles.gw__controlsHint}>
                  Descarta jugadores o adivina directamente
                </span>
              </>
            )}
          </div>

          {/* Right: action buttons */}
          <div className={styles.gw__controlsBtns}>
            {guessMode ? (
              <button
                className={`${styles.gw__btn} ${styles['gw__btn--cancel']}`}
                onClick={() => setGuessMode(false)}
              >
                ← VOLVER
              </button>
            ) : (
              <>
                {currentStep && (
                  <button
                    className={`${styles.gw__btn} ${styles['gw__btn--next']}`}
                    onClick={handleNext}
                  >
                    SIGUIENTE PISTA →
                  </button>
                )}
                <button
                  className={`${styles.gw__btn} ${styles['gw__btn--guess']}`}
                  onClick={() => setGuessMode(true)}
                >
                  ADIVINAR
                </button>
              </>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default GuessWho;
