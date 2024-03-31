import { Service} from 'homebridge';
import { HKSensor } from './HKSensor';
import { BGPointStatus} from './BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class HKCOSensor extends HKSensor {
  private service: Service;

  constructor(
    protected readonly platform:HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
  ) {

    super(platform, PointNumber, BGSensorType.COSensor);
    this.service = this.Accessory.getService(this.platform.Service.CarbonMonoxideSensor)
    || this.Accessory.addService(this.platform.Service.CarbonMonoxideSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){

    const CODetected = PointStatus !== BGPointStatus.Normal;
    this.service.updateCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected, CODetected );
  }
}
