import { Service, PlatformAccessory } from 'homebridge';
import { BGPoint } from './BGController';
import { BGSensorType, HB_BoschControlPanel_BGSeries } from './platform';

export abstract class BGSensor {
  protected service: Service;
  readonly SensorType: BGSensorType;

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    protected readonly accessory: PlatformAccessory,
    readonly Point: BGPoint,
    SensorType: BGSensorType,
  ) {

    this.Point = Point;
    this.SensorType = SensorType;
    this.service = this.GetService();
  }

  abstract GetService(): Service;
  abstract HandleEventDetected(EventDetected:boolean): boolean;
}