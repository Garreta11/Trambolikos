import { defineType } from "sanity";
export default defineType({
  name: 'info',
  title: 'Información General',
  type: 'document',
  fields: [
    {
      name: 'subtitle',
      title: 'Subtítulo',
      type: 'string',
      description: 'Texto pequeño sobre el título (ej: SOBRE NOSOTROS)',
      initialValue: 'Trambolikos FC'
    },
    {
      name: 'title',
      title: 'Título Principal',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'description',
      title: 'Descripción',
      type: 'text',
      rows: 5,
      description: 'Cuerpo de texto principal'
    },
    {
      name: 'ctas',
      title: 'Botones de Acción (CTAs)',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'cta',
          title: 'Botón',
          fields: [
            { name: 'label', title: 'Texto del Botón', type: 'string' },
            { name: 'link', title: 'Enlace (URL o #seccion)', type: 'string' },
            { 
              name: 'variant', 
              title: 'Estilo', 
              type: 'string',
              options: {
                list: [
                  { title: 'Principal (Rosa)', value: 'primary' },
                  { title: 'Secundario (Borde)', value: 'secondary' },
                ]
              },
              initialValue: 'primary'
            }
          ],
          preview: {
            select: {
              title: 'label',
              subtitle: 'link'
            }
          }
        }
      ]
    }
  ]
});