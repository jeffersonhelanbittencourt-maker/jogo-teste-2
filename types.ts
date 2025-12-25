
export enum Attribute {
  FOR = 'FOR',
  DES = 'DES',
  CON = 'CON',
  INT = 'INT',
  SAB = 'SAB',
  CAR = 'CAR'
}

export type ArmorType = 'Nenhuma' | 'Leve' | 'Média' | 'Pesada';

export interface Skill {
  name: string;
  attr: Attribute;
  trained: boolean;
  bonus: number;
}

export interface Character {
  name: string;
  level: number;
  attrs: Record<Attribute, number>;
  pv: { cur: number; max: number };
  pm: { cur: number; max: number };
  defense: number;
  armorBonus: number;
  shieldBonus: number;
  armorType: ArmorType;
}

export interface Token {
  id: string;
  name: string;
  type: 'pc' | 'npc' | 'enemy';
  gx: number;
  gy: number;
  avatar?: string;
  hp?: number;
  maxHp?: number;
}

export interface Message {
  id: string;
  user: string;
  text: string;
  time: string;
  type: 'chat' | 'roll' | 'system' | 'ai';
  total?: number;
  details?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  weight: number;
}

export interface Spell {
  id: string;
  name: string;
  cost: number;
  description: string;
}
