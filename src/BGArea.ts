export enum BGAreaStatus{
    Unknown = 0x00,
    AllOn = 0x01,
    PartOnInstant = 0x02,
    PartOnDelay = 0x03,
    Disarmed = 0x04,
    AllOnEntryDelay = 0x05,
    PartOnEntryDelay = 0x06,
    AllOnExitDelay = 0x07,
    PartOnExitDelay = 0x08,
    AllOnInstantArmed = 0x09,
    StayArm1On = 0x0A,
    StayArm2On = 0x0B,
    AwayOn = 0x0C,
    AwayExitDelay = 0x0D,
    AwayEntryDelay = 0x0E
}

export enum BGArmingType{
    Disarm = 0x01,
    MasterInstantArm = 0x02,
    MasterDelayArm = 0x03,
    PerimeterInstantArm = 0x04,
    PerimeterDelayArm = 0x05,
    ForceMasterDelay = 0x06,
    ForceMasterInstantArm = 0x07,
    ForcePerimeterDelayArm = 0x08,
    ForcePerimeterInstantArm = 0x09,
    StayArm1 = 0x0A,
    StayArm2 = 0x0B,
    AwayArm = 0x0C
  }

export enum BGAlarmPriority{
  NoPriority = 0,
  BurgTrouble = 1,
  BurgSupervisory = 2,
  GasTrouble = 3,
  GasSupervisory = 4,
  FireTrouble = 5,
  FireSupervisory = 6,
  BurgAlarm = 7,
  PersonalEmergency = 8,
  GasAlarm = 9,
  FireAlarm = 10,
  BurglaryTamper = 11,
  BurglaryFault = 12,
  TechnicalFireAlarm = 13,
  TechnicalFireTamper = 14,
  TechnicalFireFault = 15,
  TechnicalGasAlarm = 16,
  TechnicalGasTamper = 17,
  TechnicalGasFault =18
}

export class BGArea{
    AreaNumber: number;
    AreaText = '';

    AreaStatus = BGAreaStatus.Unknown;
    ReadyToBecomeAllOn = false;
    ReadyToBecomePartOn = false;
    FaultNumber = 0;

    private Alarms:number[] = [];

    constructor(AreaNumber: number){
      this.AreaNumber = AreaNumber;
    }

    SetAreaStatus(AreaStatus: BGAreaStatus){
      this.AreaStatus = AreaStatus;
    }

    SetAreaReadyState(ReadyToBecomeAllOn: boolean, ReadyToBecomePartOn: boolean, FaultNumber: number ){
      this.ReadyToBecomeAllOn = ReadyToBecomeAllOn;
      this.ReadyToBecomePartOn = ReadyToBecomePartOn;
      this.FaultNumber = FaultNumber;
    }

    GetAlarmDetected():boolean{

      if(this.Alarms.indexOf(BGAlarmPriority.BurgAlarm) !== -1 ||
      this.Alarms.indexOf(BGAlarmPriority.FireAlarm) !== -1 ||
      this.Alarms.indexOf(BGAlarmPriority.PersonalEmergency) !== -1 ||
      this.Alarms.indexOf(BGAlarmPriority.GasAlarm) !== -1){
        return true;
      }

      return false;
    }

    AddAlarm(Alarm:BGAlarmPriority):boolean{

      if(this.Alarms.indexOf(Alarm) === -1){
        this.Alarms.push(Alarm);
        return true;
      }

      return false;
    }

    RemoveAlarm(Alarm:BGAlarmPriority):boolean{

      const index = this.Alarms.indexOf(Alarm);
      if(index !== -1){
        this.Alarms.splice(index, 1);
        return true;
      }

      return false;

    }

    GetIsAlarmNominal():boolean{
      if(this.Alarms.length === 0){
        return true;
      }

      return false;
    }

    GetFireAlarm():number[]{
      const response:number[] = [];
      if(this.Alarms.indexOf(BGAlarmPriority.FireAlarm) !== -1){
        response.push(BGAlarmPriority.FireAlarm);
      }

      if(this.Alarms.indexOf(BGAlarmPriority.FireTrouble) !== -1){
        response.push(BGAlarmPriority.FireTrouble);
      }

      if(this.Alarms.indexOf(BGAlarmPriority.FireSupervisory) !== -1){
        response.push(BGAlarmPriority.FireSupervisory);
      }

      return response;
    }

    GetGazAlarm():number[]{
      const response:number[] = [];
      if(this.Alarms.indexOf(BGAlarmPriority.GasAlarm) !== -1){
        response.push(BGAlarmPriority.GasAlarm);
      }

      if(this.Alarms.indexOf(BGAlarmPriority.GasTrouble) !== -1){
        response.push(BGAlarmPriority.GasTrouble);
      }

      if(this.Alarms.indexOf(BGAlarmPriority.GasSupervisory) !== -1){
        response.push(BGAlarmPriority.GasSupervisory);
      }

      return response;
    }

    GetPersonnalAlarm():number[]{
      const response:number[] = [];
      if(this.Alarms.indexOf(BGAlarmPriority.PersonalEmergency) !== -1){
        response.push(BGAlarmPriority.PersonalEmergency);
      }

      return response;
    }

    GetBurglaryAlarm():number[]{
      const response:number[] = [];
      if(this.Alarms.indexOf(BGAlarmPriority.BurgAlarm) !== -1){
        response.push(BGAlarmPriority.BurgAlarm);
      }

      if(this.Alarms.indexOf(BGAlarmPriority.BurgTrouble) !== -1){
        response.push(BGAlarmPriority.BurgTrouble);
      }

      if(this.Alarms.indexOf(BGAlarmPriority.BurgSupervisory) !== -1){
        response.push(BGAlarmPriority.BurgSupervisory);
      }

      return response;
    }

    ClearAlarm():boolean{
      if(this.Alarms.length !== 0){
        this.Alarms = [];
        // Alarms array was clear, return true to indicate a change.
        return true;
      }

      // Alarms array was allready empty, no change done.
      return false;
    }

    SetAlarm(AlarmAnnunciationPriority: number){
      this.ClearAlarm();

      if(AlarmAnnunciationPriority & 0x0200){
        this.Alarms.push(BGAlarmPriority.FireAlarm);
      }

      if(AlarmAnnunciationPriority & 0x0020){
        this.Alarms.push(BGAlarmPriority.FireSupervisory);
      }

      if(AlarmAnnunciationPriority & 0x0010){
        this.Alarms.push(BGAlarmPriority.FireTrouble);
      }

      if(AlarmAnnunciationPriority & 0x0100){
        this.Alarms.push(BGAlarmPriority.GasAlarm);
      }

      if(AlarmAnnunciationPriority & 0x0008){
        this.Alarms.push(BGAlarmPriority.GasSupervisory);
      }

      if(AlarmAnnunciationPriority & 0x0004){
        this.Alarms.push(BGAlarmPriority.GasTrouble);
      }

      if(AlarmAnnunciationPriority & 0x0080){
        this.Alarms.push(BGAlarmPriority.PersonalEmergency);
      }

      if(AlarmAnnunciationPriority & 0x0040){
        this.Alarms.push(BGAlarmPriority.BurgAlarm);
      }

      if(AlarmAnnunciationPriority & 0x0002){
        this.Alarms.push(BGAlarmPriority.BurgSupervisory);
      }

      if(AlarmAnnunciationPriority & 0x0001){
        this.Alarms.push(BGAlarmPriority.BurgTrouble);
      }
    }
}