import { Service } from 'homebridge';
import { HKSensor } from './HKSensor';
import { BGPointStatus} from './BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class HKMotionSensor extends HKSensor {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
  ) {

    super(platform, PointNumber, BGSensorType.MotionSensor);
  }

  GetService():Service{
    return this.useService(this.platform.Service.MotionSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){
    const MotionDetected = PointStatus !== BGPointStatus.Normal;
    this.GetService().updateCharacteristic(this.platform.Characteristic.MotionDetected, MotionDetected );
  }
}
