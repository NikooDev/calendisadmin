import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {TitleComponent} from "../title/title.component";
import {
  ClusterPointDirective,
  EventData,
  GeoJSONSourceComponent,
  LayerComponent,
  MapComponent,
  MarkersForClustersComponent,
  PointDirective,
  PopupComponent
} from "@maplibre/ngx-maplibre-gl";
import {GeoJSONSource, Map as MapLibreMap, MapMouseEvent} from "maplibre-gl";
import type * as GeoJSON from 'geojson';
import {Feature, FeatureCollection, LineString, Point, Polygon} from "geojson";
import {element, listUsersSearch, scaleIn, slideInDown, slideInSector} from "../../../utils/animations";
import {AsyncPipe, NgClass, NgIf, NgStyle} from "@angular/common";
import {TooltipComponent} from "../../ui/tooltip/tooltip.component";
import {
  BehaviorSubject,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  from,
  of,
  Subject,
  Subscription,
  switchMap,
  map
} from "rxjs";
import {AddressStatus, AdressRecord, PolygonToSave, PolygonWithMeta} from "../../types/sectors";
import {supabase} from "../../../config/supabase.config";
import {MapboxGeoJSONFeature} from "mapbox-gl";
import {SpinnerComponent} from "../../ui/spinner/spinner.component";
import {area, booleanPointInPolygon, point, polygon} from '@turf/turf';
import {DialogComponent} from '../../ui/dialog/dialog.component';
import {DialogService} from '../../services/dialog.service';
import {SectorsService} from '../../services/sectors.service';
import {SectorEntity} from '../../entities/sector.entity';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {SwitchComponent} from '../../ui/switch/switch.component';
import {
  createPolygonWithMeta,
  delay,
  doesIntersectOtherSector,
  findOverlappingPolygons,
  formatArea,
  getAddressesInSectors, initialName,
  mergePolygons
} from '../../../utils/functions'
import {debounce} from 'lodash';
import RBush from 'rbush'
import {ToastService} from '../../services/toast.service';
import {ToastTypeEnum} from '../../types/ui';
import {animate, state, style, transition, trigger} from '@angular/animations';
import {UserEntity} from '../../entities/user.entity';
import {UserService} from '../../services/user.service';

@Component({
  selector: 'app-sectors',
  imports: [
    TitleComponent,
    MapComponent,
    GeoJSONSourceComponent,
    LayerComponent,
    NgIf,
    TooltipComponent,
    NgClass,
    MarkersForClustersComponent,
    PopupComponent,
    AsyncPipe,
    PointDirective,
    ClusterPointDirective,
    SpinnerComponent,
    DialogComponent,
    ReactiveFormsModule,
    NgStyle,
    SwitchComponent,
    FormsModule
  ],
  templateUrl: './sectors.component.html',
  styleUrl: './sectors.component.scss',
  animations: [element, slideInDown, scaleIn, slideInSector, listUsersSearch, trigger('slideInOut', [
    state('open', style({ transform: 'translateX(0)' })),
    state('closed', style({ transform: 'translateX(-110%)' })),
    transition('closed => open', [
      animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
    ]),
    transition('open => closed', [
      animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
    ]),
  ])]
})
export class SectorsComponent implements OnInit, OnDestroy {
  public map!: MapLibreMap;

  public sectors$: BehaviorSubject<SectorEntity[]> = new BehaviorSubject([]);

  public usersSearch$: BehaviorSubject<UserEntity[]> = new BehaviorSubject([]);

  public teams$: BehaviorSubject<UserEntity[]> = new BehaviorSubject([]);

  public center: [number, number] = [-1.0856476, 47.0034039];

  public zoom: [number] = [12];

  public stylePlan: string = 'https://api.maptiler.com/maps/streets-v2/style.json?key=BDnu8t7usofNcbcmeIBe';

  public styleSatellite: string = 'https://api.maptiler.com/maps/01978ae2-27ca-70fe-b13a-2b7dfecd985e/style.json?key=BDnu8t7usofNcbcmeIBe';

  public $pending: WritableSignal<boolean> = signal(true);

  public $pendingSectorForm: WritableSignal<boolean> = signal(false);

  public $pendingSearchUser: WritableSignal<boolean> = signal(false);

  public $firstSearch: WritableSignal<boolean> = signal(false);

  public $isSatellite: WritableSignal<boolean> = signal(false);

  public $polygons: WritableSignal<PolygonWithMeta[]> = signal([]);

  public $polygonToForceMerge: WritableSignal<PolygonWithMeta | null> = signal(null);

  public $selectedPolygonIndex = signal<number | null>(null);

  public $currentPolygon: WritableSignal<[number, number][]> = signal([]);

  public $isEditing: WritableSignal<boolean> = signal(false);

  public $draggingPointIndex: WritableSignal<number | null> = signal(null);

  public $mouseCoord = signal<[number, number] | null>(null);

  public $isDrawing: WritableSignal<boolean> = signal(false);

  public $isFullScreen: WritableSignal<boolean> = signal(false);

  public $canClosePolygon: WritableSignal<boolean> = signal(false);

  public $popupShow: WritableSignal<boolean> = signal(false);

  public $popupCoordinates: WritableSignal<[number, number]> = signal([0, 0]);

  public $popupContent: WritableSignal<string> = signal('');

  public $forceOverlap: WritableSignal<boolean> = signal(false);

  public $sectorUpdate: WritableSignal<boolean> = signal(false);

  public $addressDetected: WritableSignal<AdressRecord[]> = signal([]);

  public $addressExcluded: WritableSignal<number> = signal(0);

