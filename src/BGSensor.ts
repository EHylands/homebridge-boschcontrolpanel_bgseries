import { Service, PlatformAccessory } from 'homebridge';
import { BGController } from './Controller/BGController';
import { BGPointStatus} from './Controller/BGPoint';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export abstract class BGSensor {
  protected service: Service;
  protected readonly AreaIndex;
  protected readonly PointIndex;
  readonly SensorType: BGSensorType;

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    protected readonly accessory: PlatformAccessory,
    protected readonly Panel: BGController,
    readonly PointNumber: number,
    SensorType: BGSensorType,
  ) {

    this.SensorType = SensorType;
    this.service = this.GetService();
    this.platform.log.info(SensorType + ' : Point'+ this.PointNumber + ' - ' + accessory.displayName);
  }

  abstract GetService(): Service;
  abstract HandleEventDetected(PointStatus: BGPointStatus);
}