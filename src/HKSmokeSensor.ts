import { Service, PlatformAccessory } from 'homebridge';
import { HKSensor } from './HKSensor';
import { BGController } from './BGController';
import { BGPointStatus} from './BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class HKSmokeSensor extends HKSensor {

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
  }

  GetService():Service{
    return this.accessory.getService(this.platform.Service.SmokeSensor)
    || this.accessory.addService(this.platform.Service.SmokeSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){
    const SmokeDetected = PointStatus !== BGPointStatus.Normal;

    if(SmokeDetected){
      this.service.updateCharacteristic(this.platform.Characteristic.SmokeDetected,
        this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED);
    } else{
      this.service.updateCharacteristic(this.platform.Characteristic.SmokeDetected,
        this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
    }
  }
}
