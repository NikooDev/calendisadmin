import {AdressRecord, PolygonWithMeta} from '../app/types/sectors';
import { polygon, featureCollection } from '@turf/helpers';
import booleanIntersects from '@turf/boolean-intersects';
import {area, booleanPointInPolygon, point, union} from '@turf/turf';
import RBush from 'rbush';

interface SectorBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  sector: PolygonWithMeta;
}

export const delay = (ms: number) => {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, ms);
  });
}

String.prototype.cap = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

export const createPolygonWithMeta = (
  coordinates: [number, number][],
  color: string,
  sectorUid: string
): PolygonWithMeta => {
  const closedCoords = [...coordinates];
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    closedCoords.push(first);
  }
  const polyFeature = polygon([closedCoords]);
  const rawArea = area(polyFeature);

  const formattedArea = rawArea > 10000
    ? { value: rawArea / 10000, unit: 'ha' } as AreaWithUnit
    : { value: rawArea, unit: 'm²' } as AreaWithUnit;

  return {
    coordinates: closedCoords,
    area: formattedArea,
    color,
    sectorUid,
  };
};

export const doesIntersectOtherSector = (
  polygons: PolygonWithMeta[],
  polygonToCheck: PolygonWithMeta,
  excludeIndex?: number
): boolean => {
  const newPolyFeature = polygon([polygonToCheck.coordinates]);
  return polygons.some((poly, i) => {
    if (excludeIndex !== undefined && i === excludeIndex) return false;
    if (poly.sectorUid !== polygonToCheck.sectorUid) {
      const existingPolyFeature = polygon([poly.coordinates]);
      return booleanIntersects(existingPolyFeature, newPolyFeature);
    }
    return false;
  });
};

export const findOverlappingPolygons = (
  polygons: PolygonWithMeta[],
  newPolygon: PolygonWithMeta
): { polygonsToMerge: ReturnType<typeof polygon>[]; polygonsToKeep: PolygonWithMeta[] } => {
  const polygonsToMerge: ReturnType<typeof polygon>[] = [];
  const polygonsToKeep: PolygonWithMeta[] = [];

  const newPolyFeature = polygon([newPolygon.coordinates]);

  polygons.forEach(poly => {
    const existingPolyFeature = polygon([poly.coordinates]);
    if (booleanIntersects(existingPolyFeature, newPolyFeature) && poly.sectorUid === newPolygon.sectorUid) {
      polygonsToMerge.push(existingPolyFeature);
    } else {
      polygonsToKeep.push(poly);
    }
  });

  return { polygonsToMerge, polygonsToKeep };
};

export const mergePolygons = (
  polygonsToMerge: ReturnType<typeof polygon>[],
  polygonsToKeep: PolygonWithMeta[],
  color: string = '#000000',
  sectorUid: string = ''
): PolygonWithMeta[] => {
  const fcToMerge = featureCollection(polygonsToMerge);
  const mergedPolygon = union(fcToMerge);

  if (!mergedPolygon) return polygonsToKeep;

  mergedPolygon.properties = { area: area(mergedPolygon) };

  const mergedPolygons: PolygonWithMeta[] = [...polygonsToKeep];

  if (mergedPolygon.geometry.type === 'Polygon') {
    mergedPolygons.push({
      coordinates: mergedPolygon.geometry.coordinates[0] as [number, number][],
      area: mergedPolygon.properties['area'],
      color,
      sectorUid,
    });
  } else if (mergedPolygon.geometry.type === 'MultiPolygon') {
    for (const polygonCoords of mergedPolygon.geometry.coordinates) {
      mergedPolygons.push({
        coordinates: polygonCoords[0] as [number, number][],
        area: mergedPolygon.properties['area'],
        color,
        sectorUid,
      });
    }
  }

  return mergedPolygons;
};

