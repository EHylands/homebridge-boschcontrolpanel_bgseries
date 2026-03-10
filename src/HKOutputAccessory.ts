import { HB_BoschControlPanel_BGSeries } from './platform.js';
import { HKAccessory } from './HKAccessory.js';
import { Service } from 'homebridge';

export class HKOutputAccessory extends HKAccessory {
  private service: Service;

  constructor(
    protected readonly platform:HB_BoschControlPanel_BGSeries,
    public OutputNumber:number,
  ) {

    // Set default accessory name
    let DefaultText = 'Output' + OutputNumber;
    if(platform.Panel.Outputs[OutputNumber].OutputText !== ''){
      DefaultText = platform.Panel.Outputs[OutputNumber].OutputText;
    }

    super(
      platform,
      'BGOutput' + platform.Panel.PanelType + OutputNumber, // UUID, do not change
      DefaultText, // Accessory name
      'BGOutput' + OutputNumber, // Accessory serial number
    );

    this.service = this.Accessory.getService(this.platform.Service.Switch)
    || this.Accessory.addService(this.platform.Service.Switch);

    this.platform.log.info('Switch: Output' + OutputNumber + ' - ' + this.Accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.HandleOnSet.bind(this));
  }

  HandleOnSet(value:any) {
    this.platform.Panel.SetOutputState(this.OutputNumber, value);
  }

  HandleOutputChange(State: boolean) {
    this.service.updateCharacteristic(this.platform.Characteristic.On, State);
  }
}