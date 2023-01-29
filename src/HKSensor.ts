import { Service } from 'homebridge';
import { BGPointStatus} from './BGPoint';
import { HKAccessory } from './HKAccessory';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export abstract class HKSensor extends HKAccessory {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
    SensorType: BGSensorType,
  ) {

    super(
      platform,
      'BGPoint' + platform.Panel.PanelType + SensorType + PointNumber,
      platform.Panel.GetPoints()[PointNumber].PointText,
      BGSensorType[SensorType] + PointNumber,
    );

    this.platform.log.info(SensorType + ' : Point'+ this.PointNumber + ' - ' + this.Accessory.displayName);
  }

  abstract GetService(): Service;
  abstract HandleEventDetected(PointStatus: BGPointStatus);
}