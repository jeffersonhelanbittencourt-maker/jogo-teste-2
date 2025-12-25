
import { Attribute, Skill } from './types';

export const T20_SKILLS: Skill[] = [
  { name: "Acrobacia", attr: Attribute.DES, trained: false, bonus: 0 },
  { name: "Adestramento", attr: Attribute.CAR, trained: false, bonus: 0 },
  { name: "Atletismo", attr: Attribute.FOR, trained: false, bonus: 0 },
  { name: "Atuação", attr: Attribute.CAR, trained: false, bonus: 0 },
  { name: "Cavalaria", attr: Attribute.DES, trained: false, bonus: 0 },
  { name: "Conhecimento", attr: Attribute.INT, trained: false, bonus: 0 },
  { name: "Cura", attr: Attribute.SAB, trained: false, bonus: 0 },
  { name: "Diplomacia", attr: Attribute.CAR, trained: false, bonus: 0 },
  { name: "Enganação", attr: Attribute.CAR, trained: false, bonus: 0 },
  { name: "Fortitude", attr: Attribute.CON, trained: false, bonus: 0 },
  { name: "Furtividade", attr: Attribute.DES, trained: false, bonus: 0 },
  { name: "Guerra", attr: Attribute.INT, trained: false, bonus: 0 },
  { name: "Iniciativa", attr: Attribute.DES, trained: false, bonus: 0 },
  { name: "Intimidação", attr: Attribute.CAR, trained: false, bonus: 0 },
  { name: "Intuição", attr: Attribute.SAB, trained: false, bonus: 0 },
  { name: "Investigação", attr: Attribute.INT, trained: false, bonus: 0 },
  { name: "Jogatina", attr: Attribute.CAR, trained: false, bonus: 0 },
  { name: "Ladinagem", attr: Attribute.DES, trained: false, bonus: 0 },
  { name: "Luta", attr: Attribute.FOR, trained: false, bonus: 0 },
  { name: "Misticismo", attr: Attribute.INT, trained: false, bonus: 0 },
  { name: "Nobreza", attr: Attribute.INT, trained: false, bonus: 0 },
  { name: "Ofício", attr: Attribute.INT, trained: false, bonus: 0 },
  { name: "Percepção", attr: Attribute.SAB, trained: false, bonus: 0 },
  { name: "Pilotagem", attr: Attribute.DES, trained: false, bonus: 0 },
  { name: "Pontaria", attr: Attribute.DES, trained: false, bonus: 0 },
  { name: "Reflexos", attr: Attribute.DES, trained: false, bonus: 0 },
  { name: "Religião", attr: Attribute.SAB, trained: false, bonus: 0 },
  { name: "Sobrevivência", attr: Attribute.SAB, trained: false, bonus: 0 },
  { name: "Vontade", attr: Attribute.SAB, trained: false, bonus: 0 }
];

export const INITIAL_ATTRS: Record<Attribute, number> = {
  [Attribute.FOR]: 10,
  [Attribute.DES]: 10,
  [Attribute.CON]: 10,
  [Attribute.INT]: 10,
  [Attribute.SAB]: 10,
  [Attribute.CAR]: 10,
};
