import {Component, inject, OnDestroy, OnInit, signal, ViewChild, WritableSignal} from '@angular/core';
import {
  element
} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';
import {ApexChart, ApexNonAxisChartSeries, ApexPlotOptions, ChartComponent, NgApexchartsModule} from 'ng-apexcharts';
import {SectorsService} from '../../services/sectors.service';
import {BehaviorSubject, Subscription} from 'rxjs';
import {SectorEntity} from '../../entities/sector.entity';
import {AddressStatus} from '../../types/sectors';
import {AsyncPipe, NgIf, NgStyle} from '@angular/common';
import {sector} from '@turf/turf';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill
};

export interface CountAddress {
  todo: number,
  doneWithDistribution: number,
  refused: number,
  retake: number,
  absence: number,
  noMore: number
}

@Component({
  selector: 'app-dashboard',
  imports: [
    TitleComponent,
    NgApexchartsModule,
    NgIf,
    AsyncPipe,
    NgStyle
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [element]
})
export class DashboardComponent implements OnInit, OnDestroy {
  public sectors$: BehaviorSubject<SectorEntity[]> = new BehaviorSubject([]);

  public $count: WritableSignal<CountAddress> = signal({
    todo: 0,
    doneWithDistribution: 0,
    refused: 0,
    retake: 0,
    absence: 0,
    noMore: 0
  });

  private sectorsService = inject(SectorsService);

  private subscriptions: Subscription[] = [];

  @ViewChild("chart") chart: ChartComponent;
  public chartOptions: Partial<ChartOptions>;

  ngOnInit() {
    this.initSectors();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  public initSectors() {
    const sectors$ = this.sectorsService._list().subscribe((sectors) => {
      this.sectors$.next(sectors);

      const count = {
        todo: 0,
        doneWithDistribution: 0,
        refused: 0,
        retake: 0,
        absence: 0,
        noMore: 0,
      };

      for (const sector of sectors) {
        const addresses = sector.address ?? [];

        for (const addr of addresses) {
          switch (addr.status) {
            case AddressStatus.toDo:
              count.todo++;
              break;
            case AddressStatus.doneWithDistribution:
              count.doneWithDistribution++;
              break;
            case AddressStatus.refused:
              count.refused++;
              break;
            case AddressStatus.retake:
              count.retake++;
              break;
            case AddressStatus.absence:
              count.absence++;
              break;
            case AddressStatus.noMore:
              count.noMore++;
              break;
          }
        }
      }

      this.$count.set(count);

      this.initCharts(sectors);
    });

    this.subscriptions.push(sectors$);
  }

  public initCharts(sectors: SectorEntity[]) {
    const totalAddresses = sectors.reduce(
      (acc, sector) => acc + (sector.address?.length ?? 0), 0
    );

    const counts = sectors.map(sector => {
      const addresses = sector.address ?? [];
      const distributed = addresses.filter(
        addr => addr.status === AddressStatus.doneWithDistribution
      ).length;

      return {
        name: sector.name,
        color: sector.color,
        distributed
      };
    });

    const series = counts.map(c =>
      totalAddresses > 0 ? +(c.distributed / totalAddresses * 100).toFixed(2) : 0
    );

    this.chartOptions = {
      series: series,
      chart: {
        height: 350,
        type: 'radialBar'
      },
      plotOptions: {
        radialBar: {
          hollow: {
            dropShadow: {
              enabled: false
            }
          },
          dataLabels: {
            name: {
              show: true
            },
            value: {
              fontSize: '20px',
              fontWeight: '600',
              color: '#314158'
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '18px',
              fontFamily: 'Raleway',
              formatter: (w) => {
                if (w && w.globals && Array.isArray(w.globals.series)) {
                  const total = w.globals.series.reduce((acc: number, val: number) => acc + val, 0);
                  return total.toFixed(1)+'%';
                }
                return '0%';
              }
            }
          }
        }
      },
      fill: {
        colors: counts.map(c => sectors.find(s => s.name === c.name)?.color ?? '#ccc'),
        opacity: [1, 1, 1, 1],
        type: 'solid'
      },
      labels: counts.length > 0 ? counts.map(c => c.name) : ['Aucun secteur']
    };
  }

  protected readonly sector = sector;
}
