import RestEntityInterface from '../types/rest';
import {Timestamp} from 'firebase/firestore';

export abstract class RestEntity {
  public uid!: string;

  public created!: Date;

  public updated!: Date;

  protected constructor(data?: Partial<RestEntityInterface>) {
    if (data) {
      if (data.created instanceof Timestamp) {
        data.created = data.created.toDate();
      }

      if (data.updated instanceof Timestamp) {
        data.updated = data.updated.toDate();
      }

      Object.assign(this, data);
    }
  }
}
