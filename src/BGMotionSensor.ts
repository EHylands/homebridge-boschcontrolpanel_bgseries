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
    this.service.getCharacteristic(this.platform.Characteristic.MotionDetected)
      .onGet(this.HandleOnGet.bind(this));
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.MotionSensor)
    || this.accessory.addService(this.platform.Service.MotionSensor);
  }

  HandleOnGet() {
    const Point = this.Panel.GetPointFromIndex(this.AreaIndex, this.PointIndex);
    return(Point.PointStatus !== BGPointStatus.Normal);
  }

  HandleEventDetected(EventDetected:boolean){
    this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, EventDetected);
  }
}
