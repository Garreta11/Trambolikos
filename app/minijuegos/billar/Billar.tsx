'use client';

import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import styles from './page.module.scss';
import { AppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Billar({ onScoreSaved }: { onScoreSaved?: () => void }) {
  const { username } = useContext(AppContext);
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);
  const gameIdRef = useRef<string | null>(null);

  const [shots, setShots] = useState(0);
  const [pocketed, setPocketed] = useState(0);
  const [gameOver, setGameOver] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [pocketToast, setPocketToast] = useState<{ name: string; img: string } | null>(null);
  const pocketMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!username) router.push('/minijuegos');
  }, [username, router]);

  useEffect(() => {
    if (!username) return;
    const fetch = async () => {
      const { data: u } = await supabase.from('usuarios').select('id').eq('username', username.toLowerCase()).single();
      if (u) userIdRef.current = u.id;
      const { data: g } = await supabase.from('juegos').select('id').eq('slug', 'billar').single();
      if (g) gameIdRef.current = g.id;
    };
    fetch();
  }, [username]);

  const saveScore = useCallback(async (finalShots: number) => {
    if (!userIdRef.current || !gameIdRef.current || finalShots <= 0) return;
    const { data: existing } = await supabase
      .from('puntuaciones').select('score')
      .eq('usuario_id', userIdRef.current).eq('juego_id', gameIdRef.current).maybeSingle();
    // Lower shots = better
    if (!existing || finalShots < existing.score) {
      const { error } = await supabase.from('puntuaciones').upsert({
        usuario_id: userIdRef.current,
        juego_id: gameIdRef.current,
        score: finalShots,
        alcanzado_at: new Date().toISOString(),
      }, { onConflict: 'usuario_id, juego_id' });
      if (!error && onScoreSaved) setTimeout(onScoreSaved, 300);
    }
  }, [onScoreSaved]);

  const initGame = useCallback(async () => {
    if (!containerRef.current || gameRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { default: BillarGame } = await import('./Billar.js') as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gameRef.current = new (BillarGame as any)({
      container: containerRef.current,
      onShotChange: (s: number) => setShots(s),
      onBallPocketed: (p: number, name?: string, img?: string) => {
        setPocketed(p);
        if (name && img) {
          if (pocketMsgTimer.current) clearTimeout(pocketMsgTimer.current);
          setPocketToast({ name, img });
          pocketMsgTimer.current = setTimeout(() => setPocketToast(null), 2500);
        }
      },
      onGameOver: (finalShots: number) => {
        setGameOver(finalShots);
        saveScore(finalShots);
      },
    });
  }, [saveScore]);

  // Initialize scene immediately so it's visible behind the start overlay
  useEffect(() => {
    initGame();
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [initGame]);

  const handleStart = () => {
    setStarted(true);
    gameRef.current?.startGame();
  }

  const handleRestart = () => {
    setGameOver(null);
    setShots(0);
    setPocketed(0);
    gameRef.current?.reset();
  };

  const TOTAL = 15;

  return (
    <div className={styles.game}>
      <div ref={containerRef} className={styles.canvas} />

      {/* HUD */}
      {started && !gameOver && (
        <div className={styles.hud}>
          <div className={styles.hudShots}>
            <span className={styles.hudLabel}>Golpes</span>
            <span className={styles.hudValue}>{shots.toString().padStart(2, '0')}</span>
          </div>
          <div className={styles.hudBalls}>
            <span className={styles.hudLabel}>Metidas</span>
            <span className={`${styles.hudValue} ${styles['hudValue--gold']}`}>
              {pocketed}/{TOTAL}
            </span>
          </div>
        </div>
      )}

      {/* Start overlay */}
      {!started && (
        <div className={styles.overlay}>
          <div className={styles.overlayBox}>
            <span className={styles.overlayEyebrow}>Minijuego</span>
            <h1 className={styles.overlayTitle}>ELIMINA A LOS CALVOS</h1>
            <p className={styles.overlaySubtitle}>Mete todos los calvos con los mínimos golpes posibles</p>
            <button className={styles.startBtn} onClick={handleStart}>
              EMPEZAR
            </button>
          </div>
        </div>
      )}

      {/* Pocket toast */}
      {pocketToast && (
        <div className={styles.pocketToast}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pocketToast.img} alt={pocketToast.name} className={styles.pocketToastImg} />
          <span className={styles.pocketToastLabel}>UN</span>
          <span className={styles.pocketToastName}>{pocketToast.name}</span>
          <span className={styles.pocketToastLabel}>MENOS</span>
        </div>
      )}

      {/* Game over overlay */}
      {gameOver !== null && (
        <div className={styles.overlay}>
          <div className={styles.overlayBox}>
            <span className={styles.overlayEyebrow}>¡Partida completada!</span>
            <h1 className={styles.overlayTitle}>¡Todas dentro!</h1>
            <div className={styles.overlayStats}>
              <div className={styles.overlayStat}>
                <span className={styles.overlayStatLabel}>Golpes totales</span>
                <span className={`${styles.overlayStatValue} ${styles['overlayStatValue--gold']}`}>
                  {gameOver}
                </span>
              </div>
            </div>
            <p className={styles.overlayHint}>
              {gameOver <= 20 ? '¡Eres un maestro del taco!' :
               gameOver <= 35 ? '¡Buen juego, sigue practicando!' :
               'La práctica hace al maestro...'}
            </p>
            <button className={styles.startBtn} onClick={handleRestart}>
              Nueva partida
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
