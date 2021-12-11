import { Service, PlatformAccessory } from 'homebridge';
import { BGController, BGPointStatus } from './BGController';
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

    if(this.AreaIndex === -1){
      this.platform.log.error('BG Sensor: Invalid Area Index');
    }

    if(this.PointIndex === -1){
      this.platform.log.error('BG Sensor: Invalid Point Index');
    }

    this.platform.log.info(SensorType + '(' + this.AreaIndex + ',' + this.PointIndex +'): Point'
    + this.PointNumber + ' - ' + accessory.displayName);

  }

  abstract GetService(): Service;
  abstract HandleEventDetected(PointStatus: BGPointStatus);
}