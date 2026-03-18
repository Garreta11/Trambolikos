"use client";
import styles from "./Info.module.scss";
import { useEffect, useState } from "react";
import { getInfo } from "@/lib/queries/sanity.sections";
import { Info as InfoType } from "@/lib/types";

const Info = () => {
  const [info, setInfo] = useState<InfoType | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      const data = await getInfo();
      setInfo(data);
    };
    fetchInfo();
  }, []);

  if (!info) return null;

  return (
    <section className={styles.info}>
      <div className={styles.info__container}>
        <div className={styles.info__content}>
          <div className={styles.info__subtitleGroup}>
            <div className={styles.info__line} />
            <span className={styles.info__subtitle}>{info.subtitle}</span>
            <div className={styles.info__line} />
          </div>

          <h1 className={styles.info__title}>{info.title}</h1>
          
          <div className={styles.info__details}>
            <p className={styles.info__description}>{info.description}</p>
            
            <div className={styles.info__ctas}>
              {info.ctas.map((cta) => (
                <a 
                  key={cta.label}
                  href={cta.link} 
                  className={`btn-${cta.variant}`}
                >
                  {cta.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Elemento decorativo de fondo */}
      <div className={styles.info__bgText}>TFC</div>
    </section>
  );
};

export default Info;