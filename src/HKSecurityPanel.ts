import { Service, PlatformAccessory} from 'homebridge';
import { BGController, BGPanelType } from './BGController';
import { BGAreaStatus, BGArmingType } from './BGArea';
import { HB_BoschControlPanel_BGSeries } from './platform';

export class HKSecurityPanel {
  private service: Service;
  private Panel:BGController;

  constructor(
    private readonly platform: HB_BoschControlPanel_BGSeries,
    private readonly accessory: PlatformAccessory,
    private readonly AreaMonitored: number,
    private readonly AreaInScope:number[],
    private readonly PasscodeFollowScope:boolean,
  ) {

    this.Panel = this.platform.Panel;

    if(AreaInScope.indexOf(AreaMonitored) === -1){
      this.AreaInScope.push(this.AreaMonitored);
    }
    this.AreaInScope.sort((a, b)=> a-b);

    this.platform.log.info('Security System: Area' + AreaMonitored + ' - ' + accessory.displayName);
    this.platform.log.debug('    Area(s) in Scope: ' + this.GetAreaInScopeString());
    this.platform.log.debug('    Passcode Follows Scope: ' + this.PasscodeFollowScope);

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Bosch Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, BGPanelType[this.Panel.PanelType])
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'BGPanel' + AreaMonitored)
      .setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service = this.accessory.getService(this.platform.Service.SecuritySystem)
    || this.accessory.addService(this.platform.Service.SecuritySystem);

    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onSet(this.handleSecuritySystemTargetStateSet.bind(this));

    this.Panel.on('AreaOnOffStateChange', (Area)=>{
      if(this.AreaMonitored === Area.AreaNumber){
        this.UpdateStateFromPanel(Area.AreaStatus);
      }
    });

    this.Panel.on('AreaAlarmStateChange', (Area)=>{

      if(this.AreaInScope.indexOf(Area.AreaNumber) === -1){
        return;
      }

      let AlarmDetected = false;
      for(let i = 0 ; i < this.AreaInScope.length ; i ++){
        if(this.Panel.GetAreas()[this.AreaInScope[i]].GetAlarmDetected()){
          AlarmDetected = true;
          break;
        }
      }

      this.SetAlarmTriggered(AlarmDetected);
    });
  }

  UpdateStateFromPanel(AreaStatus: BGAreaStatus) {
    const HKCurrentStatus = this.BoschAreaStatusToCurrentHomekitSecurityStatus(AreaStatus);
    const HKTargetStatus = this.BoschAreaStatusToTargetHomekitSecurityStatus(AreaStatus);
    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState).updateValue(HKCurrentStatus);
    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState).updateValue(HKTargetStatus);
  }

  SetAlarmTriggered(AlarmTrigerred){
    if(AlarmTrigerred){
      this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState,
        this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
    } else{

      const Area = this.Panel.GetAreas()[this.AreaMonitored];
      if(Area){
        const HKCurrentStatus = this.BoschAreaStatusToCurrentHomekitSecurityStatus(Area.AreaStatus);
        this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState).updateValue(HKCurrentStatus);
      } else{
        this.platform.log.error('Security System: Error reading Area Status');
      }
    }
  }

  SetFaulted(){
    // Not Working
    // this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState,new Error(''));
  }

  handleSecuritySystemTargetStateSet(value) {

    let AreaToArm:number[] = [this.AreaMonitored];
    if(this.PasscodeFollowScope){
      AreaToArm = this.AreaInScope;
    }

    switch(value){
      case this.platform.Characteristic.SecuritySystemTargetState.DISARM:{
        this.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.Disarm);
        break;
      }

      case this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM:{
        this.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.MasterDelayArm);
        break;
      }

      case this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM:{
        this.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.PerimeterInstantArm);
        break;
      }

      case this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM:{
        this.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.PerimeterDelayArm);
        break;
      }
    }
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
        return this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM;
        break;
      }

      case BGAreaStatus.AllOnEntryDelay:{
        return this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM;
      }

      case BGAreaStatus.AllOnExitDelay:{
        return this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM;
      }

      case BGAreaStatus.AllOnInstantArmed:{
        return this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM;
      }

      case BGAreaStatus.Disarmed:{
        return this.platform.Characteristic.SecuritySystemTargetState.DISARM;
      }

      case BGAreaStatus.PartOnDelay:{
        return this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM;
      }

      case BGAreaStatus.PartOnEntryDelay:{
        return this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM;
      }

      case BGAreaStatus.PartOnExitDelay:{
        return this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM;
      }

      case BGAreaStatus.PartOnInstant:{
        return this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM;
      }

      case BGAreaStatus.Unknown:{
        // throw error
        return this.platform.Characteristic.SecuritySystemTargetState.DISARM;
        break;
      }
    }
  }

  private GetAreaInScopeString():string{
    let AreaInScopeString = '';
    for(let i = 0 ; i < this.AreaInScope.length ; i++){
      AreaInScopeString += this.AreaInScope[i] + ',';
    }
    return AreaInScopeString.slice(0, AreaInScopeString.length - 1);
  }
}
