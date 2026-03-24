'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './Leaderboard.module.scss';
import { ConfigResolutionError } from 'sanity';

interface Leader {
  username: string;
  score: number;
  
}

const Leaderboard: React.FC<{ gameName: string, reverse?: boolean }> = ({ gameName, reverse = false }) => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaders = useCallback(async () => {
    try {
      const { data: gameData } = await supabase.from('juegos').select('id').eq('slug', gameName).single();
      if (!gameData) return;

      const { data } = await supabase
        .from('puntuaciones')
        .select(`score, usuarios ( username )`)
        .eq('juego_id', gameData.id)
        .order('score', { ascending: reverse })
        .limit(8); // Mostramos un poco más para que luzca el diseño

      console.log(data)
      if (data) {
        setLeaders(data.map((item: any) => ({
          username: item.usuarios?.username || 'ANÓNIMO',
          score: item.score,
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [gameName]);

  useEffect(() => {
    fetchLeaders();
  
    // Suscribirse a cambios en la tabla 'puntuaciones'
    const channel = supabase
      .channel('puntuaciones_cambios')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'puntuaciones' },
        () => {
          console.log("Cambio detectado, actualizando ranking...");
          fetchLeaders();
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeaders]);

  return (
    <aside className={styles.leaderboard}>
      <div className={styles.leaderboard__header}>
        <h3 className={styles.leaderboard__title}>CLASIFICACIÓN</h3>
        <div className={styles.leaderboard__badge}>LIVE</div>
      </div>
      
      <div className={styles.leaderboard__content}>
        {loading ? (
          <p className={styles.leaderboard__status}>CARGANDO...</p>
        ) : (
          <ul className={styles.leaderboard__list}>
            {leaders.map((leader, index) => (
              <li key={index} className={`${styles.leaderboard__item} ${index === 0 ? styles['leaderboard__item--gold'] : ''}`}>
                <span className={styles.leaderboard__index}>{(index + 1).toString().padStart(2, '0')}</span>
                <span className={styles.leaderboard__name}>{leader.username}</span>
                <span className={styles.leaderboard__score}>{leader.score.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default Leaderboard;