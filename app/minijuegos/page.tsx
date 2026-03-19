"use client";
import { useState, useContext, useEffect } from 'react';
import styles from './Minijuegos.module.scss';
import { AppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

// --- Interfaces ---
interface Juego {
  id: string;
  nombre: string;
  descripcion: string;
  imagen_url: string;
  slug: string;
}

const RegisterForm = () => {
  const { setIsRegistered, setUsername } = useContext(AppContext);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const lowercaseName = name.trim().toLowerCase();
  
    if (!lowercaseName) {
      setError("El nombre no puede estar vacío.");
      return;
    }
  
    setError("");
    setLoading(true);
  
    const { data, error: supabaseError } = await supabase
      .from("usuarios")
      .upsert({ username: lowercaseName }, { onConflict: 'username' })
      .select()
      .single();
  
    if (supabaseError) {
      setError("Hubo un problema al conectar con el servidor.");
      setLoading(false);
      return;
    }
  
    setIsRegistered(true);
    setUsername(data.username);
    setLoading(false);
    setName("");
  };

  return (
    <div className={styles.registerBox}>
      <h2 className={styles.registerBox__title}>¡IDENTIFÍCATE, TRAMBOLIKO!</h2>
      <p className={styles.registerBox__subtitle}>Necesitamos tu nombre para el Hall of Fame.</p>

      <form onSubmit={handleSubmit} className={styles.registerBox__form}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          placeholder="Tu apodo tramboliko..."
          disabled={loading}
          className={styles.registerBox__input}
        />
        {error && <span className={styles.error}>{error}</span>}
        <button type="submit" className={styles.registerBox__button} disabled={!name.trim() || loading}>
          {loading ? "CONECTANDO..." : "ENTRAR AL CAMPO"}
        </button>
      </form>
    </div>
  );
};

const Minijuegos = () => {
  const { isRegistered, username } = useContext(AppContext);
  const [juegos, setJuegos] = useState<Juego[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Solución al Hydration Error: Solo renderizar contenido dinámico tras el montaje
  useEffect(() => {
    setMounted(true);
    const fetchJuegos = async () => {
      const { data, error } = await supabase
        .from('juegos')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) setJuegos(data);
      setLoading(false);
    };
    fetchJuegos();
  }, []);

  if (!mounted) return <div className={styles.minijuegos} />;

  return (
    <div className={styles.minijuegos}>
      <header className={styles.minijuegos__header}>
        <h1 className={styles.minijuegos__title}>ZONA GAMER</h1>
        {isRegistered && (
          <div className={styles.minijuegos__userBadge}>
            BIENVENIDO, <span>{username.toUpperCase()}</span>
          </div>
        )}
      </header>

      {!isRegistered ? (
        <RegisterForm />
      ) : (
        <section className={styles.minijuegos__grid}>
          {loading ? (
            <div className={styles.loader}>CALENTANDO EN BANDA...</div>
          ) : (
            juegos.map((juego) => (
              <Link 
                href={`/minijuegos/${juego.slug}`} 
                key={juego.id} 
                className={styles.gameCard}
              >
                <div className={styles.gameCard__imageWrapper}>
                  <Image 
                    src={juego.imagen_url || '/minijuegos/placeholder.jpg'} 
                    alt={juego.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className={styles.gameCard__image}
                  />
                  <div className={styles.gameCard__overlay}>
                    <span>VER RANKING Y JUGAR</span>
                  </div>
                </div>
                
                <div className={styles.gameCard__content}>
                  <h3 className={styles.gameCard__name}>{juego.nombre}</h3>
                  <p className={styles.gameCard__desc}>{juego.descripcion}</p>
                </div>
              </Link>
            ))
          )}
        </section>
      )}
    </div>
  );
};

export default Minijuegos;