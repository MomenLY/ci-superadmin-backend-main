import { Module } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { ExcelController } from './excel.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantsModule } from 'src/tenant/tenant.module';

@Module({
  imports: [
    TenantsModule,
    JwtModule.registerAsync({
      imports: [],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: 36000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ExcelController],
  providers: [ExcelService],
})
export class ExcelModule {}
