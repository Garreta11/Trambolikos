import { defineType } from "sanity";

export default defineType({
  name: 'player',
  title: 'Plantilla',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nombre del Jugador',
      type: 'string',
      validation: Rule => Rule.required().error('El nombre es obligatorio')
    },
    {
      name: 'number',
      title: 'Dorsal',
      type: 'number',
      validation: Rule => Rule.required().min(1).max(99)
    },
    {
      name: 'position',
      title: 'Posición',
      type: 'string',
      options: {
        list: [
          { title: 'Portero', value: 'GK' },
          { title: 'Defensa', value: 'DF' },
          { title: 'Centrocampista', value: 'MF' },
          { title: 'Delantero', value: 'FW' },
        ],
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'image',
      title: 'Foto Principal',
      type: 'image',
      options: {
        hotspot: true, // Permite recortar la cara del jugador en el CMS
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'actionVideo',
      title: 'Video de Acción',
      type: 'file',
      description: 'Sube un video corto para el efecto hover',
      options: {
        accept: 'video/*'
      }
    },
    {
      name: 'stats',
      title: 'Estadísticas Personalizadas',
      type: 'array',
      description: 'Ej: Goles: 12, Asistencias: 5, Amarillas: 2',
      of: [
        {
          type: 'object',
          name: 'stat',
          title: 'Estadística',
          fields: [
            { 
              name: 'statName', 
              title: 'Nombre de la estadística', 
              type: 'string',
              placeholder: 'Goles, Velocidad, etc.'
            },
            { 
              name: 'value', 
              title: 'Valor (Número)', 
              type: 'string' 
            }
          ],
          preview: {
            select: {
              title: 'statName',
              subtitle: 'value'
            }
          }
        }
      ]
    }
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'position',
      media: 'image',
      number: 'number'
    },
    prepare({ title, subtitle, media, number }) {
      return {
        title: `${number ? '#' + number : ''} - ${title}`,
        subtitle: subtitle,
        media: media
      }
    }
  }
});
