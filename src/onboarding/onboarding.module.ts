import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TenantsModule } from 'src/tenant/tenant.module';
import { TenantService } from 'src/tenant/tenant.service';
import { DataSource } from 'typeorm';
import { RoleModule } from 'src/role/role.module';
import { UsersHelperModule } from 'src/usersHelper/usersHelper.module';
import { EmailLibrary } from 'src/utils/emailLibrary';
import { SettingsModule } from 'src/settings/settings.module';

@Module({
  imports: [
    TenantsModule,
    UsersHelperModule,
    RoleModule,
    SettingsModule,
    TenantsModule,
    JwtModule.registerAsync({
      imports: [],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        tenantSecret: configService.get('TENANT_CREATE_JWT_SECRET'),
        superAdminSecret: configService.get('JWT_SECRET'),
        signOptions: {
        },
      }),
      inject: [ConfigService],
    }),
    HttpModule
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, EmailLibrary]
})
export class OnboardingModule { }