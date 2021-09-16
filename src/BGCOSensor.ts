import { Service, PlatformAccessory } from 'homebridge';
import { BGSensor } from './BGSensor';
import { BGPoint } from './BGController';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class BGCOSensor extends BGSensor {

  constructor(
    protected readonly platform:HB_BoschControlPanel_BGSeries,
    protected readonly accessory: PlatformAccessory,
    readonly Point: BGPoint,
  ) {

    super(platform, accessory, Point, BGSensorType.COSensor);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'BG CO2 Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '123456');

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected)
      .onGet(this.HandleEventDetected.bind(this));
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.CarbonMonoxideSensor)
    || this.accessory.addService(this.platform.Service.CarbonMonoxideSensor);
  }

  HandleEventDetected(EventDetected:boolean):boolean{
    if(EventDetected !== undefined){
      this.service.updateCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected, EventDetected);
      return EventDetected;
    }
    return false;
  }
}
