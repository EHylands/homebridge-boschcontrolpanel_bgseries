import { Service, PlatformAccessory } from 'homebridge';
import { BGSensor } from './BGSensor';
import { BGController, BGPointStatus } from './BGController';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class BGContactSensor extends BGSensor {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    protected readonly accessory: PlatformAccessory,
    protected readonly Panel: BGController,
    readonly PointNumber: number,
  ) {

    super(platform, accessory, Panel, PointNumber, BGSensorType.ContactSensor);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'BG Contact Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'BGPoint' + PointNumber);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.ContactSensor)
    || this.accessory.addService(this.platform.Service.ContactSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){

    const ContactDetected = PointStatus === BGPointStatus.Normal;

    //this.platform.log.debug('Homebridge: ' + this.SensorType + '(Point'+ this.PointNumber +':'+ this.accessory.displayName +
    //'): ContactDectected: ' + ContactDetected );

    if(ContactDetected){
      this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
        .updateValue(this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
    } else{
      this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
        .updateValue(this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
    }
  }
}
