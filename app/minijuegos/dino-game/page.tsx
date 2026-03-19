'use client';
import styles from './page.module.scss';
import { useState } from 'react';
import DinoGame from './DinoGame';
import Leaderboard from '@/components/ui/Leaderboard/Leaderboard';

const DinoPage = () => {
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  const handleNewRecord = () => {
    // Al cambiar la key, React destruye y vuelve a montar el Leaderboard
    // haciendo que ejecute su fetch inicial con los nuevos datos de la DB
    setLeaderboardKey(prev => prev + 1);
  };

  return (
    <div className={styles.page}>
      <DinoGame onScoreSaved={handleNewRecord} />
      <Leaderboard key={leaderboardKey} gameName="dino-game" />
    </div>
  );
};

export default DinoPage;