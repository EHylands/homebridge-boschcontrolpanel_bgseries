import { Service, PlatformAccessory } from 'homebridge';
import { HKSensor } from './HKSensor';
import { BGController} from './BGController';
import { BGPointStatus} from './BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class HKCOSensor extends HKSensor {

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
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.CarbonMonoxideSensor)
    || this.accessory.addService(this.platform.Service.CarbonMonoxideSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){

    const CODetected = PointStatus !== BGPointStatus.Normal;
    this.service.updateCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected, CODetected );
  }
}
