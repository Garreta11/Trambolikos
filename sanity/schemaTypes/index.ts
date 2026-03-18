import { type SchemaTypeDefinition } from 'sanity'
import hero from './hero'
import match from './match'
import player from './player'
import standings from './standings'
import media from './media'
import info from './info'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [hero, match, player, standings, media, info],
}
