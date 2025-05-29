import { Module, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getMetadataArgsStorage } from 'typeorm';

const TENANT_INFO = JSON.parse(process.env.TENANT_INFO);

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
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
          type: 'mongodb',
          url: configService.get('MONGODB_CONNECTION_STRING'),
          database: TENANT_INFO.name,
          entities,
          logging: true,
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class MongoModule { }
