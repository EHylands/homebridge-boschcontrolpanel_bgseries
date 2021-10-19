import { Service, PlatformAccessory } from 'homebridge';
import { BGController } from './BGController';
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

    const Index = this.Panel.GetPointIndex(PointNumber);
    this.AreaIndex = Index[0];
    this.PointIndex = Index[1];
  }

  abstract GetService(): Service;
  abstract HandleOnGet();
  abstract HandleEventDetected(EventDetected:boolean);
}