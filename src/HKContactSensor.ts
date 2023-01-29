import { Service} from 'homebridge';
import { HKSensor } from './HKSensor';
import { BGPointStatus} from './BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export class HKContactSensor extends HKSensor {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
  ) {

    super(platform, PointNumber, BGSensorType.ContactSensor);
  }

  GetService():Service{
    return this.useService(this.platform.Service.ContactSensor);
  }

  HandleEventDetected(PointStatus: BGPointStatus){

    const ContactDetected = PointStatus === BGPointStatus.Normal;

    if(ContactDetected){
      this.GetService().getCharacteristic(this.platform.Characteristic.ContactSensorState)
        .updateValue(this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
    } else{
      this.GetService().getCharacteristic(this.platform.Characteristic.ContactSensorState)
        .updateValue(this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
    }
  }
}
