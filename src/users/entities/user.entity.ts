import { getIdColumnDecorator } from 'src/utils/helper';
import {
  Entity,
  BaseEntity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

const databaseType = process.env.DB_TYPE || 'postgres';
@Entity({ database: databaseType })
export class User extends BaseEntity {
  @getIdColumnDecorator()
  _id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  countryCode: string;

  @Column({ unique: true, nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'json', nullable: true })
  acl: string;

  @Column({ type: 'simple-array', nullable: true })
  roleIds: string[];

  @Column({ type: 'jsonb', nullable: true })
  profileFields: string;
  @Column({ default: 1 })
  enforcePasswordReset: number;

  @CreateDateColumn({ nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}
