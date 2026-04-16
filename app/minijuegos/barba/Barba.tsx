'use client';

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import styles from './Barba.module.scss';
import Image from 'next/image';
import { AppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// ── Constants ──────────────────────────────────────────────────────────────────
const TOTAL_ROUNDS = 5;
const BARBA_SIZE = 600; // px — rendered size of the moving barba
const TARGET_SIZE = 140; // px — rendered size of the target zone

// Target is fixed in the lower-centre area (% of container)
const TARGET = { x: 52, y: 70 };

type GameStatus = 'START' | 'PLAYING' | 'RESULT' | 'FINISHED';

// ── Score helpers ──────────────────────────────────────────────────────────────

function calcScore(bx: number, by: number): number {
  const dx = bx - TARGET.x;
  const dy = (by - TARGET.y) * 0.56; // correct for 16:9 aspect ratio
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, Math.round(100 * (1 - dist / 28)));
}

function scoreLabel(s: number) {
  if (s >= 90) return '¡PERFECTO!';
  if (s >= 70) return '¡GENIAL!';
  if (s >= 50) return '¡BIEN!';
  if (s >= 25) return 'REGULAR...';
  return 'FALLO';
}

function scoreColor(s: number) {
  if (s >= 70) return 'gold';
  if (s >= 40) return 'white';
  return 'pink';
}

// ── Component ──────────────────────────────────────────────────────────────────

