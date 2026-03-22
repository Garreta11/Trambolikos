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
        <p className={styles.matches__day}>
          <span className={styles.matches__day__week}>
            {new Date(match.date).toLocaleDateString('es-ES', { weekday: 'short' })}
          </span>
          <span className={styles.matches__day__number}>
            {new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit' })}
          </span>
          <span className={styles.matches__day__month}>
            {new Date(match.date).toLocaleDateString('es-ES', { month: 'short' })}
          </span>
        </p>
        
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
        <p className={styles.matches__hour}>
          {new Date(match.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className={styles.matches__location}>TARR Vall d'Hebron</p>
      </div>
    </div>
  );

  return (
    <section className={styles.matches} id="partidos">
      <div className={styles.matches__glow} />
      
      <div className={styles.matches__wrapper}>
        <div className={`${styles.matches__section} ${styles.matches__section__history}`}>
          <header className={styles.matches__header}>
          <div className={styles.matches__title}>
              <div className={styles.matches__title__subtitle}>
                <div className={styles.matches__title__subtitle__icon} />
                Historial
              </div>
              <h2 className={styles.matches__title__text}>Resultados</h2>
            </div>
          </header>
          <div className={styles.matches__grid}>
            {playedMatches.length > 0 ? (
              playedMatches.map((match) => <MatchCard key={match._id} match={match} />)
            ) : (
              <p className={styles.matches__noMatches}>Aún no hay resultados registrados</p>
            )}
          </div>
        </div>
        
        <div className={styles.matches__section}>
          <header className={styles.matches__header}>
            <div className={styles.matches__title}>
              <div className={styles.matches__title__subtitle}>
                <div className={styles.matches__title__subtitle__icon} />
                Calendario
              </div>
              <h2 className={styles.matches__title__text}>Próximos Partidos</h2>
            </div>
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