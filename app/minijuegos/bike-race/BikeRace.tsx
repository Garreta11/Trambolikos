'use client';

import { useEffect, useRef, useContext } from "react";
import styles from './BikeRace.module.scss';
import Race from "./Race";
import { supabase } from '@/lib/supabase';
import { AppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

const BikeRace = ( { onScoreSaved }: { onScoreSaved: () => void } ) => {
  const { username } = useContext(AppContext);
  const router = useRouter();
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const raceRef = useRef<Race | null>(null);
  const startScreenRef = useRef<HTMLDivElement | null>(null);
  const timerDisplayRef = useRef<HTMLDivElement | null>(null);
  const progressDisplayRef = useRef<HTMLDivElement | null>(null);
  const speedDisplayRef = useRef<HTMLDivElement | null>(null);
  const posDisplayRef = useRef<HTMLDivElement | null>(null);
  const finalMessageRef = useRef<HTMLDivElement | null>(null);
  const scoreboardRefs = useRef<HTMLDivElement[]>([]);
  const uiRaceRef = useRef<HTMLDivElement | null>(null);

  // 0. Refs para IDs de BD
  const userIdRef = useRef<string | null>(null);
  const gameIdRef = useRef<string | null>(null);

  // 0. Redirigir si no hay username
  useEffect(() => {
    if (!username) {
      router.push('/minijuegos');
      return;
    }
  }, [username]);

  // 1. Cargar metadatos
  useEffect(() => {
    if (!username) {
      router.push('/minijuegos');
      return;
    }

    const fetchMetadata = async () => {
      const { data: userData } = await supabase.from('usuarios').select('id').eq('username', username.toLowerCase()).single();
      if (userData) userIdRef.current = userData.id;

      const { data: gameData } = await supabase.from('juegos').select('id').eq('slug', 'bike-race').single();
      if (gameData) gameIdRef.current = gameData.id;
    };

    fetchMetadata();
  }, [username]);

  // 2. Función de guardado (el score será el tiempo en milisegundos)
  const saveScore = async (timeMs: number) => {
    if (!userIdRef.current || !gameIdRef.current) return;

    // En carreras, queremos el tiempo MÁS BAJO
    const { data: existing } = await supabase
      .from('puntuaciones')
      .select('score')
      .eq('usuario_id', userIdRef.current)
      .eq('juego_id', gameIdRef.current)
      .maybeSingle();

    // Si no hay récord o el tiempo actual es menor (más rápido)
    if (!existing || timeMs < existing.score) {
      const { error } = await supabase
        .from('puntuaciones')
        .upsert({
          usuario_id: userIdRef.current,
          juego_id: gameIdRef.current,
          score: timeMs,
          alcanzado_at: new Date().toISOString()
        }, { onConflict: 'usuario_id, juego_id' });
      if (error) console.error('Error al guardar la puntuación:', error);
      if (onScoreSaved) setTimeout(onScoreSaved, 300);
    }
  };

  // 3. Crear instancia de Race
  useEffect(() => {
    if (!containerRef.current || raceRef.current) return;

    // Crear instancia
    raceRef.current = new Race({
      container: containerRef.current,
      startScreen: startScreenRef.current,
      timerDisplay: timerDisplayRef.current,
      progressDisplay: progressDisplayRef.current,
      speedDisplay: speedDisplayRef.current,
      posDisplay: posDisplayRef.current,
      finalMessage: finalMessageRef.current,
      scoreboardRefs: scoreboardRefs.current,
      uiRace: uiRaceRef.current,
      onFinish: (finalTime: number) => saveScore(finalTime)
    });

    // Cleanup (MUY IMPORTANTE en React)
    return () => {
      if (raceRef.current?.renderer) {
        raceRef.current.renderer.dispose();
        containerRef.current?.removeChild(
          raceRef.current.renderer.domElement
        );
      }
    };
  }, []);

  const handleStart = () => {
    if (raceRef.current) {
      console.log('startRace');
      raceRef.current.startRace();
    }
  };

  const addToScoreboardRefs = (el: HTMLDivElement | null) => {
    if (el && !scoreboardRefs.current.includes(el)) {
      scoreboardRefs.current.push(el);
    }
  };

  return (
    <div className={styles.race}>
      {/* Start race */}
      <div className={styles.race__start} ref={startScreenRef}>
        <h1>BARCELONA RACE</h1>
        <p>¡Carrera épica! No llegues más tarde que Demi.</p>
        <button onClick={() => handleStart()}>¡AL ESTADIO!</button>
      </div>

      {/* UI Race */}
      <div className={styles.race__ui} ref={uiRaceRef}>
        <div className={styles.race__ui__scoreboard} ref={addToScoreboardRefs}>
          <div className={styles.race__ui__scoreboard__panel}>
            <div className={styles.race__ui__scoreboard__panel__label}>Tiempo</div>
            <div ref={timerDisplayRef} className={styles.race__ui__scoreboard__value}>00:00:00</div>
          </div>
          <div className={styles.race__ui__scoreboard__panel}>
            <div className={styles.race__ui__scoreboard__panel__label}>Progreso</div>
            <div ref={progressDisplayRef} className={styles.race__ui__scoreboard__value}>0%</div>
          </div>
        </div>

        <div className={styles.race__ui__scoreboard} ref={addToScoreboardRefs}>
          <div className={styles.race__ui__scoreboard__panel}>
            <div className={styles.race__ui__scoreboard__panel__label}>Velocidad</div>
            <div ref={speedDisplayRef} className={styles.race__ui__scoreboard__value}>
              <span>0</span>
              <span>KM/H</span>
            </div>
          </div>
          
          <div className={styles.race__ui__scoreboard__panel}>
            <div className={styles.race__ui__scoreboard__panel__label}>Posición</div>
            <div ref={posDisplayRef} className={styles.race__ui__scoreboard__value}>1º</div>
          </div>
        </div>

        <div ref={finalMessageRef} className={styles.race__ui__finalMessage}>
          ¡GOOOOL! ¡CAMPEÓN!
        </div>
      </div>

      {/* Canvas Race */}
      <div className={styles.race__canvas} ref={containerRef} />
    </div>
  );
};

export default BikeRace;