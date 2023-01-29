import { SrvRecord } from 'dns';
import { PlatformAccessory, Service, WithUUID } from 'homebridge';
import { BGPanelType } from './BGConst';
import { HB_BoschControlPanel_BGSeries } from './platform';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

export abstract class HKAccessory {
    public readonly Accessory: PlatformAccessory;

    constructor(
        protected readonly platform: HB_BoschControlPanel_BGSeries,
        protected readonly UUIDString: string,
        protected readonly Name:string,
        protected readonly Serial:string,
    ) {
      const uuid = platform.api.hap.uuid.generate(UUIDString);
      let accessory = platform.accessories.find(accessory => accessory.UUID === uuid);
      if(accessory){
        this.platform.api.updatePlatformAccessories([accessory]);
      } else{
        accessory = new this.platform.api.platformAccessory(Name, uuid);
        this.platform.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
      platform.CreatedAccessories.push(accessory);
      this.Accessory = accessory;

      this.Accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Bosch Control Panel')
        .setCharacteristic(this.platform.Characteristic.Model, BGPanelType[this.platform.Panel.PanelType])
        .setCharacteristic(this.platform.Characteristic.SerialNumber, Serial)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.platform.Panel.FirmwareVersion.toSring());
    }

    protected useService(type: WithUUID<typeof Service>): Service {
      const service = this.Accessory.getService(type);
      return service || this.Accessory.addService(type);
    }
}