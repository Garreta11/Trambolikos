"use client";
import styles from "./Hero.module.scss";
import { getHero } from "@/lib/queries/sanity.sections";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Hero as HeroType } from "@/lib/types";
import { urlFor } from "@/lib/sanity.image";

const Hero = () => {
  const [hero, setHero] = useState<HeroType | null>(null);

  useEffect(() => {
    const fetchHero = async () => {
      const data = await getHero();
      setHero(data);
    };
    fetchHero();
  }, []);

  return (
    <div className={styles.hero}>
      {/* Dynamic Background Glows */}
      <div className={styles.hero__glow} />
      
      <svg className={styles.hero__pitch} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        <g className={styles.hero__pitchLines} filter="url(#neonGlow)">
          <rect x="250" y="125" width="940" height="550"></rect>
          <line x1="720" y1="125" x2="720" y2="675"></line>
          <circle cx="720" cy="400" r="75"></circle>
          <circle cx="720" cy="400" r="4" fill="#f72585"></circle>
          <rect x="250" y="255" width="160" height="290"></rect>
          <rect x="250" y="315" width="55" height="170"></rect>
          <circle cx="360" cy="400" r="3.5" fill="#f72585"></circle>
          <path d="M 410 344 A 75 75 0 0 1 410 456"></path>
          <rect x="230" y="362" width="20" height="76"></rect>
          <rect x="1030" y="255" width="160" height="290"></rect>
          <rect x="1135" y="315" width="55" height="170"></rect>
          <circle cx="1080" cy="400" r="3.5" fill="#f72585"></circle>
          <path d="M 1030 344 A 75 75 0 0 0 1030 456"></path>
          <rect x="1190" y="362" width="20" height="76"></rect>
        </g>

        <g fill="#f72585">
          {[
            {cx: 290, cy: 400, d: "0s"}, {cx: 430, cy: 185, d: ".3s"},
            {cx: 430, cy: 315, d: ".6s"}, {cx: 430, cy: 485, d: ".9s"},
            {cx: 430, cy: 615, d: "1.2s"}, {cx: 590, cy: 270, d: "1.5s"},
            {cx: 590, cy: 400, d: "1.8s"}, {cx: 590, cy: 530, d: "2.1s"},
            {cx: 750, cy: 215, d: "2.4s"}, {cx: 750, cy: 400, d: "2.7s"},
            {cx: 750, cy: 585, d: "3s"}
          ].map((dot, i) => (
            <circle 
              key={i}
              className={styles.hero__pitchDot} 
              cx={dot.cx} cy={dot.cy} r="5" 
              style={{ animationDelay: dot.d }}
            />
          ))}
        </g>
      </svg>

      <div className={styles.hero__wrapper}>
        <div className={styles.hero__content}>
          <div className={styles.hero__titleGroup}>
            <div className={styles.hero__subheader}>
              <span>{hero?.subheader}</span>
            </div>

            <h1 className={`${styles.hero__titleMain} text-mega`}>
              {hero?.title?.part1}<br/>
              <span className={styles.hero__titleAccent}>{hero?.title?.part2}</span>
            </h1>
            
            <div className={`${styles.hero__titleSmall} text-display`}>
              <p>{hero?.title?.part3}</p>
            </div>
          </div>

          <p className={styles.hero__description}>{hero?.description}</p>

          <div className={styles.hero__ctas}>
            {hero?.ctas.map((cta) => (
              <a 
                key={cta.label} 
                href={cta.link} 
                className={`btn-${cta.style} ${styles.hero__btn}`}
              >
                {cta.label}
              </a>
            ))}
          </div>
        </div>

        {hero?.logo && (
          <div className={styles.hero__logoContainer}>
            <Image 
              src={urlFor(hero.logo).url()} 
              alt="Logo" 
              width={400} 
              height={400} 
              className={styles.hero__logo}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Hero;