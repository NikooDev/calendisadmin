import {UserRole, UserStatus} from '../types/user';
import {RestEntity} from './rest.entity';

export class UserEntity extends RestEntity {
  public avatarID!: string;

  public badgeChat!: number;

  public email!: string;

  public firstname!: string;

  public lastname!: string;

  public role!: UserRole[];

  public status!: UserStatus;

  constructor(data: Partial<UserEntity>) {
    super(data);

    Object.assign(this, data);
  }
}
