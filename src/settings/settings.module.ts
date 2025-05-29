import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountSettings } from 'src/settings/entities/setting.entity';
import { SettingsLibrary } from 'src/utils/settingsLibrary';
import { GlobalService } from 'src/utils/global.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountSettings])],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsLibrary, GlobalService],
  exports: [SettingsService],
})
export class SettingsModule {}
