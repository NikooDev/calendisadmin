import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';
import {AsyncPipe, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TableComponent} from '../../ui/table/table.component';
import {BehaviorSubject, Subscription} from 'rxjs';
import {DonationEntity} from '../../entities/donation.entity';
import {TableColumn} from '../../types/ui';
import {UserRole, UserStatus} from '../../types/user';
import {DonationService} from '../../services/donation.service';

@Component({
  selector: 'app-donations',
  imports: [
    TitleComponent,
    AsyncPipe,
    FormsModule,
    NgIf,
    TableComponent
  ],
  templateUrl: './donations.component.html',
  styleUrl: './donations.component.scss',
  animations: [element]
})
export class DonationsComponent implements OnInit, OnDestroy {
  public displayedColumns: TableColumn<DonationEntity>[] = [];

  public donations$: BehaviorSubject<DonationEntity[]> = new BehaviorSubject([]);

  private donationsService = inject(DonationService);

  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.initDonations();
    this.initColumns();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  public initDonations() {
    const donations$ = this.donationsService._list().subscribe(donations => {
      this.donations$.next(donations);
    });

    this.subscriptions.push(donations$);
  }

  public initColumns() {
    this.displayedColumns = [
      {
        label: 'Nom',
        key: 'username',
        type: 'string'
      },
      {
        label: '50 €',
        key: 'cinquante',
        type: 'number'
      },
      {
        label: '20 €',
        key: 'vingt',
        type: 'number'
      },
      {
        label: '10 €',
        key: 'dix',
        type: 'number'
      },
      {
        label: '5 €',
        key: 'cinq',
        type: 'number'
      },
      {
        label: '2 €',
        key: 'deux',
        type: 'number'
      },
      {
        label: '1 €',
        key: 'un',
        type: 'number'
      },
      {
        label: '0,50 €',
        key: 'cinquantecent',
        type: 'number'
      },
      {
        label: 'Total monnaie',
        key: 'totalMoney',
        type: 'number'
      },
      {
        label: 'Nombre de chèques',
        key: 'nbCheque',
        type: 'number'
      },
      {
        label: 'Total chèque',
        key: 'totalCheque',
        type: 'number'
      },
      {
        label: 'Total',
        key: 'total',
        type: 'number'
      }
    ];
  }

  public filterUsers(event: Event) {

  }

  public openDonsDetails(donation: Partial<DonationEntity>) {

  }
}
