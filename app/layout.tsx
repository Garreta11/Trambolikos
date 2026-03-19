import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.scss";
import SmoothScroll from "@/components/layout/SmoothScroll";
import { AppProvider } from "@/context/AppContext";

// Components
import Header from "@/components/layout/Header/Header";
import Footer from "@/components/layout/Footer/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trambolikos FC",
  description: "El noveno mejor equipo de ocho. Pero aquí seguimos, cada lunes, con el escudo bien puesto y la camiseta sin lavar.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider>
          <SmoothScroll>
            <Header />
            {children}
            <Footer />
          </SmoothScroll>
        </AppProvider>
      </body>
    </html>
  );
}
