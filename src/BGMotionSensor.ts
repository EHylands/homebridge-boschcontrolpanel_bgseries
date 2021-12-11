import { Service, PlatformAccessory } from 'homebridge';
import { BGSensor } from './BGSensor';
import { BGController, BGPointStatus } from './BGController';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class BGMotionSensor extends BGSensor {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    protected readonly accessory: PlatformAccessory,
    protected readonly Panel: BGController,
    readonly PointNumber: number,
  ) {

    super(platform, accessory, Panel, PointNumber, BGSensorType.MotionSensor);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'BG Motion Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'BGPoint' + PointNumber);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.MotionSensor)
    || this.accessory.addService(this.platform.Service.MotionSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){

    const MotionDetected = PointStatus !== BGPointStatus.Normal;
    //this.platform.log.debug('Homebridge: ' + this.SensorType + '(Point'+ this.PointNumber +':'+ this.accessory.displayName +
    //'): MotionDectected: ' + MotionDetected );
    this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, MotionDetected );
  }
}
