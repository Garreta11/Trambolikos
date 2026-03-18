import { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { SanityFileSource } from "@/lib/sanity.video";

export type Hero = {
  _id: string;
  subheader: string;
  title: {
    part1: string;
    part2: string;
    part3: string;
  };
  description: string;
  logo: SanityImageSource;
  ctas: {
    label: string;
    link: string;
    style: string;
  }[];
};

export type Match = {
  _id: string;
  opponent: string;
  date: string;
  location: string;
  isFinished: boolean;
  score: {
    goalsHome: number;
    goalsAway: number;
  };
};

export type Player = {
  _id: string;
  name: string;
  number: number;
  position: string;
  image: SanityImageSource;
  actionVideoUrl: string;
  stats: {
    statName: string;
    value: string;
  }[];
};

export type Standing = {
  _id: string;
  season: string;
  leagueTable: {
    rank: number;
    teamName: string;
    logo: SanityImageSource;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    points: number;
    isTrambolikos: boolean;
  }[];
};

export type Media = {
  _id: string;
  archiveTitle: string;
  videoGallery: {
    title: string;
    date: string;
    description: string;
    videoFile: string;
    thumbnail: SanityImageSource;
  }[];
};

export type Info = {
  _id: string;
  subtitle: string;
  title: string;
  description: string;
  ctas: {
    label: string;
    link: string;
    variant: string;
  }[];
};