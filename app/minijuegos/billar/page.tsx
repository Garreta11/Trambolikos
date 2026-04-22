'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.scss';
import { useState } from 'react';
import Leaderboard from '@/components/ui/Leaderboard/Leaderboard';

const Billar = dynamic(() => import('./Billar'), { ssr: false });

export default function BillarPage() {
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  return (
    <div className={styles.page}>
      <div className={styles.page__back}>
        <Link href="/minijuegos">Ir a minijuegos</Link>
      </div>
      <div className={styles.page__wrapper}>
        <Billar onScoreSaved={() => setLeaderboardKey(k => k + 1)} />
        <Leaderboard key={leaderboardKey} gameName="billar" reverse={true} />
      </div>
    </div>
  );
}
