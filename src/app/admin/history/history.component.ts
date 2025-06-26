import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';
import {AsyncPipe, DatePipe, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {HistoryEntity} from '../../entities/history.entity';
import {BehaviorSubject, Subscription} from 'rxjs';
import {HistoryService} from '../../services/history.service';

@Component({
  selector: 'app-history',
  imports: [
    TitleComponent,
    AsyncPipe,
    FormsModule,
    NgIf,
    DatePipe
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  animations: [element]
})
export class HistoryComponent implements OnInit, OnDestroy {
  public histories$: BehaviorSubject<HistoryEntity[]> = new BehaviorSubject([]);

  private historyService = inject(HistoryService);

  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.initHistories();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  public initHistories() {
    const histories$ = this.historyService._list().subscribe(histories => {
      const historiesFormat = histories.map(history => new HistoryEntity(history));

      this.histories$.next(historiesFormat);
    });

    this.subscriptions.push(histories$);
  }

  public filterUsers(event: Event) {

  }
}
