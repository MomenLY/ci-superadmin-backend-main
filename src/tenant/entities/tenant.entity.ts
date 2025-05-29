import { BaseEntity, Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';
import { determineDB, getIdColumnDecorator } from 'src/utils/helper';
import { string } from 'yargs';

interface EmailBody {
  SAuthCode: string;
  SAccountId: string;
  SProviderId: string
}

interface FeatureLimits {
  permission: boolean;
}

interface FeatureRestriction {
  label: string;
  featureKey: string;
  featureLimits: FeatureLimits;
}

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
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

  @Column({ nullable: true, unique: true })
  identifier: string;

  @Column({ type: 'json', nullable: true })
  emailSubscription: EmailBody;

  @Column({ type: 'simple-json', nullable: true })
  featuresRestrictions: FeatureRestriction[];

  @Column({ nullable: true, type: 'enum', enum: Status, default: Status.ACTIVE })
  status: Status

  @Column({ nullable: true})
  tenantName: string;

  @Column({nullable: true})
  email: string;

  @Column({nullable: true})
  phone: string

  @CreateDateColumn({ nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}