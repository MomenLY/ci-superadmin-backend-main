import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getMetadataArgsStorage } from 'typeorm';

const TENANT_INFO = JSON.parse(process.env.TENANT_INFO);

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [],
      useFactory: async (configService: ConfigService) => {
        const entities = getMetadataArgsStorage()
          // eslint-disable-next-line @typescript-eslint/ban-types
          .tables.map((tbl) => tbl.target as Function)
          .filter((entity) => {
            return (
              entity.toString().toLowerCase().includes('entity')
            );
          });
        return {
          type: 'postgres',
          host: TENANT_INFO.dbHost,
          port: TENANT_INFO.dbPort,
          username: TENANT_INFO.dbUserName,
          password: TENANT_INFO.dbPassword,
          database: TENANT_INFO.name,
          entities,
          logging: true,
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class PostgresModule { }
