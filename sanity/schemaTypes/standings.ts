import { defineType } from "sanity";

export default defineType({
  name: 'standings',
  title: 'Clasificación',
  type: 'document',
  fields: [
    {
      name: 'season',
      title: 'Temporada',
      type: 'string',
      initialValue: '2025/2026',
      validation: Rule => Rule.required()
    },
    {
      name: 'leagueTable',
      title: 'Tabla de la Liga',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'teamStats',
          title: 'Estadísticas de Equipo',
          fields: [
            { name: 'rank', title: 'Posición', type: 'number' },
            { name: 'teamName', title: 'Nombre del Equipo', type: 'string' },
            { 
              name: 'logo', 
              title: 'Logo/Escudo', 
              type: 'image',
              options: { hotspot: true }
            },
            { name: 'played', title: 'PJ', type: 'number', initialValue: 0 },
            { name: 'won', title: 'PG', type: 'number', initialValue: 0 },
            { name: 'drawn', title: 'PE', type: 'number', initialValue: 0 },
            { name: 'lost', title: 'PP', type: 'number', initialValue: 0 },
            { name: 'gf', title: 'GF', type: 'number', description: 'Goles a Favor' },
            { name: 'ga', title: 'GC', type: 'number', description: 'Goles en Contra' },
            { name: 'points', title: 'Puntos', type: 'number', initialValue: 0 },
            { 
              name: 'isTrambolikos', 
              title: '¿Es nuestro equipo?', 
              type: 'boolean',
              initialValue: false,
              description: 'Activa esto para resaltar la fila en la web'
            }
          ],
          preview: {
            select: {
              title: 'teamName',
              subtitle: 'points',
              media: 'logo',
              rank: 'rank'
            },
            prepare({ title, subtitle, media, rank }) {
              return {
                title: `${rank}º - ${title}`,
                subtitle: `${subtitle} Puntos`,
                media: media
              }
            }
          }
        }
      ],
      // Validación para asegurar que los equipos se ordenen por puntos en el Studio
      validation: Rule => Rule.unique()
    }
  ]
});