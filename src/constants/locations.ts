/**
 * Authoritative campus locations for CampusCare.
 * Exactly these 12 locations in this specified order.
 */
export const CAMPUS_BUILDINGS = [
  'M Block',
  'Shed A',
  'Shed B',
  'Shed C',
  'N Block',
  'Pharmacy Block',
  'P Block',
  'Hostel',
  'Canteen',
  'Gym',
  'Football Court',
  'Parking',
] as const;

export type CampusBuilding = (typeof CAMPUS_BUILDINGS)[number];
