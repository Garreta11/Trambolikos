'use client';

import { useEffect, useRef, useContext } from 'react';
import { AppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './MilkGame.module.scss';
import Milk from './Milk';

const MilkGame: React.FC<{ onScoreSaved: () => void }> = ({ onScoreSaved }) => {
  const { username } = useContext(AppContext);
  const router = useRouter();

  const mountRef = useRef<HTMLDivElement>(null);
  const milkRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);
  const gameIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!username) router.push('/minijuegos');
  }, [username, router]);

  useEffect(() => {
    if (!username) return;
    const fetchMetadata = async () => {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();
      if (userData) userIdRef.current = userData.id;

      const { data: gameData } = await supabase
        .from('juegos')
        .select('id')
        .eq('slug', 'milk')
        .single();
      if (gameData) gameIdRef.current = gameData.id;
    };
    fetchMetadata();
  }, [username]);

  const saveScore = async (playerMilk: number) => {
    if (!userIdRef.current || !gameIdRef.current) return;
    const score = Math.floor(playerMilk);
    const { data: existing } = await supabase
      .from('puntuaciones')
      .select('score')
      .eq('usuario_id', userIdRef.current)
      .eq('juego_id', gameIdRef.current)
      .maybeSingle();
    if (!existing || score > existing.score) {
      const { error } = await supabase.from('puntuaciones').upsert(
        {
          usuario_id: userIdRef.current,
          juego_id: gameIdRef.current,
          score,
          alcanzado_at: new Date().toISOString(),
        },
        { onConflict: 'usuario_id, juego_id' },
      );
      if (!error && onScoreSaved) setTimeout(onScoreSaved, 300);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !mountRef.current) return;

    const container = mountRef.current;

    milkRef.current = new Milk({
      container,
      onMatchEnd: (playerMilk: number) => saveScore(playerMilk),
    });

    return () => {
      milkRef.current?.destroy();
      milkRef.current = null;
    };
  }, []);

  return (
    <div className={styles.milk}>

      {/* Overlay de inicio / fin */}
      <div id="overlay" className={styles.milk__overlay}>
        <h1 id="main-title" className={styles.milk__overlay__title}>
          Lágrimas de Leche
        </h1>
        <p id="sub-title" className={styles.milk__overlay__sub}>
          ¿Puedes beber más leche que EDU?
        </p>
        <p className={styles.milk__overlay__hint}>
          Pulsa <b>ESPACIO</b> para beber leche
        </p>
        <button id="start-btn" className={styles.milk__overlay__btn}>
          EMPEZAR (30s)
        </button>
      </div>

      {/* HUD durante el juego */}
      <div className={styles.milk__ui}>
        <div className={styles.milk__scoreboard}>
          <div className={styles['milk__score-card']}>
            <span className={styles['milk__score-label']}>TÚ</span>
            <div className={styles['milk__score-value']}>
              <span id="player-score" className={styles['milk__score-number']}>0</span>
              <span className={styles['milk__score-unit']}>L</span>
            </div>
          </div>

          <div className={styles.milk__timer}>
            <span id="timer-display" className={styles['milk__timer-display']}>
              30.0
            </span>
            <span className={styles['milk__timer-label']}>SEG</span>
          </div>

          <div className={`${styles['milk__score-card']} ${styles['milk__score-card--edu']}`}>
            <span className={styles['milk__score-label']}>EDU</span>
            <div className={styles['milk__score-value']}>
              <span id="edu-score" className={styles['milk__score-number']}>0</span>
              <span className={styles['milk__score-unit']}>L</span>
            </div>
          </div>
        </div>

        <div className={styles['milk__bar-row']}>
          <span className={styles['milk__bar-tag']}>TÚ</span>
          <div className={styles.milk__bar}>
            <div id="player-power-bar" className={styles.milk__bar__fill} />
          </div>
          <span className={styles['milk__bar-tag']}>EDU</span>
        </div>

        <div className={styles.milk__footer}>
          <p className={styles.milk__hint}>
            ESPACIO · beber leche · 30 segundos
          </p>
        </div>
      </div>

      {/* Canvas Three.js */}
      <div ref={mountRef} className={styles.milk__canvas} />
    </div>
  );
};

export default MilkGame;
