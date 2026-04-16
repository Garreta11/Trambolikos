'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './page.module.scss';
import { useState } from 'react';
import Leaderboard from '@/components/ui/Leaderboard/Leaderboard';

const Shooter = dynamic(() => import('./Shooter'), { ssr: false });

export default function ShooterPage() {
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  const handleNewRecord = () => {
    setLeaderboardKey(prev => prev + 1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.page__back}>
        <Link href="/minijuegos">Ir a minijuegos</Link>
      </div>
      <div className={styles.page__wrapper}>
        <Shooter onScoreSaved={handleNewRecord} />
        <Leaderboard key={leaderboardKey} gameName="shooter" />
      </div>
    </div>
  );
}
