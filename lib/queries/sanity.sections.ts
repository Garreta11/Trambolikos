import { client } from "@/sanity/lib/client";

export const getHero = async () => {
  const hero = await client.fetch(`*[_type == "hero"][0]`);
  return hero;
};

export const getPartidos = async () => {
  const partidos = await client.fetch(`*[_type == "match"] | order(date desc)`);
  return partidos;
};

export const getPlayers = async () => {
  const query = `*[_type == "player"] | order(number asc) {
    _id,
    name,
    number,
    position,
    image,
    // "Expandimos" el asset del video para obtener su URL directa
    "actionVideoUrl": actionVideo.asset->url,
    // Traemos el array de estadísticas tal cual
    stats[] {
      statName,
      value
    }
  }`;

  const players = await client.fetch(query);
  return players;
};

export const getStandings = async () => {
  const standings = await client.fetch(`*[_type == "standings"][0]`);
  return standings;
};

export const getMedia = async () => {
  const query = `*[_type == "media"][0] {
    archiveTitle,
    // Filtramos el array, lo ordenamos por fecha de más reciente a antiguo
    // y proyectamos los campos necesarios incluyendo las URLs de los archivos
    "videoGallery": videoGallery[] | order(date desc) {
      title,
      date,
      description,
      "videoFile": videoFile.asset->url,
      "thumbnailUrl": thumbnail.asset->url
    }
  }`;

  const media = await client.fetch(query);
  return media;
};

export const getInfo = async () => {
  const info = await client.fetch(`*[_type == "info"][0]`);
  return info;
};