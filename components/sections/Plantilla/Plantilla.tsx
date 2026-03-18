"use client";
import styles from "./Plantilla.module.scss";
import { useEffect, useState } from "react";
import { getPlayers } from "@/lib/queries/sanity.sections";
import { Player as PlayerType } from "@/lib/types";
import Image from "next/image";
import { urlFor } from "@/lib/sanity.image";

const Plantilla = () => {
  const [players, setPlayers] = useState<PlayerType[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const data = await getPlayers();
      const sorted = data.sort((a: PlayerType, b: PlayerType) => a.number - b.number);
      setPlayers(sorted);
    };
    fetchPlayers();
  }, []);

  // Función para reiniciar el video al entrar con el ratón
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = e.currentTarget.querySelector("video");
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {}); // Evita errores de promesa en navegadores
    }
  };

  const positionsOrder = ["GK", "DF", "MF", "FW"];
  const positionNames: Record<string, string> = {
    GK: "Guardianes",
    DF: "Defensa",
    MF: "Medio",
    FW: "Ataque",
  };

  return (
    <section className={styles.roster}>
      <header className={styles.roster__header}>
        <div className={styles.roster__titleGroup}>
          <span className={styles.roster__subtitle}>Temporada 2026</span>
          <h1 className={styles.roster__title}>Primer Equipo</h1>
        </div>
        <div className={styles.roster__line}></div>
      </header>

      {positionsOrder.map((pos) => {
        const playersInPos = players.filter((p) => p.position === pos);
        if (playersInPos.length === 0) return null;

        return (
          <div key={pos} className={styles.roster__section}>
            <h2 className={styles.roster__sectionTitle}>{positionNames[pos]}</h2>
            <div className={styles.roster__grid}>
              {playersInPos.map((player) => (
                <article 
                  key={player._id} 
                  className={styles.playerCard}
                  onMouseEnter={handleMouseEnter} // Reinicia video aquí
                >
                  <div className={styles.playerCard__media}>
                    <Image
                      src={urlFor(player.image).url()}
                      alt={player.name}
                      fill
                      className={styles.playerCard__image}
                    />
                    
                    {player.actionVideoUrl && (
                      <video
                        src={player.actionVideoUrl}
                        className={styles.playerCard__video}
                        loop
                        muted
                        playsInline
                      />
                    )}

                    <div className={styles.playerCard__stats}>
                      {player.stats?.map((stat, i) => (
                        <div key={i} className={styles.playerCard__statItem}>
                          <span className={styles.playerCard__statLabel}>{stat.statName}</span>
                          <span className={styles.playerCard__statValue}>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.playerCard__info}>
                    <span className={styles.playerCard__number}>{player.number}</span>
                    <div className={styles.playerCard__nameWrapper}>
                      <h3 className={styles.playerCard__name}>{player.name}</h3>
                      <span className={styles.playerCard__pos}>{player.position}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default Plantilla;