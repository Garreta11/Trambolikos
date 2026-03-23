"use client";
import styles from "./Info.module.scss";
import { useEffect, useState } from "react";
import { getInfo } from "@/lib/queries/sanity.sections";
import { Info as InfoType } from "@/lib/types";
import Button from "@/components/ui/Button";

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
          <div className={styles.info__subtitle}>
            <div className={styles.info__subtitleIcon} />
            <span>{info.subtitle}</span>
          </div>

          <h1
            className={styles.info__title}
            dangerouslySetInnerHTML={{ __html: info.title.replace(/\n/g, '<br/>') }}
          />
          
          <div className={styles.info__details}>
            <p className={styles.info__description}>{info.description}</p>
            
            <div className={styles.info__ctas}>
              {info.ctas.map((cta) => (
                <Button
                  key={cta.label}
                  href={cta.link}
                  variant={cta.variant}
                >
                  {cta.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Info;