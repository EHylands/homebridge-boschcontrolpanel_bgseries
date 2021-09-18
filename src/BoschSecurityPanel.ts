import { Service, PlatformAccessory } from 'homebridge';
import { BGAreaStatus, BGArmingType, BGController } from './BGController';
import { HB_BoschControlPanel_BGSeries } from './platform';

export class BoschSecurityPanel {
  private service: Service;

  constructor(
    private readonly platform: HB_BoschControlPanel_BGSeries,
    private readonly accessory: PlatformAccessory,
    private readonly Panel: BGController,
    readonly AreaMonitored: number,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Bosch Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'Panel')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '123456')
      .setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service = this.accessory.getService(this.platform.Service.SecuritySystem)
    || this.accessory.addService(this.platform.Service.SecuritySystem);

    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState)
      .onGet(this.handleSecuritySystemCurrentStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onGet(this.handleSecuritySystemTargetStateGet.bind(this))
      .onSet(this.handleSecuritySystemTargetStateSet.bind(this));
  }

  handleSecuritySystemCurrentStateGet() {
    const AreaIndex = this.Panel.GetAreaIndex(this.AreaMonitored);
    if(AreaIndex === -1 ){
      this.platform.log.error('Security Panel Zone ' + this.AreaMonitored + ': Invalid Area number.');
    }

    const AreaStatus = this.Panel.AreaArray[AreaIndex].AreaStatus;
    const HKStatus = this.BoschAreaStatusToCurrentHomekitSecurityStatus(AreaStatus);
    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState).updateValue(HKStatus);
    return HKStatus;
  }

  SetAlarmTriggered(AlarmTrigerred){
    if(AlarmTrigerred){
      this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState,
        this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
    } else{
      this.handleSecuritySystemCurrentStateGet();
    }
  }


  handleSecuritySystemTargetStateGet() {
    const AreaIndex = this.Panel.GetAreaIndex(this.AreaMonitored);

    if(AreaIndex === -1 ){
      this.platform.log.error('Security Panel Zone ' + this.AreaMonitored + ': Invalid Area number.');
    }
    const AreaStatus = this.Panel.AreaArray[AreaIndex].AreaStatus;
    const HKStatus = this.BoschAreaStatusToTargetHomekitSecurityStatus(AreaStatus);
    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState).updateValue(HKStatus);
    return HKStatus;
  }

  handleSecuritySystemTargetStateSet(value) {

    switch(value){
      case this.platform.Characteristic.SecuritySystemTargetState.DISARM:{
        this.Panel.SendMode2ArmPanelAreas([this.AreaMonitored], BGArmingType.Disarm);
        break;
      }

      case this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM:{
        this.Panel.SendMode2ArmPanelAreas([this.AreaMonitored], BGArmingType.MasterDelayArm);
        break;
      }

      case this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM:{
        this.Panel.SendMode2ArmPanelAreas([this.AreaMonitored], BGArmingType.PerimeterInstantArm);
        break;
      }

      case this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM:{
        this.Panel.SendMode2ArmPanelAreas([this.AreaMonitored], BGArmingType.PerimeterDelayArm);
        break;
      }
    }

    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .updateValue(value);
  }

  BoschAreaStatusToCurrentHomekitSecurityStatus(AreaStatus: BGAreaStatus){

    switch(AreaStatus){
      case BGAreaStatus.AllOn:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
        break;
      }

      case BGAreaStatus.AllOnEntryDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      case BGAreaStatus.AllOnExitDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      case BGAreaStatus.AllOnInstantArmed:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      case BGAreaStatus.Disarmed:{
        return this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
      }

      case BGAreaStatus.PartOnDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM;
      }

      case BGAreaStatus.PartOnEntryDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM;
      }

      case BGAreaStatus.PartOnExitDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM;
      }

      case BGAreaStatus.PartOnInstant:{
        return this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
      }

      case BGAreaStatus.Unknown:{
        return this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
      }
    }
  }

  BoschAreaStatusToTargetHomekitSecurityStatus(AreaStatus: BGAreaStatus){

    switch(AreaStatus){
      case BGAreaStatus.AllOn:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
        break;
      }

      case BGAreaStatus.AllOnEntryDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      case BGAreaStatus.AllOnExitDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      case BGAreaStatus.AllOnInstantArmed:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      case BGAreaStatus.Disarmed:{
        return this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
      }

      case BGAreaStatus.PartOnDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM;
      }

      case BGAreaStatus.PartOnEntryDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM;
      }

      case BGAreaStatus.PartOnExitDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM;
      }

      case BGAreaStatus.PartOnInstant:{
        return this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
      }

      case BGAreaStatus.Unknown:{
        // throw error
        return this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
        break;
      }
    }
  }
}
