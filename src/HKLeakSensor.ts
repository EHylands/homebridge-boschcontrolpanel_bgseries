import { Service} from 'homebridge';
import { HKSensor } from './HKSensor';
import { BGPointStatus} from './BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class HKLeakSensor extends HKSensor {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
  ) {

    super(platform, PointNumber, BGSensorType.LeakSensor);
  }

  GetService():Service{
    return this.useService(this.platform.Service.LeakSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){
    const LeakDetected = PointStatus !== BGPointStatus.Normal;
    this.GetService().updateCharacteristic(this.platform.Characteristic.LeakDetected, LeakDetected);
  }
}
