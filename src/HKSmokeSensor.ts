import { Service } from 'homebridge';
import { HKSensor } from './HKSensor';
import { BGPointStatus} from './BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class HKSmokeSensor extends HKSensor {
  private service: Service;

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
  ) {

    super(platform, PointNumber, BGSensorType.SmokeSensor);

    this.service = this.Accessory.getService(this.platform.Service.SmokeSensor)
    || this.Accessory.addService(this.platform.Service.SmokeSensor);
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
