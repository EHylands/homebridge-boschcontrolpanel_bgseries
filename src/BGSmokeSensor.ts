import { Service, PlatformAccessory } from 'homebridge';
import { BGSensor } from './BGSensor';
import { BGController, BGPointStatus } from './BGController';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class BGSmokeSensor extends BGSensor {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    protected readonly accessory: PlatformAccessory,
    protected readonly Panel: BGController,
    readonly PointNumber: number,
  ) {

    super(platform, accessory, Panel, PointNumber, BGSensorType.SmokeSensor);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'BG Smoke Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'BGPoint' + PointNumber);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.SmokeDetected)
      .onGet(this.HandleOnGet.bind(this));
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.SmokeSensor)
    || this.accessory.addService(this.platform.Service.SmokeSensor);
  }

  HandleOnGet() {
    const Point = this.Panel.GetPointFromIndex(this.AreaIndex, this.PointIndex);
    if(Point.PointStatus !== BGPointStatus.Normal){
      return this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED;
    } else{
      return this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
    }
  }

  HandleEventDetected(EventDetected:boolean){
    if(EventDetected){
      this.service.updateCharacteristic(this.platform.Characteristic.SmokeDetected,
        this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED);
    } else{
      this.service.updateCharacteristic(this.platform.Characteristic.SmokeDetected,
        this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
    }
  }
}
