import { Injectable } from '@angular/core';
import {RestService} from './rest.service';
import {SectorEntity} from '../entities/sector.entity';

@Injectable({
  providedIn: 'root'
})
export class SectorsService extends RestService<SectorEntity> {
  constructor() {
    super('sectors');
  }
}
