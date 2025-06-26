import { Injectable } from '@angular/core';
import {RestService} from './rest.service';
import {DonationEntity} from '../entities/donation.entity';

@Injectable({
  providedIn: 'root'
})
export class DonationService extends RestService<DonationEntity> {
  constructor() {
    super('donations');
  }
}
