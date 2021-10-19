import { Service, PlatformAccessory } from 'homebridge';
import { BGSensor } from './BGSensor';
import { BGController, BGPointStatus } from './BGController';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class BGLeakSensor extends BGSensor {

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
      .setCharacteristic(this.platform.Characteristic.Model, 'BG Leak Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'BGPoint' + PointNumber);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.LeakDetected)
      .onGet(this.HandleOnGet.bind(this));
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.LeakSensor)
    || this.accessory.addService(this.platform.Service.LeakSensor);
  }

  HandleOnGet() {
    const Point = this.Panel.GetPointFromIndex(this.AreaIndex, this.PointIndex);
    if(Point.PointStatus !== BGPointStatus.Normal){
      return this.platform.Characteristic.LeakDetected.LEAK_DETECTED;
    } else{
      return this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
    }
  }

  HandleEventDetected(EventDetected:boolean){
    this.service.updateCharacteristic(this.platform.Characteristic.LeakDetected, EventDetected);
  }
}