  public $oldAddress: WritableSignal<AdressRecord[]> = signal([]);

  public $hoveredSectorUID = signal<string | null>(null);

  public $selectedSector: WritableSignal<SectorEntity> = signal<SectorEntity | null>(null);

  public $address = signal<AdressRecord[]>([]);

  public $isAddressMax: WritableSignal<boolean> = signal(false);

  public $selectColorName: WritableSignal<string> = signal<string>('');

  public $toggleSectorMenu: WritableSignal<boolean> = signal(true);

  public searchUsers$ = new Subject<string>();

  public isDesktop = window.innerWidth >= 1024;

  public sectorForm: FormGroup;

  private maxAddressLimit = 400;

  private userRoot = 'devOXn7hHmPkFRAdnhzEh6XDu0z2';

  private userDev  = 'KMBis43ld7PLqBQVzqWTzVGeaV03';

  public colors = [
    { name: 'Red',         hex: '#f43636' },
    { name: 'Pink',        hex: '#e91e91' },
    { name: 'Purple',      hex: '#9C27B0' },
    { name: 'Deep Purple', hex: '#673AB7' },
    { name: 'Indigo',      hex: '#3F51B5' },
    { name: 'Blue',        hex: '#2196F3' },
    { name: 'Light Blue',  hex: '#03A9F4' },
    { name: 'Cyan',        hex: '#00BCD4' },
    { name: 'Teal',        hex: '#009688' },
    { name: 'Green',       hex: '#4CAF50' },
    { name: 'Light Green', hex: '#8BC34A' },
    { name: 'Lime',        hex: '#CDDC39' },
    { name: 'Yellow',      hex: '#FFEB3B' },
    { name: 'Amber',       hex: '#FFC107' },
    { name: 'Orange',      hex: '#FF9800' },
    { name: 'Deep Orange', hex: '#FF5722' },
    { name: 'Brown',       hex: '#795548' }
  ];

  private readonly updateAddressesCountDebounced: (polygonCoords: [number, number][]) => void;

  private addressTree = new RBush<AdressRecord & {minX:number,minY:number,maxX:number,maxY:number}>();

  private formBuilder = inject(FormBuilder);

  private dialogService = inject(DialogService);

  private sectorsService = inject(SectorsService);

  private userService = inject(UserService);

  private toastService = inject(ToastService);

  private subscriptions: Subscription[] = [];

  @ViewChild('mapContainer', { static: false })
  public mapContainer!: ElementRef;

  @ViewChild('sectorName', { static: true })
  public sectorName!: ElementRef;

  @ViewChild('toggleBtn')
  public toggleBtnRef!: ElementRef<HTMLElement>;

  @ViewChild('menuSector')
  public menuSector!: ElementRef<HTMLElement>;

  @ViewChild('searchInput')
  public searchInput!: ElementRef<HTMLInputElement>;

  constructor() {
    effect(() => {
      const $isOpen = this.dialogService.isOpen('createSector');

      if ($isOpen()) {
       setTimeout(() => this.sectorName.nativeElement.focus(), 300);
      }
    });
    this.updateAddressesCountDebounced = debounce(this.updateAddressesCountForCurrentPolygon.bind(this), 300);
  }

