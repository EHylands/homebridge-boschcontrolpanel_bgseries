import { API } from 'homebridge';
import { PLATFORM_NAME } from './settings';
import { HB_BoschControlPanel_BGSeries } from './platform';

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HB_BoschControlPanel_BGSeries);
};
