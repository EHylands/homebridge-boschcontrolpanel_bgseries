import { Service} from 'homebridge';
import { HKSensor } from './HKSensor';
import { BGPointStatus} from './BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class HKCOSensor extends HKSensor {

  constructor(
    protected readonly platform:HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
  ) {

    super(platform, PointNumber, BGSensorType.COSensor);
  }

  GetService():Service{
    return this.useService(this.platform.Service.CarbonMonoxideSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){

    const CODetected = PointStatus !== BGPointStatus.Normal;
    this.GetService().updateCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected, CODetected );
  }
}
