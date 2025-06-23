import {RestEntity} from './rest.entity';
import {AdressRecord, PolygonToSave} from '../types/sectors';

export class SectorEntity extends RestEntity {
  public name!: string;

  public color!: string;

  public teams!: string[];

  public address!: AdressRecord[];

  public area!: {
    value: number;
    unit: 'ha' | 'm²'
  };

  public polygons!: PolygonToSave[];

  public city!: 'Tiffauges' | 'Saint-aubin-des-ormeaux'

  constructor(data: Partial<SectorEntity>) {
    super(data);

    Object.assign(this, data);
  }
}
