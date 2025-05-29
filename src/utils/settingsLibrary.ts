import { getCache } from 'onioncache';
import { SettingsService } from 'src/settings/settings.service';
import { GlobalService } from './global.service';

export class SettingsLibrary {
  constructor(private readonly settingsService: SettingsService, private readonly globalService: GlobalService) { }

  async getSettings(key: string): Promise<any> {
    const settingKey = 'setting_' + key;

    const cb = () => {
      return this.settingsService.findOneByKey(
        this.globalService.accountId,
        settingKey,
      );
    };
    return getCache(settingKey, cb);
  }
}
