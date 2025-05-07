import { getCache } from 'memcachelibrarybeta';
import { SettingsService } from 'src/settings/settings.service';
import { GlobalService } from './global.service';

export class SettingsLibrary {
  constructor(private readonly settingsService: SettingsService) {}

  async getSettings(key: string): Promise<any> {
    const settingKey = 'setting_' + key;
    console.log(settingKey, 'settingKeeyyyyyyy');

    const cb = () => {
      return this.settingsService.findOneByKey(
        GlobalService.accountId,
        settingKey,
      );
    };
    return getCache(settingKey, cb);
  }
}
