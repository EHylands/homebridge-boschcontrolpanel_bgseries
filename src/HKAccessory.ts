import { PlatformAccessory, Service, WithUUID } from 'homebridge';
import { HB_BoschControlPanel_BGSeries } from './platform';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

export abstract class HKAccessory {
    public readonly Accessory: PlatformAccessory;

    constructor(
        protected readonly platform: HB_BoschControlPanel_BGSeries,
        protected readonly Name:string,
        protected readonly Model:string,
        protected readonly Serial:string,
    ) {

      const uuid = this.platform.api.hap.uuid.generate(this.CreateUUID());
      let accessory = this.platform.accessories.find(accessory => accessory.UUID === uuid);
      if(accessory){
        this.platform.api.updatePlatformAccessories([accessory]);
      } else{
        accessory = new this.platform.api.platformAccessory(this.Name, uuid);
        this.platform.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
      platform.CreatedAccessories.push(accessory);
      this.Accessory = accessory;

      this.Accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
        .setCharacteristic(this.platform.Characteristic.Model, Model)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, Serial)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.platform.Panel.FirmwareVersion.toSring());
    }

    protected abstract CreateUUID(): string;

    protected AddService(Type: WithUUID<typeof Service>, Name:string, Subtype?:string){

      let service: Service | undefined;
      if (Subtype) {
        service = this.Accessory.getServiceById(Type, Subtype);
      } else {
        service = this.Accessory.getService(Type);
      }

      return service || this.Accessory.addService(Type, Name, Subtype);
    }
}