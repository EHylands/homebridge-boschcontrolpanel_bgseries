import { Service, PlatformAccessory } from 'homebridge';
import { BGSensor } from './BGSensor';
import { BGPoint } from './BGController';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class BGSmokeSensor extends BGSensor {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    protected readonly accessory: PlatformAccessory,
    readonly Point: BGPoint,
  ) {

    super(platform, accessory, Point, BGSensorType.SmokeSensor);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'BG Smoke Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '123456');

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.SmokeDetected)
      .onGet(this.HandleEventDetected.bind(this));
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.SmokeSensor)
    || this.accessory.addService(this.platform.Service.SmokeSensor);
  }

  HandleEventDetected(EventDetected:boolean):boolean{
    if(EventDetected !== undefined){

      if(EventDetected){
        this.service.updateCharacteristic(this.platform.Characteristic.SmokeDetected,
          this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED);
      } else{
        this.service.updateCharacteristic(this.platform.Characteristic.SmokeDetected,
          this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
      }

      return EventDetected;
    }
    return false;
  }
}
