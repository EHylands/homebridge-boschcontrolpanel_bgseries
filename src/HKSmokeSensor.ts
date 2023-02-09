import { Service } from 'homebridge';
import { HKSensor } from './HKSensor';
import { BGPointStatus} from './BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class HKSmokeSensor extends HKSensor {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
  ) {

    super(platform, PointNumber, BGSensorType.SmokeSensor);
  }

  GetService():Service{
    return this.useService(this.platform.Service.SmokeSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){
    const SmokeDetected = PointStatus !== BGPointStatus.Normal;

    if(SmokeDetected){
      this.GetService().updateCharacteristic(this.platform.Characteristic.SmokeDetected,
        this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED);
    } else{
      this.GetService().updateCharacteristic(this.platform.Characteristic.SmokeDetected,
        this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
    }
  }
}
