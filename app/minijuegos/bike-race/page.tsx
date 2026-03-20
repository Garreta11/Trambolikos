"use client"
import styles from './page.module.scss';
import { useState } from 'react';
import BikeRace from './BikeRace';
import Leaderboard from '@/components/ui/Leaderboard/Leaderboard';

const BikeRacePage = () => {
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  const handleNewRecord = () => {
    setLeaderboardKey(prev => prev + 1);
  };

  return (
    <div className={styles.page}>
      <BikeRace onScoreSaved={handleNewRecord} />
      <Leaderboard key={leaderboardKey} gameName="bike-race" reverse={true} />
    </div>
  )
};

export default BikeRacePage;