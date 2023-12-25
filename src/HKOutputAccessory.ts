import { HB_BoschControlPanel_BGSeries } from './platform';
import { HKAccessory } from './HKAccessory';
import { Service } from 'homebridge';

export class HKOutputAccessory extends HKAccessory {
  private service: Service;

  constructor(
    protected readonly platform:HB_BoschControlPanel_BGSeries,
    public OutputNumber:number,
  ) {

    super(
      platform,
      'BGOutput' + platform.Panel.PanelType + OutputNumber, // UUID, do not change
      platform.Panel.Outputs[OutputNumber].OutputText, // Accessory name
      'BGOutput' + OutputNumber, // Accessory serial number
    );

    this.service = this.Accessory.getService(this.platform.Service.Switch)
    || this.Accessory.addService(this.platform.Service.Switch);

    this.platform.log.info('Switch: Output' + OutputNumber + ' - ' + this.Accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.HandleOnSet.bind(this));
  }

  HandleOnSet(value) {
    this.platform.Panel.SetOutputState(this.OutputNumber, value);
  }

  HandleOutputChange(State: boolean) {
    this.service.updateCharacteristic(this.platform.Characteristic.On, State);
  }
}