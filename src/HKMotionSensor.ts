import { Service } from 'homebridge';
import { HKSensor } from './HKSensor.js';
import { BGPointStatus} from './BGPoint.js';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform.js';

export class HKMotionSensor extends HKSensor {
  private service: Service;

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
  ) {

    super(platform, PointNumber, BGSensorType.MotionSensor);

    this.service = this.Accessory.getService(this.platform.Service.MotionSensor)
    || this.Accessory.addService(this.platform.Service.MotionSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){
    const MotionDetected = PointStatus !== BGPointStatus.Normal;
    this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, MotionDetected );
  }
}
