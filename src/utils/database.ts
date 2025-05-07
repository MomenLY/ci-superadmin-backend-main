import { TypeOrmModule } from "@nestjs/typeorm"
import { DataSource, getMetadataArgsStorage } from "typeorm";
import { DATABASE_NAME, DB_TYPE, MONGODB_CONNECTION_STRING, NODE_ENV, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER } from "src/configs/index"

const entities = getMetadataArgsStorage()
  // eslint-disable-next-line @typescript-eslint/ban-types
  .tables.map((tbl) => tbl.target as Function)
  .filter((entity) =>
    entity.toString().toLowerCase().includes('entity'),
  );

export const determineDatabase = () => {
  if (DB_TYPE === 'postgres') {
    return ({
      type: 'postgres',
      host: POSTGRES_HOST,
      port: POSTGRES_PORT,
      username: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      database: DATABASE_NAME,
      entities: [
        __dirname+"/../**/*.entity{.ts,.js}"
      ],
      migrations: [],
      autoLoadEntities: true,
      synchronize: (NODE_ENV !== 'production'),
    })
  } else {
    return ({
      type: 'mongodb',
      url: MONGODB_CONNECTION_STRING,
      database: DATABASE_NAME,
      entities: [
        __dirname+"/../**/*.entity{.ts,.js}"
      ],
      migrations: [],
      logging: true,
      autoLoadEntities: true,
      synchronize: true,
    })
  }
}

export const dataSource = new DataSource(determineDatabase() as any);