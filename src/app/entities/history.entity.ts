import {RestEntity} from './rest.entity';

export class HistoryEntity extends RestEntity {
  public userUID!: string;

  public content!: string;

  constructor(data: Partial<HistoryEntity>) {
    super(data);

    Object.assign(this, data);
  }
}
