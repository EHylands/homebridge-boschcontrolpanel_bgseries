import { Service} from 'homebridge';
import { HKSensor } from './HKSensor';
import { BGPointStatus} from './BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class HKLeakSensor extends HKSensor {
  private service: Service;

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
  ) {

    super(platform, PointNumber, BGSensorType.LeakSensor);
    this.service = this.Accessory.getService(this.platform.Service.LeakSensor)
    || this.Accessory.addService(this.platform.Service.LeakSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){
    const LeakDetected = PointStatus !== BGPointStatus.Normal;
    this.service.updateCharacteristic(this.platform.Characteristic.LeakDetected, LeakDetected);
  }
}
