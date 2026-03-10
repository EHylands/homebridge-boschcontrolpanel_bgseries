import { API } from 'homebridge';
import { PLATFORM_NAME } from './settings.js';
import { HB_BoschControlPanel_BGSeries } from './platform.js';

export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HB_BoschControlPanel_BGSeries);
};