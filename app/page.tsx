import styles from "./page.module.scss";
import Hero from "@/components/sections/Hero/Hero";
import Header from "@/components/layout/Header/Header";
import Partidos from "@/components/sections/Partidos/Partidos";
import Plantilla from "@/components/sections/Plantilla/Plantilla";
import Clasificacion from "@/components/sections/Clasificacion/Clasificacion";
import Media from "@/components/sections/Media/Media";
import Info from "@/components/sections/Info/Info";
import Footer from "@/components/layout/Footer/Footer";

export default function Home() {
  return (
    <div className={styles.page}>
      <Header />
      <Hero />
      <Partidos />
      <Plantilla />
      <Clasificacion />
      <Media />
      <Info />
      <Footer />
    </div>
  );
}
