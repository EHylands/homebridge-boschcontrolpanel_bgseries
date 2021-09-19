import { Service, PlatformAccessory } from 'homebridge';
import { BGSensor } from './BGSensor';
import { BGPoint } from './BGController';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class BGLeakSensor extends BGSensor {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    protected readonly accessory: PlatformAccessory,
    readonly Point: BGPoint,
  ) {

    super(platform, accessory, Point, BGSensorType.MotionSensor);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'BG Leak Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '123456');

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.LeakDetected)
      .onGet(this.HandleEventDetected.bind(this));
  }

  handleLeakDetectedGet(LeakDetected: boolean) {
    if(LeakDetected){
      return this.platform.Characteristic.LeakDetected.LEAK_DETECTED;
    } else{
      return this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    }
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.LeakSensor)
    || this.accessory.addService(this.platform.Service.LeakSensor);
  }

  HandleEventDetected(EventDetected:boolean):boolean{
    if(EventDetected !== undefined){
      this.service.updateCharacteristic(this.platform.Characteristic.LeakDetected, EventDetected);
      return EventDetected;
    }
    return false;
  }

}
