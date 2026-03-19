'use client';

import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import styles from './TrambolikosPenalty.module.scss';
import { supabase } from '@/lib/supabase';
import { AppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

type Direction = 'left' | 'center' | 'right';

const INITIAL_BALL_POS = { x: 0, y: 0.25, z: 2 };
const INITIAL_KEEPER_POS = { x: 0, y: 0.5, z: -4.5 };
const INITIAL_CAMERA_POS = { x: 0, y: 2, z: 5 };
const COLORS = { purple: 0x9333ea, lime: 0x84cc16, grass: 0x064e3b };

interface GameState {
  streak: number;
  bestStreak: number;
  isKicking: boolean;
  gamePhase: 'idle' | 'shooting' | 'goal' | 'saved';
}

export default function TrambolikosPenalty({ onScoreSaved }: { onScoreSaved: () => void }) {
  // --- Contexto ---
  const { username } = useContext(AppContext);
  const router = useRouter();

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    ball: THREE.Mesh;
    keeper: THREE.Group;
    animationId: number;
  } | null>(null);

  const mouseXRef = useRef(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>({
    streak: 0,
    bestStreak: 0,
    isKicking: false,
    gamePhase: 'idle',
  });

  const [resultVisible, setResultVisible] = useState(false);
  const [resultText, setResultText] = useState('¡GOL!');
  const [isGoalResult, setIsGoalResult] = useState(true);

  // --- Refs para IDs de BD ---
  const userIdRef = useRef<string | null>(null);
  const gameIdRef = useRef<string | null>(null);

  const resetBall = useCallback(() => {
    if (!sceneRef.current) return;
    const { ball, keeper, camera } = sceneRef.current;

    gsap.killTweensOf([ball.position, keeper.position, camera.position, keeper.rotation]);

    ball.position.set(INITIAL_BALL_POS.x, INITIAL_BALL_POS.y, INITIAL_BALL_POS.z);
    ball.rotation.set(0, 0, 0);
    keeper.position.set(INITIAL_KEEPER_POS.x, INITIAL_KEEPER_POS.y, INITIAL_KEEPER_POS.z);
    keeper.rotation.z = 0;

    gsap.to(camera.position, {
      x: INITIAL_CAMERA_POS.x,
      y: INITIAL_CAMERA_POS.y,
      z: INITIAL_CAMERA_POS.z,
      duration: 0.8,
      ease: "power3.out"
    });

    setResultVisible(false);
  }, []);

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
        .eq('slug', 'penaltis')
        .single();

      if (gameData) gameIdRef.current = gameData.id;
    };

    if (!username) {
      router.push('/minijuegos');
      return;
    }

    fetchMetadata();
    
    const saved = localStorage.getItem('penaltis-score');
    if (saved) setHighScore(parseInt(saved));
  }, [username]);

   // --- Inicializar High Score ---
   useEffect(() => {
    const saved = localStorage.getItem('penaltis-score');
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

  useEffect(() => {
    if (!mountRef.current) return;
    
    // 1. Evitar doble inicialización
    let didInit = false;
    if (didInit) return;
    didInit = true;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // --- Configuración Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.Fog(0x050505, 10, 50);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(INITIAL_CAMERA_POS.x, INITIAL_CAMERA_POS.y, INITIAL_CAMERA_POS.z);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Limpiamos el contenedor antes de añadir el nuevo canvas por si acaso
    container.innerHTML = ''; 
    container.appendChild(renderer.domElement);

    // --- Luces y Objetos (Igual que antes) ---
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const spot = new THREE.SpotLight(COLORS.purple, 25);
    spot.position.set(0, 10, 5);
    scene.add(spot);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshPhongMaterial({ color: COLORS.grass })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const goal = new THREE.Group();
    const pm = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2), pm); pL.position.set(-3.5, 1.5, -5);
    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2), pm); pR.position.set(3.5, 1.5, -5);
    const cb = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.2, 0.2), pm); cb.position.set(0, 3, -5);
    goal.add(pL, pR, cb);
    scene.add(goal);

    // --- Texturas con Manager ---
    const manager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(manager);
    const textures: Record<string, THREE.Texture> = {};

    ['ball.jpg', 'maiki.png'].forEach((file) => {
      loader.load(`/minijuegos/penaltis/${file}`, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        textures[file] = texture;
      });
    });

    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), new THREE.MeshStandardMaterial());
    ball.position.set(INITIAL_BALL_POS.x, INITIAL_BALL_POS.y, INITIAL_BALL_POS.z);
    scene.add(ball);

    const keeper = new THREE.Group();
    const body = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3), new THREE.MeshStandardMaterial({transparent: true}));
    body.position.y = 0.75;
    keeper.add(body);
    keeper.position.set(INITIAL_KEEPER_POS.x, INITIAL_KEEPER_POS.y, INITIAL_KEEPER_POS.z);
    scene.add(keeper);

    sceneRef.current = { scene, camera, renderer, ball, keeper, animationId: 0 };

    const animate = () => {
      const id = requestAnimationFrame(animate);
      if (sceneRef.current) {
        const { camera, keeper, renderer, scene } = sceneRef.current;
        sceneRef.current.animationId = id;
        const isZooming = camera.position.z < 4; 
        if (!isZooming) {
          camera.position.x += (mouseXRef.current - camera.position.x) * 0.05;
        }
        camera.lookAt(keeper.position.x, keeper.position.y + 1, keeper.position.z);
        renderer.render(scene, camera);
      }
    };

    manager.onLoad = () => {
      setIsLoaded(true);
      ball.material.map = textures['ball.jpg'];
      body.material.map = textures['maiki.png'];
      ball.material.needsUpdate = true;
      body.material.needsUpdate = true;
      animate();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseXRef.current = (((e.clientX - rect.left) / rect.width) * 2 - 1) * 2.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 2. LIMPIEZA CRÍTICA
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      // Parar GSAP
      gsap.killTweensOf([ball.position, keeper.position, camera.position]);
      
      // Liberar memoria GPU
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []); // El array vacío es correcto aquí

  const shoot = useCallback((target: Direction) => {
    if (!sceneRef.current || gameState.isKicking) return;
    const { ball, keeper, camera } = sceneRef.current;

    setGameState(prev => ({ ...prev, isKicking: true, gamePhase: 'shooting' }));

    const targets: Record<Direction, { x: number; y: number }> = {
      left: { x: -2.7, y: 1.1 },
      center: { x: 0, y: 1.8 },
      right: { x: 2.7, y: 1.1 },
    };

    const kOpts: Direction[] = ['left', 'center', 'right'];
    const kId = kOpts[Math.floor(Math.random() * 3)];
    const bT = targets[target];
    const kT = targets[kId];
    const isGoal = target !== kId;

    // --- GSAP TIMELINE PARA EL TIRO ---
    const tl = gsap.timeline();

    // Movimiento del balón (X y Z)
    tl.to(ball.position, {
      x: bT.x,
      z: -5.1,
      duration: 0.6,
      ease: "power2.in"
    }, 0);

    // Salto del balón (Y)
    tl.to(ball.position, {
      y: bT.y + 1.2,
      duration: 0.3,
      ease: "power2.out",
      yoyo: true,
      repeat: 1
    }, 0);

    // Rotación del balón
    tl.to(ball.rotation, { x: 8, y: 5, duration: 0.6 }, 0);

    // Movimiento del portero
    tl.to(keeper.position, {
      x: kT.x,
      duration: 0.45,
      ease: "power2.out"
    }, 0.1);

    if (kId !== 'center') {
      tl.to(keeper.rotation, {
        z: kId === 'left' ? 0.7 : -0.7,
        duration: 0.45
      }, 0.1);
    }

    // Al terminar la animación de tiro
    tl.eventCallback("onComplete", () => {
      setIsGoalResult(isGoal);
      setResultText(isGoal ? '¡GOLAZO!' : '¡A CHUPARLA!');
      setResultVisible(true);

      if (isGoal) {
        setGameState(prev => ({ 
          ...prev, streak: prev.streak + 1, 
          bestStreak: Math.max(prev.streak + 1, prev.bestStreak), 
          gamePhase: 'goal' 
        }));
        setTimeout(() => {
          resetBall();
          setGameState(prev => ({ ...prev, isKicking: false, gamePhase: 'idle' }));
        }, 1500);
      } else {
        setGameState(prev => ({ ...prev, gamePhase: 'saved' }));
        saveScoreToSupabase(gameState.streak);

        // ZOOM A MAIKI
        gsap.to(camera.position, {
          x: keeper.position.x,
          y: keeper.position.y + 1.2,
          z: keeper.position.z + 2.3,
          duration: 1.5,
          ease: "expo.out"
        });
      }
    });

  }, [gameState.isKicking, resetBall]);

  return (
    <div className={styles['penalty']}>
      {!isLoaded && <div className={styles['penalty__loader']}><p>CARGANDO MANDANGA...</p></div>}
      <div ref={mountRef} className={styles['penalty__canvas']} />
      {isLoaded && (
        <div className={styles['penalty__ui']}>
          <div className={styles['penalty__scoreboard']}>
            <div className={styles['penalty__score-card']}>
              <span className={styles['penalty__score-label']}>Tú racha: </span>
              <div className={styles['penalty__score-value']}>
                <span className={styles['penalty__score-number']}>{gameState.streak}</span>
                <span className={`${styles['penalty__flame']} ${gameState.streak > 0 ? styles['penalty__flame--active'] : ''}`}>🔥</span>
              </div>
            </div>
            <div className={styles['penalty__center']}>
              {resultVisible && (
                <div className={`${styles['penalty__result']} ${isGoalResult ? styles['penalty__result--goal'] : styles['penalty__result--saved']}`}>
                  <h2 className={styles['penalty__result-text']}>{resultText}</h2>
                </div>
              )}
            </div>
          </div>
          <div className={styles['penalty__footer']}>
            {gameState.gamePhase !== 'saved' ? (
              <div className={styles['penalty__controls']}>
                <button disabled={gameState.isKicking} onClick={() => shoot('left')} className={styles['penalty__btn']}>Izquierda</button>
                <button disabled={gameState.isKicking} onClick={() => shoot('center')} className={styles['penalty__btn']}>Centro</button>
                <button disabled={gameState.isKicking} onClick={() => shoot('right')} className={styles['penalty__btn']}>Derecha</button>
              </div>
            ) : (
              <>
                <button onClick={() => {
                  resetBall();
                  setGameState(prev => ({ ...prev, streak: 0, isKicking: false, gamePhase: 'idle' }));
                }} className={styles['penalty__reset-btn']}>Reintentar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}