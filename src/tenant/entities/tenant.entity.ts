import { BaseEntity, Column, Entity } from 'typeorm';
import { determineDB, getIdColumnDecorator } from 'src/utils/helper';

interface EmailBody {
  SAuthCode: string;
  SAccountId: string;
  SProviderId: string
}

const databaseType = determineDB();
@Entity({ database: databaseType })
export class Tenant extends BaseEntity {
  @getIdColumnDecorator()
  _id: string;

  @Column()
  host: string;

  @Column()
  name: string;

  @Column()
  dbHost: string;

  @Column()
  dbPort: string;

  @Column()
  dbUserName: string;

  @Column()
  dbPassword: string;

  @Column({ type: 'json', nullable: true })
  emailSubscription: EmailBody;
}