  ngOnInit() {
    this.initSectorForm();
    this.initSearchUsers();
    this.initSectors().then();
    this.initAddresses().then();

    this.$toggleSectorMenu.set(this.isDesktop);
    setTimeout(() => this.$pending.set(false), 1000);
    document.addEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    document.removeEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.$isDrawing()) {
      this.$isDrawing.set(true);
      this.$currentPolygon.set([]);
      this.$mouseCoord.set(null);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.isDesktop = event.target.innerWidth >= 1024;
    this.$toggleSectorMenu.set(this.isDesktop);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.isDesktop && this.$toggleSectorMenu()) {
      const clickedInsideSidebar = this.menuSector.nativeElement.contains(event.target as Node);
      const clickedOnToggleBtn = this.toggleBtnRef.nativeElement.contains(event.target as Node);

      if (!clickedInsideSidebar && !clickedOnToggleBtn) {
        this.$toggleSectorMenu.set(false);
      }
    }
  }

  public initSectorForm() {
    this.sectorForm = this.formBuilder.group({
      uid: [''],
      name: ['', [Validators.required]],
      city: ['', [Validators.required]],
      color: ['', [Validators.required]]
    });
  }

  public async initSectors() {
    const sectors$ = this.sectorsService._list().subscribe(sectors => {
      this.sectors$.next(sectors);

      const loadedPolygons: PolygonWithMeta[] = [];

      for (const sector of sectors) {
        if (!Array.isArray(sector.polygons)) continue;

        for (const poly of sector.polygons) {
          try {
            loadedPolygons.push({
              coordinates: JSON.parse(poly.coordinates),
              color: poly.color,
              area: poly.area,
              sectorUid: sector.uid
            });
          } catch (err) {
            console.error(`Erreur de parsing des coordonnées pour ${sector.uid}`, poly.coordinates, err);
          }
        }
      }

      this.$polygons.set(loadedPolygons);
    });

    this.subscriptions.push(sectors$);
  }

  public initSearchUsers() {
    const searchUsers$ = this.searchUsers$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((value) => {
          if (value.length === 0) {
            this.$pendingSearchUser.set(false);
            return of([]);
          }

          this.$firstSearch.set(true);

          const firstnameQuery = this.userService.search([
            { where: 'firstname', operator: '>=', value: value },
            { where: 'firstname', operator: '<', value: value + '\uf8ff' }
          ]);

          const lastnameQuery = this.userService.search([
            { where: 'lastname', operator: '>=', value: value },
            { where: 'lastname', operator: '<', value: value + '\uf8ff' }
          ]);

          return forkJoin([from(firstnameQuery), from(lastnameQuery)]).pipe(
            map(([firstnames, lastnames]) => {
              const allUsers = [...firstnames, ...lastnames];
              const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.uid, user])).values());

              this.$pendingSearchUser.set(false);
              const teams = this.teams$.getValue();

              return uniqueUsers.filter(user =>
                user.uid !== this.userRoot &&
                user.uid !== this.userDev &&
                !teams.some(teamUser => teamUser.uid === user.uid)
              );
            })
          );
        })
      )
      .subscribe((users) => {
        this.usersSearch$.next(users);
      });

    this.subscriptions.push(searchUsers$);
  }

  public searchUsers(event: Event) {
    const target = event.target as HTMLInputElement;

    this.$pendingSearchUser.set(true);

    this.searchUsers$.next(target.value.trim().toLowerCase());
  }

  public selectUserSearched(user: UserEntity) {
    const currentTeams = this.teams$.getValue();
    this.teams$.next([...currentTeams, user]);

    const currentSearch = this.usersSearch$.getValue();
    const filteredSearch = currentSearch.filter(u => u.uid !== user.uid);
    this.usersSearch$.next(filteredSearch);
  }

  public cancelUsersSearch() {
    this.teams$.next([]);
    this.$firstSearch.set(false);
    this.usersSearch$.next([]);
    this.searchUsers$.next('');
    this.searchInput.nativeElement!.value = '';
  }

  public deleteTeam(user: UserEntity) {
    const currentTeams = this.teams$.getValue();
    const updatedTeams = currentTeams.filter(u => u.uid !== user.uid);
    this.teams$.next(updatedTeams);

    const currentSearch = this.usersSearch$.getValue();
    const updatedSearch = [...currentSearch, user];

    const deduplicatedSearch = Array.from(new Map(updatedSearch.map(u => [u.uid, u])).values());

    deduplicatedSearch.sort((a, b) => {
      const aFull = (a.firstname + a.lastname).toLowerCase();
      const bFull = (b.firstname + b.lastname).toLowerCase();
      return aFull.localeCompare(bFull);
    });

    this.usersSearch$.next(deduplicatedSearch);
  }

  public toggleMenuSector() {
    if (this.isDesktop) {
      return;
    }

    this.$toggleSectorMenu.set(!this.$toggleSectorMenu());
  }

  public selectColor(color: string) {
    if (this.$pendingSectorForm()) return;

    this.sectorForm.patchValue({ color: color });
    this.$selectColorName.set(color);
  }

  public async saveSector() {
    const sectorForm = this.sectorForm.getRawValue() as Partial<SectorEntity>;

    const selectedSector = this.$selectedSector();
    const teams = this.teams$.getValue();
    const teamUIDs = teams.map(user => user.uid);

    this.$pendingSectorForm.set(true);
    this.sectorForm.get('name').disable();
    this.sectorForm.get('city').disable();

    await delay(1000);

    if (this.$sectorUpdate()) {
      this.$selectedSector.set({
        ...selectedSector,
        name: sectorForm.name,
        city: sectorForm.city,
        color: sectorForm.color
      });

      const polygons = this.$polygons();
      const updatedPolygons = polygons.map(poly => {
        if (poly.sectorUid === sectorForm.uid) {
          return {
            ...poly,
            color: sectorForm.color,
          };
        }
        return poly;
      });

      this.$polygons.set(updatedPolygons);

      const polygonsToSave: PolygonToSave[] = updatedPolygons
        .filter(p => p.sectorUid === sectorForm.uid)
        .map(p => ({
          uid: p.sectorUid,
          coordinates: JSON.stringify(p.coordinates),
          color: p.color,
          area: p.area,
        }));

      await this.sectorsService.update({
        uid: sectorForm.uid,
        name: sectorForm.name,
        city: sectorForm.city,
        color: sectorForm.color,
        polygons: polygonsToSave,
        teams: teamUIDs
      });
    } else {
      await this.sectorsService.create({
        name: sectorForm.name,
        city: sectorForm.city,
        color: sectorForm.color,
        address: [],
        polygons: [],
        area: {
          value: 0,
          unit: 'm²',
        },
        teams: teamUIDs
      })
    }

    this.$sectorUpdate.set(false);
    this.sectorForm.reset();
    this.dialogService.close('createSector');
    this.$selectedSector.set(selectedSector);
    this.$pendingSectorForm.set(false);

    this.cancelUsersSearch();
  }

  public async openDeleteSector() {
    await this.dialogService.open('confirmDeleteSector');
  }

  public cancelDeleteSector() {
    this.dialogService.close('confirmDeleteSector');
  }

  public async deleteSector() {
    const sectorForm = this.sectorForm.getRawValue() as Partial<SectorEntity>;

    this.$pendingSectorForm.set(true);
    await delay(1000);

    await this.sectorsService.delete(sectorForm.uid);
    await this.sectorsService.list();

    this.dialogService.close('createSector');
    this.dialogService.close('confirmDeleteSector');
    this.$pendingSectorForm.set(false);

    this.cancelUsersSearch();
  }

  public cancelCreateSector() {
    this.cancelUsersSearch();
    this.dialogService.close('createSector');
  }

  public async updateSector() {
    const sectorSelected = this.$selectedSector();
    const polygons = this.$polygons();

    if (!sectorSelected) return;

    console.log(sectorSelected)

    const sectorUid = sectorSelected.uid;

    const polygonsForSelectedSector = polygons.filter(p => p.sectorUid === sectorUid);

    const sectorsToSave = polygonsForSelectedSector.map(poly => ({
      uid: poly.sectorUid,
      coordinates: JSON.stringify(poly.coordinates),
      color: poly.color,
      area: poly.area
    }));

    const allAddressesSets = polygonsForSelectedSector.map(poly => {
      const lons = poly.coordinates.map(c => c[0]);
      const lats = poly.coordinates.map(c => c[1]);
      const minX = Math.min(...lons);
      const maxX = Math.max(...lons);
      const minY = Math.min(...lats);
      const maxY = Math.max(...lats);

      const candidates = this.addressTree.search({ minX, minY, maxX, maxY });
      const polyFeature = polygon([poly.coordinates]);

      return candidates.filter(addr => {
        const pt = point([addr.lon, addr.lat]);
        return booleanPointInPolygon(pt, polyFeature);
      });
    });

    const mergedAddressesMap = new Map<string, AdressRecord>();
    for (const addrList of allAddressesSets) {
      for (const addr of addrList) {
        mergedAddressesMap.set(addr.id, addr);
      }
    }
    const mergedAddresses = Array.from(mergedAddressesMap.values());
    const totalAreaM2 = polygonsForSelectedSector.reduce((sum, poly) => {
      if (typeof poly.area === 'number') {
        return sum + poly.area;
      } else if (poly.area.unit === 'ha') {
        return sum + poly.area.value * 10000;
      } else {
        return sum + poly.area.value;
      }
    }, 0);

    const formattedTotalArea = formatArea(totalAreaM2);

    const cleanedAddresses = mergedAddresses.map((address) => {
      const { maxX, maxY, minX, minY, ...rest } = address as AdressRecord & Partial<Record<'maxX' | 'maxY' | 'minX' | 'minY', number>>;
      return rest;
    });

    const updatedSector: SectorEntity = {
      ...sectorSelected,
      area: formattedTotalArea,
      address: cleanedAddresses,
      polygons: sectorsToSave,
    };

    await this.sectorsService.update(updatedSector);

    const updatedSectors = await this.sectorsService.list();
    this.sectors$.next(updatedSectors);

    const newSelectedSector = updatedSectors.find(s => s.uid === sectorUid);
    if (newSelectedSector) {
      this.$selectedSector.set(newSelectedSector);
    }

    this.$addressDetected.set([]);
  }

  private async updateAddressesCountForCurrentPolygon(polygonCoords: [number, number][]) {
    if (polygonCoords.length < 3) return;

    try {
      const addressesInCurrentPolygon = this.getAddressesInPolygon(polygonCoords, false);

      if (addressesInCurrentPolygon.length > this.maxAddressLimit) {
        this.$isAddressMax.set(true);
        this.toastService.open(
          ToastTypeEnum.ERROR,
          `Cette zone contient ${addressesInCurrentPolygon.length} adresses. Limite fixée à ${this.maxAddressLimit} par zone.`,
          undefined,
          { duration: 5000 }
        );
      } else {
        this.$isAddressMax.set(false);
      }

      const filteredNewAddresses = this.getAddressesInPolygon(polygonCoords, true);
      this.$addressDetected.set(filteredNewAddresses);

      const sectorUid = this.$selectedSector()?.uid;
      if (!sectorUid) return;

      const allPolygons = this.$polygons();
      const selectedIndex = this.$selectedPolygonIndex();
      const selectedPolygon = allPolygons[selectedIndex];
      if (!selectedPolygon) return;

      const polygonsOfSector = allPolygons.filter(p => p.sectorUid === sectorUid);
      const otherPolygons = polygonsOfSector.filter(p => p !== selectedPolygon);
      const addressesInOtherPolygons = otherPolygons.flatMap(p => this.getAddressesInPolygon(p.coordinates, false));
      const combinedMap = new Map<string, AdressRecord>();

      addressesInCurrentPolygon.forEach(addr => combinedMap.set(addr.id, addr));
      addressesInOtherPolygons.forEach(addr => combinedMap.set(addr.id, addr));

      const combinedAddresses = Array.from(combinedMap.values());
      const oldAddress = this.$oldAddress();
      const currentIds = new Set(combinedAddresses.map(a => a.id));
      const excluded = oldAddress.filter(a => !currentIds.has(a.id));

      this.$addressExcluded.set(excluded.length);
    } catch (error) {
      console.error('Erreur lors du calcul des adresses dans le polygone', error);
    }
  }

  public async openCreateSector(event: MouseEvent, sector?: SectorEntity) {
    event.stopPropagation();

    this.sectorForm.reset();

    if (sector) {
      if (sector.teams.length > 0) {
        const usersTeams = await this.userService.search([{
          where: 'uid',
          operator: 'in',
          value: sector.teams
        }]);

        this.teams$.next(usersTeams);
      }

      this.$selectColorName.set(sector.color);
      this.sectorForm.patchValue({
        uid: sector.uid,
        name: sector.name,
        city: sector.city,
        color: sector.color
      });
      this.$sectorUpdate.set(true);
    } else {
      this.$selectColorName.set('');
      this.$sectorUpdate.set(false);
    }

    await this.dialogService.open('createSector');
  }

  public async openDeletePolygon() {
    await this.dialogService.open('confirmDeletePolygon');
  }

  public closeConfirmDeletePolygon() {
    this.dialogService.close('confirmDeletePolygon');
  }

  public confirmAlertUnionSector() {
    if (!this.$forceOverlap()) {
      this.dialogService.cancel('alertUnionSector');
      this.$canClosePolygon.set(true);
      this.$isDrawing.set(false);
      return;
    }
    this.dialogService.confirm('alertUnionSector');
  }

  public forceOverlap(value: boolean) {
    this.$forceOverlap.set(value);
  }

  public selectSector(sector: SectorEntity) {
    this.$selectedSector.set(sector);

    if (this.$toggleSectorMenu() && !this.isDesktop) {
      this.$toggleSectorMenu.set(false);
    }
  }

  public $selectedSectorUID = computed(() => this.$selectedSector()?.uid ?? null);

  public $currentSectorColor = computed(() => this.$selectedSector()?.color ?? '#ffffff');

  public onMapLoad(mapInstance: MapLibreMap) {
    this.map = mapInstance;

    this.map.on('mousedown', () => {
      const canvas = this.map.getCanvas();
      canvas.style.cursor = 'grabbing';
    });

    this.map.on('dragstart', () => {
      const canvas = this.map.getCanvas();
      canvas.style.cursor = 'grabbing';
    });

    this.map.on('dragend', () => {
      const canvas = this.map.getCanvas();
      canvas.style.cursor = 'grab';
    });

    this.map.getCanvas().style.cursor = 'grab';
  }

  public async initAddresses() {
    const { data: dataT, error: errorT } = await supabase.from('tiffauges').select(`id,lon,lat,numero,nom_voie`);
    const { data: dataS, error: errorS } = await supabase.from('saintaubindesormeaux').select(`id,lon,lat,numero,nom_voie`);

    if (errorT && errorS) {
      console.error('Erreur Supabase :', errorT);
      return;
    }

    const allAddresses: (AdressRecord & { minX: number; minY: number; maxX: number; maxY: number })[] = [
      ...dataT,
      ...dataS
    ].map(addr => ({
      ...addr,
      minX: addr.lon,
      maxX: addr.lon,
      minY: addr.lat,
      maxY: addr.lat,
      status: AddressStatus.toDo
    }));

    this.addressTree.clear();
    this.addressTree.load(allAddresses);

    this.$address.set(allAddresses);
  }

  public $markersGeoJSON = computed<FeatureCollection<Point, AdressRecord>>(() => {
    const addresses = this.$address();
    return {
      type: 'FeatureCollection',
      features: addresses.map(addr => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [addr.lon, addr.lat] },
        properties: {
          id: addr.id,
          nom_voie: addr.nom_voie,
          numero: addr.numero,
          lon: addr.lon,
          lat: addr.lat,
        },
      })),
    };
  });

  public async selectCluster(_: MouseEvent, feature: MapboxGeoJSONFeature) {
    const source = this.map.getSource('markers') as GeoJSONSource;

    if (!source || !feature?.properties?.['cluster_id']) return;

    const clusterId = feature.properties['cluster_id'];
    const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

    const zoom = await source.getClusterExpansionZoom(clusterId);

    this.map.easeTo({
      center: coordinates,
      zoom: zoom + 1.5,
      duration: 800
    });
  }

  public initialPosition() {
    const defaultCenter: [number, number] = [-1.0856476, 47.0034039];
    const defaultZoom = 12;

    if (this.map) {
      this.map.flyTo({
        center: defaultCenter,
        zoom: defaultZoom,
        essential: true
      });
    }
  }

  public startPolygonDrawing() {
    this.$isDrawing.set(true);
  }

  public toggleMapMove() {
    this.$isDrawing.set(false);
  }

  public toggleMapStyle() {
    this.$isSatellite.update(value => !value);
  }

  public async toggleFullscreen() {
    const elem = document.fullscreenElement;

    if (elem) {
      await document.exitFullscreen();
      this.$isFullScreen.set(false);
    } else {
      await this.mapContainer.nativeElement.requestFullscreen();
      this.$isFullScreen.set(true);
    }
  }

  public onFullscreenChange() {
    const isFullScreen = !!document.fullscreenElement;
    this.$isFullScreen.set(isFullScreen);
  }

  public onMarkerEnter(feature: MapboxGeoJSONFeature & { properties: { numero: number, nom_voie: string } }) {
    const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
    const content = `${feature.properties.numero} ${feature.properties.nom_voie}`;

    this.$popupCoordinates.set(coords);
    this.$popupContent.set(content);
    this.$popupShow.set(true);
  }

  public onMarkerLeave() {
    this.$popupShow.set(false);
  }

  public onScrollZoom() {
    if (this.$popupShow()) {
      this.$popupShow.set(false);
    }
  }

  public async onMapClick(event: MapMouseEvent & EventData) {
    const coord: [number, number] = [event.lngLat.lng, event.lngLat.lat];

    if (this.$isDrawing()) {
      const current = [...this.$currentPolygon()];

      if (current.length >= 3 && this.isNear(coord, current[0])) {
        this.$isDrawing.set(false);
        this.$canClosePolygon.set(true);

        const tempPoly: PolygonWithMeta = {
          coordinates: [...current, current[0]],
          sectorUid: this.$selectedSector()?.uid ?? '',
          color: this.$selectedSector()?.color ?? '#000000',
          area: {
            value: 0,
            unit: 'm²'
          }
        };

        this.updateAddressesCountDebounced(tempPoly.coordinates);

        return;
      }

      this.$currentPolygon.set([...current, coord]);
      this.$canClosePolygon.set(false);

    } else {
      const pt = point(coord);
      const polygons = this.$polygons();

      for (let i = 0; i < polygons.length; i++) {
        const poly = polygons[i];
        const polyFeature = polygon([poly.coordinates]);

        const sector = this.sectors$.getValue().find(s => s.uid === poly.sectorUid);

        if (booleanPointInPolygon(pt, polyFeature)) {
          if (!this.$isEditing() || this.$selectedPolygonIndex() !== i) {
            this.$currentPolygon.set([...poly.coordinates]);
            this.$selectedPolygonIndex.set(i);
            this.$canClosePolygon.set(true);
            this.$isEditing.set(true);
            this.$selectedSector.update(value => ({
              ...value,
              name: sector.name,
              uid: poly.sectorUid,
              color: poly.color
            }));
          }

          const polygonsOfSector = polygons.filter(p => p.sectorUid === poly.sectorUid);
          const allAddresses = polygonsOfSector.flatMap(p => this.getAddressesInPolygon(p.coordinates, false));
          const uniqueAddressesMap = new Map();
          allAddresses.forEach(addr => uniqueAddressesMap.set(addr.id, addr));
          const uniqueAddresses = Array.from(uniqueAddressesMap.values());

          this.$oldAddress.set(uniqueAddresses);

          this.updateAddressesCountDebounced(poly.coordinates);

          return;
        }
      }

      if (!this.$isEditing()) {
        this.$isDrawing.set(false);
      } else {
        this.cancelCurrentPolygon();
      }
    }
  }

  public onMouseMove(event: MapMouseEvent & EventData) {
    const coord: [number, number] = [event.lngLat.lng, event.lngLat.lat];
    const canvas = event.target.getCanvas();
    const isDrawing = this.$isDrawing();
    const draggedIndex = this.$draggingPointIndex();

    if (draggedIndex !== null) {
      const updated = [...this.$currentPolygon()];
      updated[draggedIndex] = coord;
      this.$currentPolygon.set(updated);
      canvas.style.cursor = 'grabbing';

      this.updateAddressesCountDebounced(updated);

      return;
    }

    this.$mouseCoord.set(coord);

    if (isDrawing) {
      const poly = this.$currentPolygon();
      const nearVertex = poly.some(point => this.isNear(point, coord));

      if (nearVertex || this.isMouseNearFirstPoint()) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'crosshair';
      }

    } else {
      const editHandles = this.$editHandles().features;
      const onHandle = editHandles.some(feature => {
        const fCoord = feature.geometry.coordinates as [number, number];
        return this.isNear(fCoord, coord);
      });

      if (onHandle) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'grab';
      }
    }
  }

  public onMouseDown(event: MapMouseEvent & EventData) {
    if (this.$isDrawing()) return;

    const clickCoord: [number, number] = [event.lngLat.lng, event.lngLat.lat];
    const editHandles = this.$editHandles().features;

    for (const feature of editHandles) {
      const coord = feature.geometry.coordinates as [number, number];
      const type = feature.properties?.['type'];

      if (this.isNear(coord, clickCoord)) {
        if (type === 'vertex') {
          const index = feature.properties?.['index'];
          if (typeof index === 'number') {
            this.$draggingPointIndex.set(index);

            this.map.dragPan.disable();
            this.map.scrollZoom.disable();
            this.map.boxZoom.disable();
            this.map.dragRotate?.disable();

            return;
          }
        } else if (type === 'midpoint') {
          const insertAfter = feature.properties?.['insertAfter'];
          if (typeof insertAfter === 'number') {
            const current = [...this.$currentPolygon()];
            const coord = feature.geometry.coordinates as [number, number];
            current.splice(insertAfter + 1, 0, coord);
            this.$currentPolygon.set(current);

            this.$draggingPointIndex.set(insertAfter + 1);

            this.map.dragPan.disable();
            this.map.scrollZoom.disable();
            this.map.boxZoom.disable();
            this.map.dragRotate?.disable();

            return;
          }
        }
      }
    }
  }

  public onMouseUp(_: MapMouseEvent & EventData) {
    this.$draggingPointIndex.set(null);

    this.map.dragPan.enable();
    this.map.scrollZoom.enable();
    this.map.boxZoom.enable();
    this.map.dragRotate?.enable();

    this.updateAddressesCountDebounced(this.$currentPolygon());
  }

  public async saveCurrentPolygon() {
    const current = this.$currentPolygon();
    if (current.length < 3) return;

    const selectedSector = this.$selectedSector();
    if (!selectedSector) return;

    const newPolygonWithMeta = createPolygonWithMeta(current, selectedSector.color, selectedSector.uid);
    const polygons = [...this.$polygons()];
    const editingIndex = this.$selectedPolygonIndex();

    const addressInPolygon = this.getAddressesInPolygon(current, false);
    if (addressInPolygon.length > this.maxAddressLimit) {
      this.toastService.open(ToastTypeEnum.ERROR, `Cette zone contient ${addressInPolygon.length} adresses. Limite fixée à ${this.maxAddressLimit} par zone.`, undefined, { duration: 5000 });
      return;
    }

    if (polygons.length + 1 > 15) {
      this.toastService.open(ToastTypeEnum.ERROR, 'Vous ne pouvez pas ajouter plus de 15 zones sur la carte.');
      return;
    }

    if (editingIndex !== null && editingIndex >= 0 && editingIndex < polygons.length) {
      if (doesIntersectOtherSector(polygons, newPolygonWithMeta, editingIndex)) {
        this.$polygonToForceMerge.set(newPolygonWithMeta);

        const polygonsOfSector = polygons.filter(p => p.sectorUid === selectedSector.uid);
        const allAddresses = polygonsOfSector.flatMap(p => this.getAddressesInPolygon(p.coordinates, false));
        const uniqueAddressesMap = new Map<string, AdressRecord>();
        allAddresses.forEach(addr => uniqueAddressesMap.set(addr.id, addr));
        const uniqueAddresses = Array.from(uniqueAddressesMap.values());
        this.$oldAddress.set(uniqueAddresses);

        this.$currentPolygon.set(newPolygonWithMeta.coordinates);

        try {
          await this.dialogService.open('alertUnionSector');
        } catch {
          return;
        }
      }

      polygons[editingIndex] = newPolygonWithMeta;
      this.$polygons.set(polygons);
    } else {
      if (doesIntersectOtherSector(polygons, newPolygonWithMeta)) {
        this.$polygonToForceMerge.set(newPolygonWithMeta);

        const polygonsOfSector = polygons.filter(p => p.sectorUid === selectedSector.uid);
        const allAddresses = polygonsOfSector.flatMap(p => this.getAddressesInPolygon(p.coordinates, false));
        const uniqueAddressesMap = new Map<string, AdressRecord>();
        allAddresses.forEach(addr => uniqueAddressesMap.set(addr.id, addr));
        const uniqueAddresses = Array.from(uniqueAddressesMap.values());
        this.$oldAddress.set(uniqueAddresses);
        this.$currentPolygon.set(newPolygonWithMeta.coordinates);

        try {
          await this.dialogService.open('alertUnionSector');
        } catch {
          return;
        }
      }

      const { polygonsToMerge, polygonsToKeep } = findOverlappingPolygons(polygons, newPolygonWithMeta);

      if (polygonsToMerge.length > 0) {
        polygonsToMerge.push(polygon([newPolygonWithMeta.coordinates]));
        const merged = mergePolygons(polygonsToMerge, polygonsToKeep, selectedSector.color, selectedSector.uid);
        this.$polygons.set(merged);
      } else {
        this.$polygons.set([...polygons, newPolygonWithMeta]);
      }
    }

    await this.updateSector();
    this.toastService.open(ToastTypeEnum.SUCCESS, 'La zone a bien été enregistrée.');
    this.cancelCurrentPolygon();
  }

  public cancelCurrentPolygon() {
    this.$currentPolygon.set([]);
    this.$canClosePolygon.set(false);
    this.$selectedPolygonIndex.set(null);
    this.$oldAddress.set([]);
    this.$isDrawing.set(false);
    this.$isEditing.set(false);
  }

  public async deletePolygon() {
    const idx = this.$selectedPolygonIndex();
    if (idx === null) return;

    const polygons = [...this.$polygons()];

    const polygonToDelete = polygons[idx];
    if (!polygonToDelete) return;

    const sectorUid = polygonToDelete.sectorUid;

    const sectors = this.sectors$.value;
    const sectorToUpdate = sectors.find(s => s.uid === sectorUid);
    if (!sectorToUpdate) return;

    polygons.splice(idx, 1);

    const addressTree = new RBush<AdressRecord & { minX: number; minY: number; maxX: number; maxY: number }>();
    const addressesWithBBox = (sectorToUpdate.address ?? []).map(addr => ({
      ...addr,
      minX: addr.lon,
      maxX: addr.lon,
      minY: addr.lat,
      maxY: addr.lat
    }));

    addressTree.load(addressesWithBBox);

    const lons = polygonToDelete.coordinates.map(c => c[0]);
    const lats = polygonToDelete.coordinates.map(c => c[1]);
    const minX = Math.min(...lons);
    const maxX = Math.max(...lons);
    const minY = Math.min(...lats);
    const maxY = Math.max(...lats);

    const candidates = addressTree.search({ minX, minY, maxX, maxY });

    const deletedPolygonFeature = polygon([polygonToDelete.coordinates]);

    const updatedAddresses = (sectorToUpdate.address ?? []).filter(addr => {
      if (!candidates.some(c => c.id === addr.id)) {
        return true;
      }

      const pt = point([addr.lon, addr.lat]);
      return !booleanPointInPolygon(pt, deletedPolygonFeature);
    });

    const updatedPolygonsForSector = polygons
      .filter(p => p.sectorUid === sectorUid)
      .map(p => ({
        uid: p.sectorUid,
        coordinates: JSON.stringify(p.coordinates),
        color: p.color,
        area: p.area,
      }));

    const remainingPolygonsForSector = polygons.filter(p => p.sectorUid === sectorUid);

    const totalAreaM2 = remainingPolygonsForSector.reduce((sum, poly) => {
      const areaM2 = poly.area.unit === 'ha' ? poly.area.value * 10000 : poly.area.value;
      return sum + areaM2;
    }, 0);

    const formattedNewArea = formatArea(totalAreaM2);

    const updatedSector = {
      ...sectorToUpdate,
      address: updatedAddresses,
      polygons: updatedPolygonsForSector,
      area: formattedNewArea
    };

    await this.sectorsService.update(updatedSector);

    this.$polygons.set(polygons);
    this.$addressDetected.set([]);
    this.$oldAddress.set([]);
    this.$currentPolygon.set([]);
    this.$canClosePolygon.set(false);
    this.$selectedPolygonIndex.set(null);

    this.dialogService.close('confirmDeletePolygon');
  }

  public $finalPolygonsGeoJSON = computed<FeatureCollection<Polygon>>(() => {
    const polys = this.$polygons();
    const editingIndex = this.$selectedPolygonIndex();

    const features = polys
      .map((poly, i) => {
        if (editingIndex !== null && i === editingIndex) {
          return null;
        }

        const closed = [...poly.coordinates];
        if (
          closed.length > 0 &&
          (closed[0][0] !== closed[closed.length - 1][0] ||
            closed[0][1] !== closed[closed.length - 1][1])
        ) {
          closed.push(closed[0]);
        }

        const rawArea = area(polygon([closed]));
        const formattedArea = formatArea(rawArea);

        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [closed],
          },
          properties: {
            area: formattedArea,
            sectorUid: poly.sectorUid,
            color: poly.color,
          },
        } as Feature<Polygon>;
      })
      .filter((f): f is Feature<Polygon> => f !== null);

    return {
      type: 'FeatureCollection',
      features,
    };
  });

  public $currentPolygonGeoJSON = computed<FeatureCollection<Polygon>>(() => {
    const coords = this.$currentPolygon();

    if (coords.length === 0) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    const closedCoords = [...coords, coords[0]];

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [closedCoords],
          },
          properties: {},
        },
      ],
    };
  });

  private isMouseNearFirstPoint(): boolean {
    const mouse = this.$mouseCoord();
    const poly = this.$currentPolygon();

    if (!mouse || poly.length === 0) return false;

    return this.isNear(mouse, poly[0]);
  }

  private isNear(coord1: [number, number], coord2: [number, number], thresholdMeters = 50): boolean {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;

    const toRad = (deg: number) => deg * Math.PI / 180;

    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c;

    return distance < thresholdMeters;
  }

  private getAddressesInPolygon(polygonCoords: [number, number][], excludeAlreadyUsed = true): AdressRecord[] {
    if (polygonCoords.length < 3) return [];

    const closedCoords = [...polygonCoords];
    const first = polygonCoords[0];
    const last = polygonCoords[polygonCoords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      closedCoords.push(first);
    }

    const tempPoly: PolygonWithMeta = {
      coordinates: closedCoords,
      sectorUid: this.$selectedSector()?.uid ?? '',
      color: this.$selectedSector()?.color ?? '#000000',
      area: {
        value: 0,
        unit: 'm²'
      }
    };

    const lons = closedCoords.map(c => c[0]);
    const lats = closedCoords.map(c => c[1]);
    const minX = Math.min(...lons);
    const maxX = Math.max(...lons);
    const minY = Math.min(...lats);
    const maxY = Math.max(...lats);

    const candidates = this.addressTree.search({ minX, minY, maxX, maxY });

    const sectorUid = tempPoly.sectorUid;
    const addressMap = getAddressesInSectors(candidates, [tempPoly]);
    const addressesForPolygon = addressMap.get(sectorUid) ?? [];

    if (!excludeAlreadyUsed) {
      return addressesForPolygon;
    }

    const currentSectorUid = this.$selectedSector()?.uid;
    const sectors = this.sectors$.getValue();
    const alreadyUsedIds = new Set(
      sectors
        .filter(s => s.uid === currentSectorUid)
        .flatMap(s => s.address ?? [])
        .map(a => a.id)
    );

    return addressesForPolygon.filter(a => !alreadyUsedIds.has(a.id));
  }

  public $tempPolygon = computed<FeatureCollection<Polygon>>(() => {
    const poly = this.$currentPolygon();
    const mouse = this.$mouseCoord();
    const isDrawing = this.$isDrawing();

    if (!isDrawing || poly.length === 0 || !mouse) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    const ring: [number, number][] = [...poly, mouse];

    if (ring.length < 3) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    if (
      ring.length < 4 ||
      ring[0][0] !== ring[ring.length - 1][0] ||
      ring[0][1] !== ring[ring.length - 1][1]
    ) {
      ring.push(ring[0]);
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [ring],
          },
          properties: {},
        },
      ],
    };
  });

  public $tempLine = computed<FeatureCollection<LineString>>(() => {
    const poly = this.$currentPolygon();
    const mouse = this.$mouseCoord();

    if (!this.$isDrawing() || poly.length === 0 || !mouse) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    const lastPoint = poly[poly.length - 1];

    if (!lastPoint || !Array.isArray(lastPoint) || lastPoint.length !== 2 || !mouse) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [lastPoint, mouse],
          },
          properties: {},
        },
      ],
    };
  });

  public $editHandles = computed<FeatureCollection<Point>>(() => {
    const poly = this.$currentPolygon();
    const draggingIndex = this.$draggingPointIndex();

    if (poly.length < 2 || this.$isDrawing()) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features: Feature<Point>[] = [];

    let polygonPoints = poly;
    if (poly.length > 2) {
      const first = poly[0];
      const last = poly[poly.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) {
        polygonPoints = poly.slice(0, -1);
      }
    }

    for (let i = 0; i < polygonPoints.length; i++) {
      const current = poly[i];
      const next = poly[(i + 1) % poly.length];

      if (!current || !next) {
        continue;
      }

      const isDraggingPoint = draggingIndex === i;
      const size = isDraggingPoint ? 7 : 5;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: current },
        properties: { type: 'vertex', index: i, size }
      });

      const mid: [number, number] = [
        (current[0] + next[0]) / 2,
        (current[1] + next[1]) / 2,
      ];

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: mid },
        properties: { type: 'midpoint', insertAfter: i },
      });
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  });

  public $markerPoints = computed<FeatureCollection<Point>>(() => {
    const poly = this.$currentPolygon();
    const features: Feature<Point>[] = [];

    if (poly.length >= 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: poly[0],
        },
        properties: {},
      });
    }

    if (poly.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: poly[poly.length - 1],
        },
        properties: {},
      });
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  });
  protected readonly initialName = initialName;
}
