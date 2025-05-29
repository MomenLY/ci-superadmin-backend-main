import { Tenant } from 'src/tenant/entities/tenant.entity';
import { DataSource } from 'typeorm';

const superAdminDataSource = new DataSource({
  type: 'postgres',
  host: 'cibackend.enfinlabs.com',
  port: 5432,
  username: 'cisuperadmindev',
  password: '0mgcYI0ifkwzAP1@$',
  database: 'ci_superadmin_dev',
  entities: [Tenant],
  synchronize: false,
  logging: true,
});

export default superAdminDataSource;
