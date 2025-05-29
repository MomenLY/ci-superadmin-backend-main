import {
  Global,
  MiddlewareConsumer,
  Module,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TenantUsersModule } from './modules/tenant-users/tenant-users.module';
import { JwtModule } from '@nestjs/jwt';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

export const TENANT_CONNECTION = 'TENANT_CONNECTION';

const MAX_DB_CONNECTION_DURATION: number =
  parseInt(process.env.MAX_DB_CONNECTION_DURATION) || 60;
class ConnectedDataSource {
  private _interval;
  public status = false;
  constructor(public source: DataSource) {
    if (MAX_DB_CONNECTION_DURATION == -1) return;
    this.startTimer();
  }

  startTimer() {
    this.status = true;
    const durationInMillis = MAX_DB_CONNECTION_DURATION * 1000;
    const lastUpdatedAt = Date.now();
    this._interval = setInterval(() => {
      const currentTime = Date.now();
      const diff = currentTime - lastUpdatedAt;
      if (diff > durationInMillis) {
        clearInterval(this._interval);
        this.source.destroy();
        this.status = false;
      }
    }, 1000);
  }
  restart() {
    clearInterval(this._interval);
    this.startTimer();
  }
}

const ConnectedDataSources: {
  [key: string]: ConnectedDataSource;
} = {};

const skipPaths = ['/auth/login'];

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    TenantUsersModule,
    JwtModule.registerAsync({
      imports: [],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get('JWT_SECRET'),
        signOptions: {
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: TENANT_CONNECTION,
      inject: [REQUEST, DataSource],
      scope: Scope.REQUEST,
      useFactory: async (request, mainDataSource) => {
        return mainDataSource;
      },
    },
    TenantService],
  exports: [TENANT_CONNECTION, TenantUsersModule, TenantService],
  controllers: [TenantController],
})
export class TenantsModule {
  constructor(
    private readonly mainDataSource: DataSource,
    private configService: ConfigService,
  ) { }

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(async (request, response, next) => {
        next();
      })
      .exclude(...skipPaths)
      .forRoutes('*');
  }
}
