import { Injectable } from '@angular/core';
import {RestService} from './rest.service';
import {HistoryEntity} from '../entities/history.entity';

@Injectable({
  providedIn: 'root'
})
export class HistoryService extends RestService<HistoryEntity> {
  constructor() {
    super('history')
  }
}
