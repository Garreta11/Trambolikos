import { defineType } from "sanity";

export default defineType({
  name: 'match',
  title: 'Partido',
  type: 'document',
  fields: [
    {
      name: 'opponent',
      title: 'Equipo Rival',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'date',
      title: 'Fecha y Hora',
      type: 'datetime',
      options: {
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        calendarTodayLabel: 'Hoy'
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'location',
      title: 'Condición',
      type: 'string',
      options: {
        list: [
          { title: 'Local', value: 'home' },
          { title: 'Visitante', value: 'away' }
        ],
        layout: 'radio' // Se ve más limpio que un dropdown
      },
      initialValue: 'home'
    },
    {
      name: 'isFinished',
      title: '¿El partido ha terminado?',
      type: 'boolean',
      initialValue: false
    },
    {
      name: 'score',
      title: 'Resultado Final',
      type: 'object',
      hidden: ({ document }) => !document?.isFinished, // Solo aparece si el partido terminó
      fields: [
        { name: 'goalsHome', title: 'Goles Local', type: 'number' },
        { name: 'goalsAway', title: 'Goles Visitante', type: 'number' }
      ]
    }
  ],
  preview: {
    select: {
      title: 'opponent',
      date: 'date',
      location: 'location'
    },
    prepare({ title, date, location }) {
      const condition = location === 'home' ? '(L)' : '(V)';
      return {
        title: `${condition} vs ${title}`,
        subtitle: date ? new Date(date).toLocaleDateString() : 'Sin fecha'
      };
    }
  }
});