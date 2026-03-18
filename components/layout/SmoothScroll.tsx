"use client";
import { useEffect, useRef } from "react";
import Lenis from "@studio-freight/lenis";

// Mantenemos el export para el Header, pero con cuidado
export let lenisInstance: Lenis | null = null;

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const requestRef = useRef<number>(null);

  useEffect(() => {
    // 1. Inicializar Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true, // Asegúrate de que esto esté activo
      orientation: 'vertical',
      gestureOrientation: 'vertical',
    });

    lenisInstance = lenis;

    // 2. Loop de animación optimizado
    function raf(time: number) {
      lenis.raf(time);
      requestRef.current = requestAnimationFrame(raf);
    }

    requestRef.current = requestAnimationFrame(raf);

    // 3. Limpieza (MUY IMPORTANTE)
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  return <>{children}</>;
}