import { BGPointStatus} from './BGPoint';
import { HKAccessory } from './HKAccessory';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export abstract class HKSensor extends HKAccessory {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    readonly PointNumber: number,
    SensorType: BGSensorType,
  ) {

    // Set default accessory name
    let DefaultText = 'Point' + PointNumber;
    if(platform.Panel.Points[PointNumber].PointText !== ''){
      DefaultText = platform.Panel.Points[PointNumber].PointText;
    }

    super(
      platform,
      'BGPoint' + platform.Panel.PanelType + SensorType + PointNumber, // UUID, do not change
      DefaultText,
      BGSensorType[SensorType] + ' (Point' + PointNumber + ')',
    );

    this.platform.log.info(SensorType + ' : Point'+ this.PointNumber + ' - ' + this.Accessory.displayName);
  }

  abstract HandleEventDetected(PointStatus: BGPointStatus): void;
}