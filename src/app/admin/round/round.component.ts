import {Component, OnInit, signal, WritableSignal} from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';
import {SpinnerComponent} from '../../ui/spinner/spinner.component';
import {MapComponent} from '@maplibre/ngx-maplibre-gl';
import {Map} from 'maplibre-gl';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-round',
  imports: [
    TitleComponent,
    SpinnerComponent,
    MapComponent,
    NgIf
  ],
  templateUrl: './round.component.html',
  styleUrl: './round.component.scss',
  animations: [element]
})
export class RoundComponent implements OnInit {
  public center: [number, number] = [-1.0856476, 47.0034039];

  public zoom: [number] = [12];

  public stylePlan: string = 'https://api.maptiler.com/maps/streets-v2/style.json?key=BDnu8t7usofNcbcmeIBe';

  public styleSatellite: string = 'https://api.maptiler.com/maps/01978ae2-27ca-70fe-b13a-2b7dfecd985e/style.json?key=BDnu8t7usofNcbcmeIBe';

  public $pending: WritableSignal<boolean> = signal(true);

  public $isSatellite: WritableSignal<boolean> = signal(false);

  ngOnInit() {
    setTimeout(() => this.$pending.set(false), 1000);
  }

  public onMapLoad(mapInstance: Map) {

  }
}
