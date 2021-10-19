import { Service, PlatformAccessory } from 'homebridge';
import { HB_BoschControlPanel_BGSeries } from './platform';
import { BGController } from './BGController';

export class BGOutputAccessory {
  private service: Service;
  private OutputIndex:number;

  constructor(
    private readonly platform:HB_BoschControlPanel_BGSeries,
    private readonly accessory: PlatformAccessory,
    private readonly Panel: BGController,
    readonly OutputNumber: number,
  ) {

    this.OutputIndex = Panel.GetOutputIndex(OutputNumber);


    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'BG Output')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'BGOutput' + OutputNumber)
      .setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service = this.accessory.getService(this.platform.Service.Switch)
    || this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.HandleOnGet.bind(this))
      .onSet(this.HandleOnSet.bind(this));
  }

  HandleOnGet() {
    const Output = this.Panel.GetOutputFromIndex(this.OutputIndex);
    return Output.OutputState;
  }

  HandleOnSet(value) {
    this.Panel.SetOutputState(this.OutputNumber, value);
  }

  HandleOutputChange(State: boolean) {
    this.service.updateCharacteristic(this.platform.Characteristic.On, State);
  }
}
