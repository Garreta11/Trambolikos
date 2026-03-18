import { defineType } from "sanity";
export default defineType({
  name: 'media',
  title: 'Galería Media',
  type: 'document',
  fields: [
    {
      name: 'archiveTitle',
      title: 'Título de la Sección',
      type: 'string',
      initialValue: 'Trambolikos TV'
    },
    {
      name: 'videoGallery',
      title: 'Galería de Videos',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'videoItem',
          title: 'Video',
          fields: [
            {
              name: 'title',
              title: 'Título del Video',
              type: 'string',
              validation: Rule => Rule.required()
            },
            {
              name: 'date',
              title: 'Fecha de publicación',
              type: 'date',
              options: {
                dateFormat: 'DD-MM-YYYY',
              },
              initialValue: (new Date()).toISOString().split('T')[0]
            },
            {
              name: 'description',
              title: 'Descripción',
              type: 'text',
              rows: 3
            },
            {
              name: 'videoFile',
              title: 'Archivo de Video',
              type: 'file',
              options: {
                accept: 'video/mp4, video/x-m4v, video/*'
              },
              validation: Rule => Rule.required()
            },
            {
              name: 'thumbnail',
              title: 'Miniatura (Poster)',
              type: 'image',
              description: 'Imagen que se verá antes de darle al play',
              options: { hotspot: true }
            }
          ],
          preview: {
            select: {
              title: 'title',
              date: 'date',
              media: 'thumbnail'
            },
            prepare({ title, date, media }) {
              return {
                title: title,
                subtitle: date ? new Date(date).toLocaleDateString() : 'Sin fecha',
                media: media
              }
            }
          }
        }
      ]
    }
  ]
});