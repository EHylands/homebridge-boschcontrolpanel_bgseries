import { Service, PlatformAccessory } from 'homebridge';
import { BGSensor } from './BGSensor';
import { BGController, BGPointStatus } from './BGController';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class BGCOSensor extends BGSensor {

  constructor(
    protected readonly platform:HB_BoschControlPanel_BGSeries,
    protected readonly accessory: PlatformAccessory,
    protected readonly Panel: BGController,
    readonly PointNumber: number,
  ) {

    super(platform, accessory, Panel, PointNumber, BGSensorType.COSensor);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'BG CO2 Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'BGPoint' + PointNumber);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected)
      .onGet(this.HandleOnGet.bind(this));
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.CarbonMonoxideSensor)
    || this.accessory.addService(this.platform.Service.CarbonMonoxideSensor);
  }

  HandleOnGet() {
    const Point = this.Panel.GetPointFromIndex(this.AreaIndex, this.PointIndex);
    if(Point.PointStatus !== BGPointStatus.Normal){
      return true;
    } else{
      return false;
    }
  }

  HandleEventDetected(EventDetected:boolean){
    this.service.updateCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected, EventDetected);
  }
}
