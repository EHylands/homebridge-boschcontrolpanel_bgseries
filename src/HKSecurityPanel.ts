import { BGAreaStatus, BGArmingType, BGPanelType } from './BGConst';
import { HKAccessory } from './HKAccessory';
import { HB_BoschControlPanel_BGSeries } from './platform';

export class HKSecurityPanel extends HKAccessory {

  constructor(
    protected readonly platform: HB_BoschControlPanel_BGSeries,
    private readonly AreaMonitored: number,
    private readonly AreaInScope:number[],
    private readonly PasscodeFollowScope:boolean,
  ) {

    super(
      platform,
      'BGArea' + platform.Panel.PanelType + AreaMonitored,
      platform.Panel.GetAreas()[AreaMonitored].AreaText,
      'BGPanel' + AreaMonitored,
    );

    if(AreaInScope.indexOf(AreaMonitored) === -1){
      this.AreaInScope.push(this.AreaMonitored);
    }
    this.AreaInScope.sort((a, b)=> a-b);

    this.platform.log.info('Security System: Area' + AreaMonitored + ' - ' + this.Accessory.displayName);
    this.platform.log.debug('    Area(s) in Scope: ' + this.GetAreaInScopeString());
    this.platform.log.debug('    Passcode Follows Scope: ' + this.PasscodeFollowScope);

    this.useService(this.platform.Service.SecuritySystem).getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onSet(this.handleSecuritySystemTargetStateSet.bind(this));

    this.platform.Panel.on('AreaOnOffStateChange', (Area)=>{
      if(this.AreaMonitored === Area.AreaNumber){
        this.UpdateStateFromPanel(Area.AreaStatus);
      }
    });

    this.platform.Panel.on('AreaAlarmStateChange', (Area)=>{
      if(this.AreaInScope.indexOf(Area.AreaNumber) === -1){
        return;
      }

      let AlarmDetected = false;
      for(let i = 0 ; i < this.AreaInScope.length ; i ++){
        if(this.platform.Panel.GetAreas()[this.AreaInScope[i]].GetAlarmDetected()){
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
    this.useService(this.platform.Service.SecuritySystem)
      .getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState).updateValue(HKCurrentStatus);
    this.useService(this.platform.Service.SecuritySystem)
      .getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState).updateValue(HKTargetStatus);
  }

  SetAlarmTriggered(AlarmTrigerred){
    if(AlarmTrigerred){
      this.useService(this.platform.Service.SecuritySystem).updateCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState,
        this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
    } else{

      const Area = this.platform.Panel.GetAreas()[this.AreaMonitored];
      if(Area){
        const HKCurrentStatus = this.BoschAreaStatusToCurrentHomekitSecurityStatus(Area.AreaStatus);
        this.useService(this.platform.Service.SecuritySystem)
          .getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState).updateValue(HKCurrentStatus);
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

    const Panel = this.platform.Panel;

    switch(value){
      case this.platform.Characteristic.SecuritySystemTargetState.DISARM:{
        this.platform.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.Disarm);
        break;
      }

      case this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM:{

        if(Panel.PanelType === BGPanelType.Solution2000 ||
           Panel.PanelType === BGPanelType.Solution3000 ||
           Panel.PanelType === BGPanelType.AMAX2100 ||
           Panel.PanelType === BGPanelType.AMAX3000 ||
           Panel.PanelType === BGPanelType.AMAX4000){
          this.platform.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.AwayArm);
        } else{
          this.platform.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.MasterDelayArm);
        }

        break;
      }

      case this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM:{

        if(
          Panel.PanelType === BGPanelType.AMAX2100 ||
          Panel.PanelType === BGPanelType.AMAX3000 ||
          Panel.PanelType === BGPanelType.AMAX4000){
          this.platform.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.StayArm1);
          break;
        }

        if(Panel.PanelType === BGPanelType.Solution2000 ||
          Panel.PanelType === BGPanelType.Solution3000){
          this.platform.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.StayArm2);
          break;

        }

        this.platform.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.PerimeterInstantArm);
        break;
      }

      case this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM:{

        if(Panel.PanelType === BGPanelType.Solution2000 ||
          Panel.PanelType === BGPanelType.Solution3000 ||
          Panel.PanelType === BGPanelType.AMAX2100 ||
          Panel.PanelType === BGPanelType.AMAX3000 ||
          Panel.PanelType === BGPanelType.AMAX4000){
          this.platform.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.StayArm1);
          break;
        }

        this.platform.Panel.SendMode2ArmPanelAreas(AreaToArm, BGArmingType.PerimeterDelayArm);
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

      case BGAreaStatus.StayArm1On:{
        return this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM;
      }

      case BGAreaStatus.StayArm2On:{
        return this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
      }

      case BGAreaStatus.AwayOn:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      case BGAreaStatus.AwayExitDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      case BGAreaStatus.AwayEntryDelay:{
        return this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
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

      case BGAreaStatus.StayArm1On:{
        return this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM;
      }

      case BGAreaStatus.StayArm2On:{
        return this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM;
      }

      case BGAreaStatus.AwayOn:{
        return this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM;
      }

      case BGAreaStatus.AwayEntryDelay:{
        return this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM;
      }

      case BGAreaStatus.AwayExitDelay:{
        return this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM;
      }

      case BGAreaStatus.Unknown:{
        // throw error
        return this.platform.Characteristic.SecuritySystemTargetState.DISARM;
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
