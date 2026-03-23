"use client";
import styles from "./Media.module.scss";
import { useEffect, useState, useRef } from "react";
import { getMedia } from "@/lib/queries/sanity.sections";
import { Media as MediaType } from "@/lib/types";

const Media = () => {
  const [data, setData] = useState<MediaType | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      const result = await getMedia();
      setData(result);
    };
    fetchMedia();
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8; 
      const scrollTo = direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (!data || !data.videoGallery) return null;

  return (
    <section className={styles.media} id="media">
      <header className={styles.media__header}>
        <div className={styles.media__titleGroup}>
          <div className={styles.media__subtitle}>
            <div className={styles.media__subtitleIcon} />
            Trambolikos TV
          </div>
          <h2 className={styles.media__title}>{data.archiveTitle || "Archivo Multimedia"}</h2>
        </div>
        <div className={styles.media__controls}>
          <button onClick={() => scroll("left")} className={styles.media__btn} aria-label="Anterior">
            <span>‹</span>
          </button>
          <button onClick={() => scroll("right")} className={styles.media__btn} aria-label="Siguiente">
            <span>›</span>
          </button>
        </div>
      </header>

      <div className={styles.media__carousel} ref={scrollRef}>
        {data.videoGallery.map((item, idx) => (
          <article key={idx} className={styles.media__card}>
            <div className={styles.media__videoWrapper}>
              <video
                src={item.videoFile}
                controls
                playsInline
                className={styles.media__video}
              />
              <div className={styles.media__content}>
                <div className={styles.media__meta}>
                  <span className={styles.media__tag}>Exclusivo</span>
                  <span className={styles.media__date}>
                    {new Date(item.date).toLocaleDateString('es-ES', { 
                      day: '2-digit', month: 'short', year: 'numeric' 
                    })}
                  </span>
                </div>
                <h3 className={styles.media__videoTitle}>{item.title}</h3>
                {item.description && (
                  <p className={styles.media__description}>{item.description}</p>
                )}
              </div>
            </div>
          </article>
        ))}
        {/* Espaciador final para el carrusel */}
        <div className={styles.media__spacer} />
      </div>
    </section>
  );
};

export default Media;