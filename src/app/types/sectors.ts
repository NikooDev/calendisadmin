export interface AdressRecord {
  id: string;
  lon: number;
  lat: number;
  numero: string;
  nom_voie: string;
}

export type PolygonWithMeta = {
  coordinates: [number, number][],
  area: {
    value: number;
    unit: 'm²' | 'ha';
  },
  sectorUid: string,
  color: string;
};

export type PolygonToSave = {
  uid: string;
  coordinates: string;
  color: string;
  area: {
    value: number;
    unit: 'm²' | 'ha';
  };
};
