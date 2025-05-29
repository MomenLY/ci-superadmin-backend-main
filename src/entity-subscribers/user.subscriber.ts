import { Type } from '@nestjs/common';
import { TenantUser } from 'src/tenant/modules/tenant-users/entities/tenant-user.entity';
import { User } from 'src/users/entities/user.entity';
import {
  CreateDatabaseConnection,
  IDENTIFY_TENANT_FROM_PRIMARY_DB,
} from 'src/utils/db-utls';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  getMetadataArgsStorage,
} from 'typeorm';
import { MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  constructor() { }
  afterRemove(event: RemoveEvent<any>) { }
}
