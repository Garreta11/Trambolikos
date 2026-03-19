import styles from "./page.module.scss";
import Hero from "@/components/sections/Hero/Hero";
import Partidos from "@/components/sections/Partidos/Partidos";
import Plantilla from "@/components/sections/Plantilla/Plantilla";
import Clasificacion from "@/components/sections/Clasificacion/Clasificacion";
import Media from "@/components/sections/Media/Media";
import Info from "@/components/sections/Info/Info";

export default function Home() {
  return (
    <div className={styles.page}>
      <Hero />
      <Partidos />
      <Plantilla />
      <Clasificacion />
      <Media />
      <Info />
    </div>
  );
}
