"use client";
import styles from "./Partidos.module.scss";
import { useEffect, useState } from "react";
import { Match as MatchType } from "@/lib/types";
import { getPartidos } from "@/lib/queries/sanity.sections";

const Partidos = () => {
  const [partidos, setPartidos] = useState<MatchType[]>([]);

  useEffect(() => {
    const fetchPartidos = async () => {
      const data = await getPartidos();
      setPartidos(data);
    };
    fetchPartidos();
  }, []);

  const playedMatches = partidos.filter((m) => m.isFinished);
  const upcomingMatches = partidos.filter((m) => !m.isFinished).reverse();

  /* No changes to the logic, just ensuring the class application is consistent */
  const MatchCard = ({ match }: { match: MatchType }) => (
    <div className={`
      ${styles.matches__card} 
      ${match.location === 'home' ? styles['matches__card--home'] : styles['matches__card--away']}
    `}>
      {/* Left Column: Date */}
      <div className={styles.matches__columnLeft}>
        <span className={styles.matches__day}>
          {new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
        </span>
        <span className={styles.matches__hour}>
          {new Date(match.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      
      {/* Center Column: Teams & Score */}
      <div className={styles.matches__columnCenter}>
        <span className={`${styles.matches__teamName} ${styles['matches__teamName--left']} ${match.location === 'home' ? styles['matches__teamName--highlight'] : ''}`}>
          {match.location === 'home' ? 'Trambolikos FC' : match.opponent}
        </span>
        
        <div className={styles.matches__scoreBox}>
          {match.isFinished ? (
            <span className={styles.matches__score}>
              {match.score.goalsHome} - {match.score.goalsAway}
            </span>
          ) : (
            <span className={styles.matches__vsBadge}>VS</span>
          )}
        </div>

        <span className={`${styles.matches__teamName} ${styles['matches__teamName--right']} ${match.location === 'away' ? styles['matches__teamName--highlight'] : ''}`}>
          {match.location === 'home' ? match.opponent : 'Trambolikos FC'}
        </span>
      </div>

      {/* Right Column: Status Tag */}
      <div className={styles.matches__columnRight}>
        <span className={match.location === 'home' ? styles.matches__tagHome : styles.matches__tagAway}>
          {match.location === 'home' ? 'Local' : 'Visitante'}
        </span>
      </div>
    </div>
  );

  return (
    <section className={styles.matches} id="partidos">
      <div className={styles.matches__glow} />
      
      <div className={styles.matches__wrapper}>
      <div className={styles.matches__section}>
          <header className={styles.matches__header}>
            <h2 className={`${styles.matches__title}`}>
            <span className={styles.matches__liveDot}></span> Resultados Recientes
            </h2>
          </header>
          <div className={styles.matches__grid}>
            {playedMatches.length > 0 ? (
              playedMatches.map((match) => <MatchCard key={match._id} match={match} />)
            ) : (
              <p className={styles.matches__noMatches}>Aún no hay resultados registrados</p>
            )}
          </div>
        </div>

        <div className={styles.matches__divider}></div>
        
        <div className={styles.matches__section}>
          <header className={styles.matches__header}>
            <h2 className={styles.matches__title}>
              <span className={styles.matches__liveDot}></span> Próximos Encuentros
            </h2>
          </header>
          <div className={styles.matches__grid}>
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map((match) => <MatchCard key={match._id} match={match} />)
            ) : (
              <p className={styles.matches__noMatches}>No hay partidos programados</p>
            )}
          </div>
        </div>
        
      </div>
    </section>
  );
};

export default Partidos;