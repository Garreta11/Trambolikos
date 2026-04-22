'use client';
import styles from './page.module.scss';
import { useState } from 'react';
import GuessWho from './GuessWho';
import Leaderboard from '@/components/ui/Leaderboard/Leaderboard';
import Link from 'next/link';

const AdivinaQuienPage = () => {
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  return (
    <div className={styles.page}>
      <div className={styles.page__back}>
        <Link href="/minijuegos">Ir a minijuegos</Link>
      </div>
      <div className={styles.page__wrapper}>
        <GuessWho onScoreSaved={() => setLeaderboardKey(k => k + 1)} />
        <Leaderboard key={leaderboardKey} gameName="adivina-quien" />
      </div>
    </div>
  );
};

export default AdivinaQuienPage;
