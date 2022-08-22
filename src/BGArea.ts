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
    ForcePerimeterInstantArm = 0x09
}

export enum BGAlarmType{
    Normal,
    Supervisory,
    Trouble,
    Alarm,
    Unkown
}

export class BGArea{
    AreaNumber: number;
    AreaText = '';

    AreaStatus = BGAreaStatus.Unknown;
    ReadyToBecomeAllOn = false;
    ReadyToBecomePartOn = false;
    FaultNumber = 0;

    FireAlarm = BGAlarmType.Unkown;
    GazAlarm = BGAlarmType.Unkown;
    PersonnalAlarm = BGAlarmType.Unkown;
    BurglaryAlarm = BGAlarmType.Unkown;

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
      if(this.FireAlarm === BGAlarmType.Alarm ||
        this.GazAlarm === BGAlarmType.Alarm ||
        this.PersonnalAlarm === BGAlarmType.Alarm ||
        this.BurglaryAlarm === BGAlarmType.Alarm ){
        return true;
      }
      return false;
    }

    GetIsAlarmNominal():boolean{
      if(this.FireAlarm === BGAlarmType.Normal &&
        this.GazAlarm === BGAlarmType.Normal &&
        this.PersonnalAlarm === BGAlarmType.Normal &&
        this.BurglaryAlarm === BGAlarmType.Normal ){
        return true;
      }
      return false;
    }

    ClearAlarm(){
      this.FireAlarm = BGAlarmType.Normal;
      this.GazAlarm = BGAlarmType.Normal;
      this.PersonnalAlarm= BGAlarmType.Normal;
      this.BurglaryAlarm = BGAlarmType.Normal;
    }

    private SetFireAlarm(AlarmAnnunciationPriority: number){
      if(AlarmAnnunciationPriority & 0x0200){
        this.FireAlarm = BGAlarmType.Alarm;
        return;
      }

      if(AlarmAnnunciationPriority & 0x0020){
        this.FireAlarm = BGAlarmType.Supervisory;
        return;
      }

      if(AlarmAnnunciationPriority & 0x0010){
        this.FireAlarm = BGAlarmType.Trouble;
        return;
      }

      this.FireAlarm = BGAlarmType.Normal;
    }

    private SetGazAlarm(AlarmAnnunciationPriority: number){
      if(AlarmAnnunciationPriority & 0x0100){
        this.GazAlarm = BGAlarmType.Alarm;
        return;
      }

      if(AlarmAnnunciationPriority & 0x0008){
        this.GazAlarm = BGAlarmType.Supervisory;
        return;
      }

      if(AlarmAnnunciationPriority & 0x0004){
        this.GazAlarm = BGAlarmType.Trouble;
        return;
      }

      this.GazAlarm = BGAlarmType.Normal;
    }

    private SetPersonnalAlarm(AlarmAnnunciationPriority: number){
      if(AlarmAnnunciationPriority & 0x0080){
        this.PersonnalAlarm = BGAlarmType.Alarm;
        return;
      }

      this.PersonnalAlarm = BGAlarmType.Normal;
    }

    private SetBurglaryAlarm(AlarmAnnunciationPriority: number){
      if(AlarmAnnunciationPriority & 0x0040){
        this.BurglaryAlarm = BGAlarmType.Alarm;
        return;
      }

      if(AlarmAnnunciationPriority & 0x0002){
        this.BurglaryAlarm = BGAlarmType.Supervisory;
        return;
      }

      if(AlarmAnnunciationPriority & 0x0001){
        this.BurglaryAlarm = BGAlarmType.Trouble;
        return;
      }

      this.BurglaryAlarm = BGAlarmType.Normal;
    }

    SetAlarm(AlarmAnnunciationPriority: number){
      if(AlarmAnnunciationPriority === 0){
        this.ClearAlarm();
      } else{
        this.SetFireAlarm(AlarmAnnunciationPriority);
        this.SetGazAlarm(AlarmAnnunciationPriority);
        this.SetPersonnalAlarm(AlarmAnnunciationPriority);
        this.SetBurglaryAlarm(AlarmAnnunciationPriority);
      }
    }
}