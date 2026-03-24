'use client';
import styles from './page.module.scss';
import { useState } from 'react';
import Leaderboard from '@/components/ui/Leaderboard/Leaderboard';
import Link from 'next/link';
import MilkGame from './MilkGame';

const MilkPage = () => {
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  const handleNewRecord = () => {
    setLeaderboardKey(prev => prev + 1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.page__back}>
        <Link href="/minijuegos" >
          Ir a minijuegos
        </Link>
      </div>
      <div className={styles.page__wrapper}>
        <MilkGame onScoreSaved={handleNewRecord} />
        <Leaderboard key={leaderboardKey} gameName="milk" />
      </div>
    </div>
  );
};

export default MilkPage;