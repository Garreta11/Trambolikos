import { defineField, defineType } from "sanity";

export default defineType({
  name: "hero",
  title: "Hero",
  type: "document",
  fields: [
    defineField({
      name: "subheader",
      title: "Subheader",
      type: "string",
    }),
    // Título dividido en tres partes
    defineField({
      name: "title",
      title: "Título (3 partes)",
      type: "object",
      fields: [
        { name: "part1", title: "Parte 1", type: "string" },
        { name: "part2", title: "Parte 2 (Destacada)", type: "string" },
        { name: "part3", title: "Parte 3", type: "string" },
      ],
      options: { columns: 3 } // Esto los alinea visualmente en el Studio
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text", // Usamos 'text' para que el campo sea más grande que un 'string'
      rows: 3,
    }),
    // Array de CTA (Call to Action)
    defineField({
      name: "ctas",
      title: "Call to Action Buttons",
      type: "array",
      of: [
        {
          type: "object",
          name: "cta",
          fields: [
            { name: "label", title: "Texto del botón", type: "string" },
            { name: "link", title: "Enlace (URL)", type: "string" },
            { 
              name: "style", 
              title: "Estilo", 
              type: "string", 
              options: { list: ["primary", "secondary"] } 
            },
          ],
        },
      ],
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      options: {
        hotspot: true, // Permite recortar la imagen visualmente
      },
    }),
  ],
});