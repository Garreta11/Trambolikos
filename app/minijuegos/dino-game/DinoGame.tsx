'use client';

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import styles from './DinoGame.module.scss';
import Image from 'next/image';
import { AppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// --- Interfaces y Tipos ---
interface DinoState {
  y: number;
  dy: number;
  width: number;
  height: number;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'CACTUS' | 'BIRD';
}

interface Cloud {
  id: number;
  x: number;
  y: number;
  speed: number;
}

type GameStatus = 'START' | 'PLAYING' | 'GAME_OVER';

const DinoGame: React.FC<{ onScoreSaved: () => void }> = ({ onScoreSaved }) => {

  // --- Router ---
  const router = useRouter();

  // --- Contexto ---
  const { username } = useContext(AppContext);

  // --- Estado del Juego ---
  const [gameState, setGameState] = useState<GameStatus>('START');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isDucking, setIsDucking] = useState<boolean>(false);

  // --- Refs para IDs de BD ---
  const userIdRef = useRef<string | null>(null);
  const gameIdRef = useRef<string | null>(null);

  // --- Refs para el Motor del Juego ---
  const containerRef = useRef<HTMLDivElement>(null);
  const dinoRef = useRef<DinoState>({ y: 0, dy: 0, width: 44, height: 47 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const speedRef = useRef<number>(5);
  const spawnTimerRef = useRef<number>(0);

  // 1. Cargar datos iniciales de Supabase (ID del juego y ID del usuario)
  useEffect(() => {
    const fetchMetadata = async () => {

      // Obtener ID del usuario
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();
      
      if (userData) userIdRef.current = userData.id;

      // Obtener ID del juego "dino-game"
      const { data: gameData } = await supabase
        .from('juegos')
        .select('id')
        .eq('slug', 'dino-game')
        .single();

      if (gameData) gameIdRef.current = gameData.id;
    };

    fetchMetadata();
    
    const saved = localStorage.getItem('dino-high-score');
    if (saved) setHighScore(parseInt(saved));
  }, [username]);

  // --- Inicializar High Score ---
  useEffect(() => {
    const saved = localStorage.getItem('dino-high-score');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // 2. Función para guardar en la base de datos
  const saveScoreToSupabase = async (finalScore: number) => {
    if (!userIdRef.current || !gameIdRef.current || finalScore <= 0) return;
  
    try {
      // 1. Consultar el score más alto que ya tiene este usuario en este juego
      const { data: existingRecord, error: fetchError } = await supabase
        .from('puntuaciones')
        .select('score')
        .eq('usuario_id', userIdRef.current)
        .eq('juego_id', gameIdRef.current)
        .maybeSingle();
  
      if (fetchError) throw fetchError;
  
      // 2. Solo actualizamos si el nuevo score es estrictamente mayor
      const isNewRecord = !existingRecord || finalScore > existingRecord.score;
  
      if (isNewRecord) {
        const { error: upsertError } = await supabase
          .from('puntuaciones')
          .upsert({
            usuario_id: userIdRef.current,
            juego_id: gameIdRef.current,
            score: finalScore,
            alcanzado_at: new Date().toISOString()
          }, { onConflict: 'usuario_id, juego_id' });
  
        if (upsertError) throw upsertError;
  
        console.log("¡NUEVO RÉCORD TRAMBÓLIKO GUARDADO!");
        
        // 3. Solo avisamos al Leaderboard si realmente hubo un cambio
        if (onScoreSaved) {
          setTimeout(onScoreSaved, 300); 
        }
      } else {
        console.log("Score actual no supera el récord personal. No se actualiza.");
      }
    } catch (err) {
      console.error("Error en la validación de score:", err);
    }
  };

  const handleGameOver = useCallback(() => {
    setGameState('GAME_OVER');
    setScore(currentScore => {
      // Importante: No esperes al render, dispara la función aquí
      saveScoreToSupabase(currentScore);
      return currentScore;
    });
  }, []);

  const gameLoop = useCallback((time: number) => {
    if (lastTimeRef.current === undefined) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }
  
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
  
    if (gameState === 'PLAYING') {
      // 👉 velocidad base + dificultad progresiva
      speedRef.current += 0.000001;
  
      // 👉 velocidad visual SIEMPRE mínima
      const BASE_MOVEMENT = 1;
      const movementSpeed = BASE_MOVEMENT + speedRef.current * 2;
  
      setScore(prev => prev + Math.floor(speedRef.current * 2));
  
      // --- DINO ---
      const dino = dinoRef.current;
      dino.dy += 0.6;
      dino.y += dino.dy;
  
      if (dino.y > 0) {
        dino.y = 0;
        dino.dy = 0;
      }
  
      // --- CLOUDS ---
      if (Math.random() < 0.01 && cloudsRef.current.length < 5) {
        cloudsRef.current.push({
          id: Date.now(),
          x: 100,
          y: 20 + Math.random() * 40,
          speed: 0.2 + Math.random() * 0.5,
        });
      }
  
      cloudsRef.current = cloudsRef.current
        .map(c => ({
          ...c,
          x: c.x - c.speed * (deltaTime / 16),
        }))
        .filter(c => c.x > -20);
  
      // --- SPAWN OBSTÁCULOS (independiente de velocidad extrema) ---
      spawnTimerRef.current -= deltaTime;
  
      if (spawnTimerRef.current <= 0) {
        const type = Math.random() > 0.7 ? 'BIRD' : 'CACTUS';
  
        obstaclesRef.current.push({
          id: Date.now(),
          x: 100,
          y: type === 'BIRD' ? (Math.random() > 0.5 ? 30 : 60) : 0,
          width: type === 'BIRD' ? 40 : 25,
          height: type === 'BIRD' ? 30 : 50,
          type,
        });
  
        // 👉 spawn más estable
        spawnTimerRef.current = 900 + Math.random() * 900;
      }
  
      // --- COLISIONES ---
      const dinoRect = {
        left: 10,
        right: 10 + (isDucking ? 55 : 40),
        top: 150 - dino.y - (isDucking ? 25 : 45),
        bottom: 150 - dino.y,
      };
  
      obstaclesRef.current = obstaclesRef.current
        .map(o => ({
          ...o,
          x: o.x - movementSpeed * (deltaTime / 16),
        }))
        .filter(o => {
          if (
            dinoRect.right > o.x * 6 + 10 &&
            dinoRect.left < (o.x + o.width / 8) * 6 + 40 &&
            dinoRect.bottom > 150 - o.y - o.height + 5 &&
            dinoRect.top < 150 - o.y - 5
          ) {
            handleGameOver();
          }
          return o.x > -50;
        });
    }
  
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, isDucking, handleGameOver]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameLoop]);

  const startGame = () => {
    setGameState('PLAYING');
    setScore(0);
    speedRef.current = 1;
    obstaclesRef.current = [];
    cloudsRef.current = [];
    dinoRef.current = { y: 0, dy: 0, width: 44, height: 47 };
    spawnTimerRef.current = 1000;
    lastTimeRef.current = undefined;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (gameState === 'PLAYING' && dinoRef.current.y === 0) {
          dinoRef.current.dy = -12;
        } else if (gameState !== 'PLAYING') {
          startGame();
        }
        e.preventDefault();
      }
      if (e.code === 'ArrowDown' && gameState === 'PLAYING') {
        setIsDucking(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') {
        setIsDucking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const handleJump = useCallback(() => {
    if (gameState === 'PLAYING') {
      if (dinoRef.current.y === 0) {
        dinoRef.current.dy = -12;
      }
    } else {
      startGame();
    }
  }, [gameState]);

  if (!username) {
    router.push('/minijuegos');
    return;
  }

  return (
    <div className={styles.dinoGame}>
      <div className={styles.dinoGame__container}>

        <div className={styles.dinoGame__scoreboard}>
          <div className={styles['dinoGame__scoreboard--high']}>
            HOLA {username.toUpperCase()}
          </div>
          <div>{score.toString().padStart(5, '0')}</div>
        </div>

        <div ref={containerRef} className={styles.dinoGame__canvas} onClick={handleJump}>

          {cloudsRef.current.map(cloud => (
            <div
              key={cloud.id}
              className={styles.dinoGame__cloud}
              style={{ left: `${cloud.x}%`, top: `${cloud.y}px` }}
            >
              <CloudIcon />
            </div>
          ))}

          {obstaclesRef.current.map(obs => (
            <div
              key={obs.id}
              className={styles.dinoGame__obstacle}
              style={{
                left: `${obs.x}%`,
                bottom: `${obs.y}px`,
                width: `${obs.width}px`,
                height: `${obs.height}px`,
              }}
            >
              {obs.type === 'CACTUS' ? <ValentinaIcon /> : <BirdIcon />}
            </div>
          ))}

          <div
            className={`${styles.dinoGame__dino}${
              isDucking ? ` ${styles['dinoGame__dino--ducking']}` : ''
            }`}
            style={{ bottom: `${-dinoRef.current.y}px` }}
          >
            <WildPorkIcon isDead={gameState === 'GAME_OVER'} />
          </div>

          <div
            className={styles.dinoGame__ground}
            style={{ left: `${-(score * 2) % 100}%` }}
          />

          {gameState === 'START' && (
            <div className={styles.dinoGame__overlay}>
              <p className={styles.dinoGame__overlayText}>
                Presiona ESPACIO para comenzar
              </p>
              <div className={styles.dinoGame__overlayDino}>
                <WildPorkIcon isDead={false} />
              </div>
            </div>
          )}

          {gameState === 'GAME_OVER' && (
            <div
              className={`${styles.dinoGame__overlay} ${styles['dinoGame__overlay--gameOver']}`}
            >
              <h2 className={styles.dinoGame__title}>G A M E &nbsp; O V E R</h2>
              <button onClick={startGame} className={styles.dinoGame__button}>
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* BOTÓN DE SALTO PARA MÓVIL */}
        <div className={styles.dinoGame__mobileActions}>
          <button 
            className={styles.dinoGame__jumpButton}
            onPointerDown={(e) => {
              e.preventDefault();
              handleJump();
            }}
          >
            SALTA
          </button>
        </div>

        <div className={styles.dinoGame__instructions}>
          <p>Usa <b>Espacio</b> para saltar</p>
        </div>

      </div>
    </div>
  );
};

// --- Iconos ---
const WildPorkIcon: React.FC<{ isDead: boolean }> = ({ isDead }) => (
  <Image src="/minijuegos/dino-game/wildpork1.png" alt="Dino" width={44} height={44} />
);

const ValentinaIcon: React.FC = () => (
  <Image src="/minijuegos/dino-game/valentina.png" alt="Dino" width={18} height={50} />
);

const BirdIcon: React.FC = () => (
  <svg width="40" height="30" viewBox="0 0 40 30" fill="black">
    <path d="M0 10h10v5H0zM10 5h10v5H10zM20 10h10v5H20zM30 15h10v5H30zM15 15h5v10h-5z" />
  </svg>
);

const CloudIcon: React.FC = () => (
  <svg width="46" height="14" viewBox="0 0 46 14" fill="currentColor">
    <path d="M10 0h10v3h10v3h10v3h6v5H0V6h4V3h6V0z" />
  </svg>
);

export default DinoGame;