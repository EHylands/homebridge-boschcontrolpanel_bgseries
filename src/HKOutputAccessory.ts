import { HB_BoschControlPanel_BGSeries } from './platform';
import { HKAccessory } from './HKAccessory';

export class HKOutputAccessory extends HKAccessory {

  constructor(
    protected readonly platform:HB_BoschControlPanel_BGSeries,
    public OutputNumber:number,
  ) {

    super(
      platform,
      'BGOutput' + platform.Panel.PanelType + OutputNumber,
      platform.Panel.GetOutputs()[OutputNumber].OutputText,
      'BGOutput' + OutputNumber,
    );

    this.platform.log.info('Switch: Output' + OutputNumber + ' - ' + this.Accessory.displayName);

    this.useService(this.platform.Service.Switch).getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.HandleOnSet.bind(this));
  }

  HandleOnSet(value) {
    this.platform.Panel.SetOutputState(this.OutputNumber, value);
  }

  HandleOutputChange(State: boolean) {
    this.useService(this.platform.Service.Switch).updateCharacteristic(this.platform.Characteristic.On, State);
  }


}