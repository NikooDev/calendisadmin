import {RestEntity} from './rest.entity';

export class DonationEntity extends RestEntity {
  public sectorUID!: string;

  public userUID!: string;

  public username!: string;

  public cinquante!: number;

  public vingt!: number;

  public dix!: number;

  public cinq!: number;

  public deux!: number;

  public un!: number;

  public cinquantecent!: number;

  public totalMoney!: number;

  public nbCheque!: number;

  public totalCheque!: number;

  public total!: number;

  constructor(data: Partial<DonationEntity>) {
    super(data);

    Object.assign(this, data);
  }
}
