'use client';

import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import styles from './page.module.scss';
import { AppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type GameResult = 'time';
type GameOverState = { result: GameResult; score: number; kills: number };

const GAME_DURATION = 30;

const CONTROLS = [
  { key: 'W A S D', action: 'Mover' },
  { key: 'Mouse',   action: 'Apuntar' },
  { key: 'LMB',     action: 'Disparar' },
  { key: 'Space',   action: 'Saltar' },
  { key: 'Alt',     action: 'Agacharse' },
  { key: 'R',       action: 'Recargar' },
  { key: 'ESC',     action: 'Pausar' },
];

export default function Shooter({ onScoreSaved }: { onScoreSaved?: () => void }) {
  const { username } = useContext(AppContext);
  const router = useRouter();

  const containerRef  = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef       = useRef<any>(null);
  const hitOverlayRef = useRef<HTMLDivElement>(null);
  const joystickZoneRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const joystickRef   = useRef<any>(null);
  const prevTouchRef  = useRef({ x: 0, y: 0 });
  const userIdRef     = useRef<string | null>(null);
  const gameIdRef     = useRef<string | null>(null);

  const [locked,    setLocked]    = useState(false);
  const [ammo,      setAmmo]      = useState(30);
  const [score,     setScore]     = useState(0);
  const [kills,     setKills]     = useState(0);
  const [timeLeft,  setTimeLeft]  = useState(GAME_DURATION);
  const [reloading, setReloading] = useState(false);
  const [gameOver,  setGameOver]  = useState<GameOverState | null>(null);
  const [isMobile,  setIsMobile]  = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Redirect if not registered
  useEffect(() => {
    if (!username) router.push('/minijuegos');
  }, [username, router]);

  // Fetch Supabase IDs
  useEffect(() => {
    if (!username) return;
    const fetchMetadata = async () => {
      const { data: userData } = await supabase
        .from('usuarios').select('id').eq('username', username.toLowerCase()).single();
      if (userData) userIdRef.current = userData.id;

      const { data: gameData } = await supabase
        .from('juegos').select('id').eq('slug', 'shooter').single();
      if (gameData) gameIdRef.current = gameData.id;
    };
    fetchMetadata();
  }, [username]);

  const saveScore = useCallback(async (finalScore: number) => {
    if (!userIdRef.current || !gameIdRef.current || finalScore <= 0) return;

    const { data: existing } = await supabase
      .from('puntuaciones').select('score')
      .eq('usuario_id', userIdRef.current).eq('juego_id', gameIdRef.current).maybeSingle();

    if (!existing || finalScore > existing.score) {
      const { error } = await supabase.from('puntuaciones').upsert({
        usuario_id: userIdRef.current,
        juego_id:   gameIdRef.current,
        score:      finalScore,
        alcanzado_at: new Date().toISOString(),
      }, { onConflict: 'usuario_id, juego_id' });

      if (!error && onScoreSaved) setTimeout(onScoreSaved, 300);
    }
  }, [onScoreSaved]);

  const initGame = useCallback(async () => {
    if (!containerRef.current || gameRef.current) return;

    const { default: Output } = await import('./Output.js');

    gameRef.current = new Output({
      container:      containerRef.current,
      onAmmoChange:   (a: number)  => setAmmo(a),
      onScoreChange:  (s: number)  => setScore(s),
      onKillsChange:  (k: number)  => setKills(k),
      onTimerChange:  (t: number)  => setTimeLeft(t),
      onReloadChange: (r: boolean) => setReloading(r),
      onGameOver: (result: GameResult, finalScore: number, finalKills: number) => {
        setGameOver({ result, score: finalScore, kills: finalKills });
        setLocked(false);
        saveScore(finalScore);
      },
      onLock:   () => setLocked(true),
      onUnlock: () => setLocked(false),
    });

    if (hitOverlayRef.current) {
      gameRef.current.setHitOverlay(hitOverlayRef.current);
    }
  }, [saveScore]);

  useEffect(() => {
    initGame();
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [initGame]);

  // ── Nipplejs joystick (only when playing on mobile) ───────────────────────

  useEffect(() => {
    if (!locked || !isMobile || !joystickZoneRef.current) return;
    let manager: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    const initJoystick = async () => {
      const nipplejs = (await import('nipplejs')).default;
      manager = nipplejs.create({
        zone:     joystickZoneRef.current!,
        mode:     'static',
        position: { left: '75px', bottom: '75px' },
        color:    'rgba(255,255,255,0.35)',
        size:     110,
      });

      manager.on('move', (_: unknown, data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (data.force < 0.1) return;
        // Use pure angle — never multiply by force before thresholding.
        // sin/cos are already in [-1, 1], threshold ~0.4 covers ±66° per axis.
        const rad = data.angle.radian;
        const sx  = Math.cos(rad);
        const sy  = Math.sin(rad);
        gameRef.current?.setMoveForward(sy  >  0.4);
        gameRef.current?.setMoveBackward(sy < -0.4);
        gameRef.current?.setMoveRight(sx    >  0.4);
        gameRef.current?.setMoveLeft(sx     < -0.4);
      });

      manager.on('end', () => {
        gameRef.current?.setMoveForward(false);
        gameRef.current?.setMoveBackward(false);
        gameRef.current?.setMoveLeft(false);
        gameRef.current?.setMoveRight(false);
      });

      joystickRef.current = manager;
    };

    initJoystick();
    return () => {
      joystickRef.current?.destroy();
      joystickRef.current = null;
    };
  }, [locked, isMobile]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** Desktop: request pointer lock */
  const handleClick = () => {
    if (gameOver?.result || isMobile) return;
    const canvas = containerRef.current?.querySelector('canvas');
    canvas?.requestPointerLock();
  };

  /** Mobile: start without pointer lock */
  const handleStartMobile = () => {
    gameRef.current?.startMobile();
  };

  const handleRestart = () => {
    setGameOver(null);
    setAmmo(30);
    setScore(0);
    setKills(0);
    setTimeLeft(GAME_DURATION);
    setReloading(false);
    setLocked(false);
    gameRef.current?.reset();
  };

  // Touch look handlers
  const handleLookStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    prevTouchRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleLookMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t  = e.touches[0];
    const dx = t.clientX - prevTouchRef.current.x;
    const dy = t.clientY - prevTouchRef.current.y;
    prevTouchRef.current = { x: t.clientX, y: t.clientY };
    gameRef.current?.applyLook(dx, dy);
  };

  const handleShoot = () => {
    gameRef.current?.playerShoot();
  };

  const handleReload = () => {
    gameRef.current?.reload();
  };

  // ── Derived state ─────────────────────────────────────────────────────────────

  const timerColor =
    timeLeft > 10 ? 'var(--text-white)' :
    timeLeft > 5  ? 'var(--color-gold)'  :
                    'var(--color-pink)';

  const isPlaying = locked && !gameOver;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.game}>
      <div ref={containerRef} className={styles.canvas} />
      <div ref={hitOverlayRef} className={styles.hitOverlay} />

      {/* ── Crosshair (desktop only) ── */}
      {isPlaying && !isMobile && (
        <div className={styles.crosshair}>
          <div className={styles.crosshairTop} />
          <div className={styles.crosshairBottom} />
          <div className={styles.crosshairLeft} />
          <div className={styles.crosshairRight} />
          <div className={styles.crosshairDot} />
        </div>
      )}

      {/* ── HUD ── */}
      {isPlaying && (
        <div className={styles.hud}>

          {/* Timer — top center */}
          <div className={styles.hudTimer}>
            <span className={styles.hudTimerValue} style={{ color: timerColor }}>
              {String(timeLeft).padStart(2, '0')}
            </span>
            <span className={styles.hudTimerLabel}>segundos</span>
          </div>

          {/* Score — top right */}
          <div className={styles.hudScore}>
            <span className={styles.hudScoreLabel}>Puntos</span>
            <span className={styles.hudScoreValue}>{score.toString().padStart(4, '0')}</span>
          </div>

          {/* Kills — top left */}
          <div className={styles.hudKills}>
            <span className={styles.hudKillsLabel}>Bajas</span>
            <span className={styles.hudKillsValue}>{kills.toString().padStart(2, '0')}</span>
          </div>

          {/* Ammo — bottom right (hidden on mobile, shown via shoot button) */}
          <div className={`${styles.hudAmmo} ${isMobile ? styles['hudAmmo--hidden'] : ''}`}>
            <div className={styles.hudAmmoStack}>
              <span className={styles.hudAmmoLabel}>Cargador</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <span className={styles.ammoValue}>{ammo}</span>
                <span className={styles.ammoSeparator}> / </span>
                <span className={styles.ammoMax}>30</span>
              </div>
            </div>
          </div>

          {/* Reloading indicator */}
          {reloading && (
            <div className={styles.reloading}>
              <span className={styles.reloadingText}>— recargando —</span>
              <div className={styles.reloadBar}>
                <div className={styles.reloadBarFill} />
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Mobile controls ── */}
      {isPlaying && isMobile && (
        <div className={styles.mobileControls}>
          {/* Left: nipplejs joystick zone */}
          <div ref={joystickZoneRef} className={styles.joystickZone} />

          {/* Right: look zone + buttons */}
          <div
            className={styles.lookZone}
            onTouchStart={handleLookStart}
            onTouchMove={handleLookMove}
          >
            {/* Ammo indicator (small, top of look zone) */}
            <div className={styles.mobileAmmo}>
              <span className={styles.mobileAmmoValue}>{ammo}</span>
              <span className={styles.mobileAmmoMax}>/30</span>
            </div>

            {/* Shoot button */}
            <button
              className={styles.shootBtn}
              onPointerDown={(e) => { e.stopPropagation(); handleShoot(); }}
            >
              <span className={styles.shootBtnLabel}>FUEGO</span>
            </button>

            {/* Reload button */}
            <button
              className={styles.reloadBtn}
              onPointerDown={(e) => { e.stopPropagation(); handleReload(); }}
            >
              R
            </button>
          </div>
        </div>
      )}

      {/* ── Start overlay ── */}
      {!locked && !gameOver && (
        <div className={styles.overlay} onClick={handleClick}>
          <div className={styles.overlayBox}>
            <span className={styles.overlayEyebrow}>Misión activa</span>
            <h1 className={styles.overlayTitle}>Valentina&apos;s Wrath</h1>
            <p className={styles.overlayTitleSub}>The Jaba Assault</p>
            <p className={styles.overlaySubtitle}>Elimina el máximo de contrarios en 30 seg</p>

            {/* Controls grid only on desktop */}
            {!isMobile && (
              <div className={styles.overlayControls}>
                {CONTROLS.map(({ key, action }) => (
                  <div key={key} className={styles.controlRow}>
                    <span className={styles.controlKey}>{key}</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Mobile controls summary */}
            {isMobile && (
              <div className={styles.mobileHint}>
                <div className={styles.mobileHintRow}>
                  <span className={styles.mobileHintIcon}>◉</span> Joystick izq. para mover
                </div>
                <div className={styles.mobileHintRow}>
                  <span className={styles.mobileHintIcon}>👆</span> Desliza der. para apuntar
                </div>
                <div className={styles.mobileHintRow}>
                  <span className={styles.mobileHintIcon}>🔴</span> Botón FUEGO para disparar
                </div>
              </div>
            )}

            <button
              className={styles.startBtn}
              onClick={(e) => { e.stopPropagation(); if (isMobile) handleStartMobile(); }}
            >
              {isMobile ? 'Iniciar misión' : 'Entrar en combate'}
            </button>
          </div>
        </div>
      )}

      {/* ── Game over overlay ── */}
      {gameOver && (
        <div className={styles.overlay}>
          <div className={styles.overlayBox}>
            <span className={styles.overlayEyebrow}>Misión terminada</span>
            <h1 className={styles.overlayTitle}>¡Tiempo!</h1>
            <p className={styles.overlayTitleSub}>Informe de combate</p>

            <div className={styles.overlayStats}>
              <div className={styles.overlayStat}>
                <span className={styles.overlayStatLabel}>Bajas</span>
                <span className={`${styles.overlayStatValue} ${styles['overlayStatValue--pink']}`}>
                  {gameOver.kills}
                </span>
              </div>
              <div className={styles.overlayStat}>
                <span className={styles.overlayStatLabel}>Score</span>
                <span className={`${styles.overlayStatValue} ${styles['overlayStatValue--gold']}`}>
                  {gameOver.score}
                </span>
              </div>
            </div>

            <button className={styles.startBtn} onClick={handleRestart}>
              Nueva misión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
