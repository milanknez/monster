import { Localized } from '../types';

export interface DungeonEnemyDef {
  id: string;
  name: Localized<string> | string;
  type: string;
  image: string;
  description?: Localized<string> | string;
}

export const DUNGEON_ENEMIES: Record<string, DungeonEnemyDef> = {
  shadow_bat: {
    id: 'shadow_bat',
    name: {
      cz: 'Stínový Netopýr',
      en: 'Umbrabat',
      sk: 'Tieňový Netopier'
    },
    type: 'dark',
    image: '/dungeon/shadow_bat.png',
    description: {
      cz: 'Tvor zrozený v nejhlubších puklinách jeskyně. Jeho křídla jsou utkaná ze stínové mlhy.',
      en: 'A creature born in the deepest cracks of the cave. Its wings are woven from shadow mist.',
      sk: 'Tvor zrodený v najhlbších puklinách jaskyne. Jeho krídla sú utkané z tieňovej hmly.'
    }
  }
};