export const mergeOverlappingPolygons = (
  polygons: PolygonWithMeta[],
  newPolygon: PolygonWithMeta,
  color: string,
  sectorUid: string
): PolygonWithMeta[] => {
  const newPolyFeature = polygon([newPolygon.coordinates]);

  const polygonsToMerge: ReturnType<typeof polygon>[] = [];
  const polygonsToKeep: PolygonWithMeta[] = [];

  for (const poly of polygons) {
    const existingPolyFeature = polygon([poly.coordinates]);
    if (booleanIntersects(existingPolyFeature, newPolyFeature) && poly.sectorUid === newPolygon.sectorUid) {
      polygonsToMerge.push(existingPolyFeature);
    } else {
      polygonsToKeep.push(poly);
    }
  }

  if (polygonsToMerge.length > 0) {
    polygonsToMerge.push(newPolyFeature);

    const fcToMerge = featureCollection(polygonsToMerge);
    const mergedPolygon = union(fcToMerge);

    if (!mergedPolygon) {
      return [...polygons, newPolygon];
    }

    mergedPolygon.properties = { area: area(mergedPolygon) };

    const mergedPolygons: PolygonWithMeta[] = [...polygonsToKeep];

    if (mergedPolygon.geometry.type === 'Polygon') {
      mergedPolygons.push({
        coordinates: mergedPolygon.geometry.coordinates[0] as [number, number][],
        area: mergedPolygon.properties['area'],
        color,
        sectorUid,
      });
    } else if (mergedPolygon.geometry.type === 'MultiPolygon') {
      for (const polygonCoords of mergedPolygon.geometry.coordinates) {
        mergedPolygons.push({
          coordinates: polygonCoords[0] as [number, number][],
          area: mergedPolygon.properties['area'],
          color,
          sectorUid,
        });
      }
    }

    return mergedPolygons;
  }

  return [...polygons, newPolygon];
};

export const getAddressesInSectors = (
  addresses: AdressRecord[],
  sectors: PolygonWithMeta[]
): Map<string, AdressRecord[]> => {
  const bySector = new Map<string, AdressRecord[]>();
  for (const sector of sectors) {
    bySector.set(sector.sectorUid, []);
  }

  // Construire rbush sur les secteurs avec leur bbox
  const sectorTree = new RBush<SectorBBox>();
  const sectorBoxes = sectors.map(sector => {
    const lons = sector.coordinates.map(c => c[0]);
    const lats = sector.coordinates.map(c => c[1]);
    const minX = Math.min(...lons);
    const maxX = Math.max(...lons);
    const minY = Math.min(...lats);
    const maxY = Math.max(...lats);

    return { minX, minY, maxX, maxY, sector };
  });

  sectorTree.load(sectorBoxes);

  // Pour chaque adresse, rechercher les secteurs candidats (bbox)
  for (const addr of addresses) {
    const ptCoord = [addr.lon, addr.lat];
    const pt = point(ptCoord);

    // Recherche secteurs dont bbox contiennent ce point
    const candidates = sectorTree.search({
      minX: addr.lon,
      minY: addr.lat,
      maxX: addr.lon,
      maxY: addr.lat,
    });

    for (const candidate of candidates) {
      const poly = polygon([candidate.sector.coordinates]);
      if (booleanPointInPolygon(pt, poly)) {
        bySector.get(candidate.sector.sectorUid)!.push(addr);
        break; // On affecte à un seul secteur
      }
    }
  }

  return bySector;
}

type AreaWithUnit = {
  value: number;
  unit: 'm²' | 'ha';
};

export const formatArea = (areaInSqMeters: number): AreaWithUnit => {
  if (areaInSqMeters >= 10000) {
    return {
      value: parseFloat((areaInSqMeters / 10000).toFixed(2)),
      unit: 'ha',
    };
  } else {
    return {
      value: Math.round(areaInSqMeters),
      unit: 'm²',
    };
  }
};

export const initialName = (firstname: string, lastname: string) => {
  const initial1 = firstname.trim().charAt(0).toUpperCase();
  const initial2 = lastname.trim().charAt(0).toUpperCase();
  return initial1 + initial2;
}