const BarbaGame: React.FC<{ onScoreSaved: () => void }> = ({ onScoreSaved }) => {
  const { username } = useContext(AppContext);
  const router = useRouter();

  const [gameState, setGameState] = useState<GameStatus>('START');
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [barbaPos, setBarbaPos] = useState({ x: 52, y: 70 });

  // Refs to avoid stale closures in rAF loop
  const posRef = useRef({ x: 50, y: 20 });
  const velRef = useRef({ vx: 0.25, vy: 0.18 });
  const rafRef = useRef<number>(0);
  const loopRef = useRef<FrameRequestCallback | null>(null);
  const gameStateRef = useRef<GameStatus>('START');
  const totalScoreRef = useRef(0);

  const userIdRef = useRef<string | null>(null);
  const gameIdRef = useRef<string | null>(null);

  // Keep gameStateRef in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Redirect if not logged in
  useEffect(() => {
    if (!username) router.push('/minijuegos');
  }, [username, router]);

  // Fetch Supabase IDs
  useEffect(() => {
    if (!username) return;
    const fetch = async () => {
      const { data: u } = await supabase
        .from('usuarios').select('id').eq('username', username.toLowerCase()).single();
      if (u) userIdRef.current = u.id;

      const { data: g } = await supabase
        .from('juegos').select('id').eq('slug', 'barba').single();
      if (g) gameIdRef.current = g.id;
    };
    fetch();
  }, [username]);

  // ── Game loop ────────────────────────────────────────────────────────────────
  // Use a ref to hold the loop fn so it can self-schedule without ESLint complaining.

  loopRef.current = () => {
    if (gameStateRef.current !== 'PLAYING') return;

    const pos = posRef.current;
    const vel = velRef.current;

    pos.x += vel.vx;
    pos.y += vel.vy;

    // Bounce off edges (5% margin so barba doesn't clip)
    if (pos.x < 5 || pos.x > 95) { vel.vx *= -1; pos.x = Math.max(5, Math.min(95, pos.x)); }
    if (pos.y < 5 || pos.y > 95) { vel.vy *= -1; pos.y = Math.max(5, Math.min(95, pos.y)); }

    // Random subtle direction nudge for unpredictability
    if (Math.random() < 0.006) {
      const speed = Math.sqrt(vel.vx ** 2 + vel.vy ** 2);
      const angle = Math.atan2(vel.vy, vel.vx) + (Math.random() - 0.5) * 1.2;
      vel.vx = Math.cos(angle) * speed;
      vel.vy = Math.sin(angle) * speed;
    }

    setBarbaPos({ x: pos.x, y: pos.y });
    rafRef.current = requestAnimationFrame(loopRef.current!);
  };

  // ── Start / stop rAF based on game state ────────────────────────────────────

  useEffect(() => {
    if (gameState === 'PLAYING') {
      rafRef.current = requestAnimationFrame(loopRef.current!);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const startRound = useCallback(() => {
    // Random starting position far from target
    const sx = 5 + Math.random() * 90;
    const sy = 5 + Math.random() * 40; // start in upper half
    posRef.current = { x: sx, y: sy };
    const spd = 0.2 + Math.random() * 0.25;
    const ang = Math.random() * Math.PI * 2;
    velRef.current = { vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd };
    setBarbaPos({ x: sx, y: sy });
    setGameState('PLAYING');
  }, []);

  const handleStop = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') return;
    cancelAnimationFrame(rafRef.current);

    console.log('🎯 Posición barba:', posRef.current.x.toFixed(1), posRef.current.y.toFixed(1));
    const s = calcScore(posRef.current.x, posRef.current.y);
    setLastScore(s);
    setTotalScore(prev => {
      const next = prev + s;
      totalScoreRef.current = next;
      return next;
    });
    setGameState('RESULT');
  }, []);

  const saveScore = async (finalScore: number) => {
    if (!userIdRef.current || !gameIdRef.current || finalScore <= 0) return;
    const { data: existing } = await supabase
      .from('puntuaciones').select('score')
      .eq('usuario_id', userIdRef.current).eq('juego_id', gameIdRef.current).maybeSingle();
    if (!existing || finalScore > existing.score) {
      const { error } = await supabase.from('puntuaciones').upsert({
        usuario_id: userIdRef.current,
        juego_id: gameIdRef.current,
        score: finalScore,
        alcanzado_at: new Date().toISOString(),
      }, { onConflict: 'usuario_id, juego_id' });
      if (!error && onScoreSaved) setTimeout(onScoreSaved, 300);
    }
  };

  const handleNextRound = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      saveScore(totalScoreRef.current);
      setGameState('FINISHED');
    } else {
      setRound(r => r + 1);
      startRound();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, startRound]);

  const restartGame = () => {
    setRound(1);
    setTotalScore(0);
    totalScoreRef.current = 0;
    setLastScore(0);
    startRound();
  };

  // ── Keyboard ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (gameStateRef.current === 'PLAYING') handleStop();
      else if (gameStateRef.current === 'START') startRound();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleStop, startRound]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const isActive = gameState === 'PLAYING' || gameState === 'RESULT';

  return (
    <div className={styles.barba} onClick={gameState === 'PLAYING' ? handleStop : undefined}>
      {/* Fullscreen background */}
      <Image
        src="/minijuegos/barba/10.jpg"
        alt="Fondo"
        fill
        className={styles.barba__bg}
        priority
      />

      {/* Dark vignette overlay for readability */}
      <div className={styles.barba__vignette} />

      {/* Moving / frozen barba */}
      {isActive && (
        <div
          className={`${styles.barba__sprite} ${gameState === 'RESULT' ? styles['barba__sprite--frozen'] : ''}`}
          style={{ left: `${barbaPos.x}%`, top: `${barbaPos.y}%` }}
        >
          <Image
            src="/minijuegos/barba/barba.png"
            alt="Barba"
            width={BARBA_SIZE}
            height={BARBA_SIZE}
            draggable={false}
          />
        </div>
      )}

      {/* HUD */}
      {gameState === 'PLAYING' && (
        <div className={styles.barba__hud}>
          <div className={styles.barba__hudRound}>
            RONDA <span>{round}</span> / {TOTAL_ROUNDS}
          </div>
          <div className={styles.barba__hudScore}>
            {totalScore.toString().padStart(3, '0')} PTS
          </div>
        </div>
      )}

      {/* ── START overlay ── */}
      {gameState === 'START' && (
        <div className={styles.barba__overlay}>
          <p className={styles.barba__overlaySub}>MINIJUEGO</p>
          <h1 className={styles.barba__overlayTitle}>LA BARBA</h1>
          <p className={styles.barba__overlayDesc}>
            Para la barba cuando esté en la zona marcada.<br />
            5 rondas · máx. 500 puntos.
          </p>
          <p className={styles.barba__overlayHint}>
            Pulsa <b>ESPACIO</b> para parar
          </p>
          <button className={styles.barba__btn} onClick={startRound}>
            EMPEZAR
          </button>
        </div>
      )}

      {/* ── RESULT overlay ── */}
      {gameState === 'RESULT' && (
        <div className={`${styles.barba__overlay} ${styles['barba__overlay--result']}`}>
          <div
            className={styles.barba__resultLabel}
            data-color={scoreColor(lastScore)}
          >
            {scoreLabel(lastScore)}
          </div>
          <div>
            <div className={styles.barba__resultScore}>{lastScore}</div>
            <p className={styles.barba__resultSub}>puntos · total {totalScore} / {TOTAL_ROUNDS * 100}</p>
          </div>
          <button className={styles.barba__btn} onClick={handleNextRound}>
            {round >= TOTAL_ROUNDS ? 'VER RESULTADO FINAL' : `RONDA ${round + 1}`}
          </button>
        </div>
      )}

      {/* ── FINISHED overlay ── */}
      {gameState === 'FINISHED' && (
        <div className={`${styles.barba__overlay} ${styles['barba__overlay--finished']}`}>
          <p className={styles.barba__overlaySub}>RESULTADO FINAL</p>
          <div className={styles.barba__finalScore}>{totalScore}</div>
          <p className={styles.barba__finalMax}>de {TOTAL_ROUNDS * 100} puntos posibles</p>
          <p className={styles.barba__finalRating}>{scoreLabel(totalScore / TOTAL_ROUNDS)}</p>
          <button className={styles.barba__btn} onClick={restartGame}>
            REINTENTAR
          </button>
        </div>
      )}

      {/* Mobile tap button */}
      {gameState === 'PLAYING' && (
        <button
          className={styles.barba__tapBtn}
          onPointerDown={(e) => { e.preventDefault(); handleStop(); }}
        >
          ¡PARAR!
        </button>
      )}

      {/* Instructions strip */}
      {gameState === 'PLAYING' && (
        <div className={styles.barba__instructions}>
          Pulsa <b>ESPACIO</b> o toca la pantalla para parar la barba
        </div>
      )}
    </div>
  );
};

export default BarbaGame;
