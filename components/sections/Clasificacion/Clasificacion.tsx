"use client";
import styles from "./Clasificacion.module.scss";
import { useEffect, useState } from "react";
import { getStandings } from "@/lib/queries/sanity.sections";
import Image from "next/image";
import { Standing as StandingType } from "@/lib/types";
import { urlFor } from "@/lib/sanity.image";

const Clasificacion = () => {
  const [standings, setStandings] = useState<StandingType | null>(null);

  useEffect(() => {
    const fetchStandings = async () => {
      const data = await getStandings();
      setStandings(data);
    };
    fetchStandings();
  }, []);

  if (!standings) return null;

  return (
    <section className={styles.standings} id="clasificación">
      <header className={styles.standings__header}>
        <div className={styles.standings__titleWrapper}>
          <h2 className={styles.standings__title}>Tabla de Posiciones</h2>
          <div className={styles.standings__status}>
            <span className={styles.standings__dot}></span>
            En Vivo — {standings.season}
          </div>
        </div>
      </header>

      <div className={styles.standings__container}>
        <div className={styles.standings__table}>
          
          {/* Header de la Tabla */}
          <div className={`${styles.standings__row} ${styles['standings__row--head']}`}>
            <div className={styles.standings__cell}>#</div>
            <div className={`${styles.standings__cell} ${styles['standings__cell--team']}`}>Club</div>
            <div className={styles.standings__cell}>PJ</div>
            <div className={styles.standings__cell}>G</div>
            <div className={styles.standings__cell}>E</div>
            <div className={styles.standings__cell}>P</div>
            <div className={`${styles.standings__cell} ${styles['standings__cell--hideMobile']}`}>GF</div>
            <div className={`${styles.standings__cell} ${styles['standings__cell--hideMobile']}`}>GC</div>
            <div className={`${styles.standings__cell} ${styles['standings__cell--points']}`}>PTS</div>
          </div>

          {/* Filas de Equipos */}
          <div className={styles.standings__body}>
            {standings.leagueTable?.map((item, idx: number) => (
              <div 
                key={idx} 
                className={`
                  ${styles.standings__row} 
                  ${item.isTrambolikos ? styles['standings__row--highlight'] : ""}
                `}
              >
                <div className={styles.standings__cell}>
                  <span className={styles.standings__rank}>{item.rank}</span>
                </div>
                <div className={`${styles.standings__cell} ${styles['standings__cell--team']}`}>
                  {item.logo && (
                    <div className={styles.standings__logo}>
                      <Image src={urlFor(item.logo).url()} alt={item.teamName} fill />
                    </div>
                  )}
                  <span className={styles.standings__teamName}>{item.teamName}</span>
                </div>
                <div className={styles.standings__cell}>{item.played}</div>
                <div className={styles.standings__cell}>{item.won}</div>
                <div className={styles.standings__cell}>{item.drawn}</div>
                <div className={styles.standings__cell}>{item.lost}</div>
                <div className={`${styles.standings__cell} ${styles['standings__cell--hideMobile']}`}>{item.gf}</div>
                <div className={`${styles.standings__cell} ${styles['standings__cell--hideMobile']}`}>{item.ga}</div>
                <div className={`${styles.standings__cell} ${styles['standings__cell--points']}`}>{item.points}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Clasificacion;