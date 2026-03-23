'use client';

import { useEffect, useRef, useContext } from "react";
import styles from './BikeRace.module.scss';
// Eliminamos la importación estática de nipplejs que causaba el error
import Race from "./Race";
import { supabase } from '@/lib/supabase';
import { AppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import * as Tone from 'tone';

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
  const joystickRef = useRef<HTMLDivElement | null>(null);

  const userIdRef = useRef<string | null>(null);
  const gameIdRef = useRef<string | null>(null);

  const melodySynthRef = useRef<Tone.Synth | null>(null);
  const bassSynthRef = useRef<Tone.Synth | null>(null);
  const melodySeqRef = useRef<Tone.Sequence | null>(null);
  const bassSeqRef = useRef<Tone.Sequence | null>(null);

  const startMusic = async () => {
    await Tone.start();
    Tone.getTransport().bpm.value = 160;

    const melodySynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0.3, release: 0.08 },
      volume: -12,
    }).toDestination();

    const bassSynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0.2, release: 0.1 },
      volume: -18,
    }).toDestination();

    // Mario Kart-inspired 8-bar melody loop
    const melodyNotes = [
      'C5', 'E5', 'G5', 'C6',
      'B5', 'G5', 'E5', 'G5',
      'A5', 'F5', 'D5', 'F5',
      'G5', 'E5', 'C5', null,
      'C5', 'E5', 'G5', 'C6',
      'B5', 'G5', 'E5', 'C5',
      'D5', 'F5', 'A5', 'D6',
      'C6', null, null, null,
    ];

    const bassNotes = [
      'C3', null, 'G3', null,
      'C3', null, 'G3', null,
      'F3', null, 'C4', null,
      'G3', null, null, null,
      'C3', null, 'G3', null,
      'C3', null, 'G3', null,
      'D3', null, 'A3', null,
      'G3', null, null, null,
    ];

    melodySeqRef.current = new Tone.Sequence((time, note) => {
      if (note) melodySynth.triggerAttackRelease(note, '16n', time);
    }, melodyNotes, '8n');

    bassSeqRef.current = new Tone.Sequence((time, note) => {
      if (note) bassSynth.triggerAttackRelease(note, '8n', time);
    }, bassNotes, '8n');

    melodySeqRef.current.loop = true;
    bassSeqRef.current.loop = true;
    melodySeqRef.current.start(0);
    bassSeqRef.current.start(0);

    melodySynthRef.current = melodySynth;
    bassSynthRef.current = bassSynth;

    Tone.getTransport().start();
  };

  const stopMusic = () => {
    melodySeqRef.current?.stop();
    bassSeqRef.current?.stop();
    melodySeqRef.current?.dispose();
    bassSeqRef.current?.dispose();
    melodySynthRef.current?.dispose();
    bassSynthRef.current?.dispose();
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
  };

  const playFinishMusic = async () => {
    await Tone.start();
    stopMusic();

    Tone.getTransport().bpm.value = 180;

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.4, release: 0.15 },
      volume: -10,
    }).toDestination();

    // Victory fanfare: ascending triumphant melody, then celebration loop
    const fanfare: [string, string, number][] = [
      ['C4', '8n', 0],
      ['C4', '8n', 150],
      ['C4', '8n', 300],
      ['C4', '4n', 450],
      ['E4', '8n', 750],
      ['G4', '8n', 900],
      ['C5', '4n', 1050],
      ['E5', '8n', 1350],
      ['G5', '4n', 1500],
      ['C6', '2n', 1750],
    ];

    fanfare.forEach(([note, dur, delay]) => {
      setTimeout(() => synth.triggerAttackRelease(note, dur), delay);
    });

    // After fanfare, start a looping celebration melody
    setTimeout(() => {
      Tone.getTransport().bpm.value = 190;

      const celebSynth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.08, sustain: 0.3, release: 0.08 },
        volume: -11,
      }).toDestination();

      const celebNotes = [
        'C5', 'E5', 'G5', 'E5',
        'C6', 'G5', 'E5', 'C5',
        'D5', 'F5', 'A5', 'F5',
        'D6', 'A5', 'F5', 'D5',
        'E5', 'G5', 'B5', 'G5',
        'E6', 'B5', 'G5', 'E5',
        'F5', 'A5', 'C6', 'A5',
        'G5', 'C6', 'E6', null,
      ];

      const celebSeq = new Tone.Sequence((time, note) => {
        if (note) celebSynth.triggerAttackRelease(note, '16n', time);
      }, celebNotes, '8n');

      celebSeq.loop = true;
      celebSeq.start(0);
      melodySeqRef.current = celebSeq;
      melodySynthRef.current = celebSynth;

      Tone.getTransport().start();
    }, 2500);

    setTimeout(() => synth.dispose(), 2500);
  };

  useEffect(() => {
    if (!username) {
      router.push('/minijuegos');
    }
  }, [username, router]);

  useEffect(() => {
    if (!username) return;
    const fetchMetadata = async () => {
      const { data: userData } = await supabase.from('usuarios').select('id').eq('username', username.toLowerCase()).single();
      if (userData) userIdRef.current = userData.id;

      const { data: gameData } = await supabase.from('juegos').select('id').eq('slug', 'bike-race').single();
      if (gameData) gameIdRef.current = gameData.id;
    };
    fetchMetadata();
  }, [username]);

  const saveScore = async (timeMs: number) => {
    if (!userIdRef.current || !gameIdRef.current) return;
    const { data: existing } = await supabase
      .from('puntuaciones')
      .select('score')
      .eq('usuario_id', userIdRef.current)
      .eq('juego_id', gameIdRef.current)
      .maybeSingle();

    if (!existing || timeMs < existing.score) {
      const { error } = await supabase
        .from('puntuaciones')
        .upsert({
          usuario_id: userIdRef.current,
          juego_id: gameIdRef.current,
          score: timeMs,
          alcanzado_at: new Date().toISOString()
        }, { onConflict: 'usuario_id, juego_id' });
      if (!error && onScoreSaved) setTimeout(onScoreSaved, 300);
    }
  };

  useEffect(() => {
    // PROTECCIÓN: No ejecutar nada si no estamos en el cliente
    if (typeof window === 'undefined' || !containerRef.current) return;

    // 1. Instanciar el Juego
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
      onFinish: (finalTime: number) => {
        saveScore(finalTime);
        playFinishMusic();
      }
    });

    // 2. Cargar NippleJS dinámicamente para evitar error de SSR
    let joystickManager: any = null;

    const initJoystick = async () => {
      const nipplejs = (await import('nipplejs')).default;
      if (joystickRef.current) {
        joystickManager = nipplejs.create({
          zone: joystickRef.current,
          mode: 'static',
          position: { left: '80px', bottom: '80px' },
          color: 'white',
          size: 100
        });

        joystickManager.on('move', (evt: any, data: any) => {
          if (raceRef.current) {
            raceRef.current.handleJoystick(data.angle.degree, data.force);
          }
        });

        joystickManager.on('end', () => {
          if (raceRef.current) {
            raceRef.current.handleJoystick(0, 0, true);
          }
        });
      }
    };

    initJoystick();

    return () => {
      stopMusic();
      if (joystickManager) joystickManager.destroy();
      if (raceRef.current?.renderer) {
        raceRef.current.renderer.dispose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        containerRef.current?.removeChild(raceRef.current.renderer.domElement);
      }
    };
  }, []);

  const handleStart = () => {
    if (raceRef.current) raceRef.current.startRace();
    startMusic();
  };

  const addToScoreboardRefs = (el: HTMLDivElement | null) => {
    if (el && !scoreboardRefs.current.includes(el)) {
      scoreboardRefs.current.push(el);
    }
  };

  return (
    <div className={styles.race}>
      <div className={styles.race__start} ref={startScreenRef}>
        <h1>BARCELONA RACE</h1>
        <p>¡Carrera épica! No llegues más tarde que Demi.</p>
        <button onClick={handleStart}>¡AL ESTADIO!</button>
      </div>

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

      <div ref={joystickRef} className={styles.race__joystick} />
      <div className={styles.race__canvas} ref={containerRef} />
    </div>
  );
};

export default BikeRace;