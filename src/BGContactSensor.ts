import { Service, PlatformAccessory } from 'homebridge';
import { BGSensor } from './BGSensor';
import { BGPoint } from './BGController';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class BGContactSensor extends BGSensor {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    protected readonly accessory: PlatformAccessory,
    readonly Point: BGPoint,
  ) {

    super(platform, accessory, Point, BGSensorType.MotionSensor);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'BG Contact Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '123456');

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.HandleEventDetected.bind(this));
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.ContactSensor)
    || this.accessory.addService(this.platform.Service.ContactSensor);
  }

  HandleEventDetected(EventDetected:boolean):boolean{
    if(EventDetected !== undefined){
      if(EventDetected){
        this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
          .updateValue(this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        return EventDetected;
      } else{
        this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
          .updateValue(this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
        return EventDetected;
      }
    }
    return false;
  }

}
