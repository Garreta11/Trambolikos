import type { StructureResolver } from "sanity/structure";
import { singletonTypes } from "./lib/singleton";

// context is required by orderableDocumentListDeskItem — it was missing before
export const structure: StructureResolver = (S, context) =>
  S.list()
    .title("Content")
    .items([
      // Home singleton
      S.listItem()
        .title("Hero")
        .id("hero")
        .child(
          S.document()
            .schemaType("hero")
            .documentId("hero")
        ),

      // Standings singleton
      S.listItem()
        .title("Clasificación")
        .id("standings")
        .child(
          S.document()
            .schemaType("standings")
            .documentId("standings")
        ),

      // Media library
      S.listItem()
        .title("Media")
        .id("media")
        .child(
          S.document()
            .schemaType("media")
            .documentId("media")
        ),

      // Info singleton
      S.listItem()
        .title("Info")
        .id("info")
        .child(
          S.document()
            .schemaType("info")
            .documentId("info")
        ),

      // All other document types — exclude singletons AND post (already listed above)
      ...S.documentTypeListItems().filter(
        (item) =>
          !singletonTypes.has(item.getId()!) &&
          item.getId() !== "post"
      ),
    ]);