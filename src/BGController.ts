import tls = require('tls');
import { TypedEmitter } from 'tiny-typed-emitter';
import net = require('net');

enum BGNegativeAcknowledgement {
  NonSpecificError = 0x00,
  ChecksumFailureUDPConnectionsOnly = 0x01,
  InvalidSizeLength = 0x02,
  InvalidCommand = 0x03,
  InvalidInterfaceState = 0x04,
  DataOutOfRange = 0x05,
  Noauthority = 0x05,
  Unsupportedcommand = 0x07,
  CannotArmPanel = 0x08,
  InvalidRemoteID = 0x09,
  InvalidLicense = 0x0A,
  InvalidMagicNumber = 0x0B,
  ExpiredLicense = 0x0C,
  ExpiredMagicNumber = 0x0D,
  UnsupportedFormatVersion = 0x0E,
  FirmwareUpdateInProgress = 0x11,
  IncompatibleFirmwareVersion = 0x12,
  AllPointsNotConfigured = 0x12,
  ExecutionFunctionNoErrors = 0x20,
  ExecutionFunctionInvalidArea = 0x21,
  ExecutionFunctionInvalidCommand = 0x22,
  ExecutionFunctionNotAuthenticated = 0x23,
  ExecutionFunctionInvalidUser = 0x24,
  ExecutionFunctionParameterIncorrect = 0x40,
  ExecutionFunctionSequenceWrong = 0x41,
  ExecutionFunctionInvalidConfigurationRequest = 0x42,
  ExecutionFunctionInvalidSize = 0x43,
  ExecutionFunctionTimeOut = 0x44,
  RFRequestFailed = 0xDF,
  NoRFdevicewiththatRFID = 0xE0,
  BadRFIDNotProperFormat = 0xE1,
  TooManyRFFevicesForThisPanel = 0xE2,
  DuplicateRFID = 0xE3,
  DuplicateAccessCard = 0xE4,
  BadAccessCardData = 0XE5,
  BadLanguageChoice = 0xE6,
  BadSupervisionModeSelection = 0xE7,
  BadEnableDisableChoice = 0xE8,
  BadMonth = 0xE9,
  BadDay = 0xEA,
  BadHour = 0xEB,
  BadMinute = 0xEC,
  BadTimeEditChoice = 0xED,
  BadRemoteEnable = 0xEF
}

export enum BGControllerError{
  InvalidProtocolLength = 'Invalid Protocol Length',
  InvalidProtocol = 'Invalid Protocol',
  InvalidCommandLength = 'Invalid Command Length',
  InvalidCommandFormatLength = 'Invalid Command Format Length',
  InvalidResponseArgumentLength = 'Invalid Response Length',
  CommandLengthOverflow = 'Command Length Over Maximum Allowed Value',
  ResponseLengthOverflow = 'Response Length Over Maximum Allowed Value',
  NotificationLengthOverflow = 'Notification Length Over Maximum Allowed Value',
  InvalidResponseLength = 'Invadid Response Length (Length argument)',
  InvalidNotificationLength = 'Invadid Notification Length (Length argument)',
  BoschPanelError = 'Bosch Panel Error',
  UndefinedError = 'Undefined Error',
  UserNotAuthentificated = 'User not authentificated',
  PanelBusy = 'Panel is busy, cannot accept new connection',
  PasscodeLengthError = 'Passcode supplied to controller is of invalid length',
  MaxAreaNumberError = 'Number of confiigured areas over controller maximum area number'
}

enum BGControllerState {
  Idle,
  ConnectingToPanel,
  TerminatingConnection,
  GetPanelMode2WhatAreYou,
  GetPanelMode2Passcode,
  GetPanelMode2Capacitie,
  GetPanelConfiguredAreas,
  GetPanelMode2ReqAreaText,
  GetPanelMode2ReqPointsInArea,
  GetPanelMode2ReqPointText,
  GetPanelMode2ReqAreaStatus,
  GetPanelMode2ArmPanelAreas,
  Mode2SetSubscriptions,
  GetPanelMode2ReqOutputStatus,
  ControllerReadyForOperation
}

export enum BGUserType{
  InstallerApp = 0x00, // Do not use
  AutomationUser = 0x01,
  RemoteUser = 0x02
}

export enum BGPanelType {
  Undefined = 0x00,
  Solution2000 = 0x20,
  Solution3000 = 0x21,
  AMAX2100 = 0x22,
  AMAX3000 = 0x23,
  AMAX4000 = 0x24,
  D7412GV4 = 0x79,
  D9412GV4 = 0x84,
  B4512 = 0xAA0,
  B5512 = 0xA4,
  B8512G = 0xA6,
  B9512G = 0xA7,
  B3512 = 0xA8,
  B6512 = 0xA9
}

enum MaxConnectionsInUseFlags {
  MaxUserBasedRemoteAccessUsersInUse = 0x04,
  MaxAutomationUsersInUse = 0x02,
  MaxRPSAlinkusersInUse = 0x01
}

class BGProtocolVersion{
  ProtocolVersionMajor: number;
  ProtocolVersionMinor: number;
  ProtocolVersionMicro: number;

  constructor(Major:number, Minor:number, Micro: number){
    this.ProtocolVersionMajor = Major;
    this.ProtocolVersionMinor = Minor;
    this.ProtocolVersionMicro = Micro;
  }

  toSring(){
    return this.ProtocolVersionMajor + '.' + this.ProtocolVersionMinor + '.' + this.ProtocolVersionMicro;
  }
}

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

enum BGAlarmType{
  Normal,
  Supervisory,
  Trouble,
  Alarm,
  Unkown
}

export class BGArea{
  AreaNumber: number;
  AreaText = '';
  PointArray: BGPoint[] = [];

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

    this.FireAlarm = BGAlarmType.Unkown;
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

    this.GazAlarm = BGAlarmType.Unkown;
  }

  private SetPersonnalAlarm(AlarmAnnunciationPriority: number){
    if(AlarmAnnunciationPriority & 0x0080){
      this.PersonnalAlarm = BGAlarmType.Alarm;
      return;
    }

    this.PersonnalAlarm = BGAlarmType.Unkown;
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

    this.BurglaryAlarm = BGAlarmType.Unkown;
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

export enum BGPointStatus {
  Unassigned = 0x00,
  Short = 0x01,
  Open = 0x02,
  Normal = 0x03,
  Missing = 0x04,
  Resistor2 = 0x05,
  Resistor4 = 0x06,
  Unknown = 0xFF
}

export class BGPoint{
  PointNumber: number;
  PointText = '';
  PointStatus = BGPointStatus.Unknown;
  Bypassable = false;
  PointCode = 0;
  PointCondition = 0;

  constructor(PointNumber: number){
    this.PointNumber = PointNumber;
  }

  UpdatePoint(PointStatus: BGPointStatus, Bypassable: boolean, PointCode: number, PointCondition: number){
    this.PointStatus = PointStatus;
    this.Bypassable = Bypassable;
    this.PointCode = PointCode;
    this.PointCondition = PointCondition;
  }
}

export class BoschPanelOutput{
  OutputNumber = 0;
  OutputText = '';
  OutputState = false;

  constructor(OutputNumber: number){
    this.OutputNumber = OutputNumber;
  }
}

export interface BoschControllerMode2Event {
  'PanelReadyForOperation': (PanelReady: boolean) => void;
  'ControllerError': (Error: BGControllerError, ErrorString: string) => void;
  'PointStatusChange': (Point: BGPoint) => void;
  'AreaReadyStateChange':(Area: BGArea) => void;
  'AreaOnOffStateChange':(Area: BGArea) => void;
  'ConfidenceMessage':() => void;
}

export class BGController extends TypedEmitter<BoschControllerMode2Event> {
    // For internal use
    private AreaReadingIndex = 0;
    Util = require('util');

    Host: string;
    Port: number;
    Socket: tls.TLSSocket;
    Client = net.Socket;

    UserType: BGUserType;
    Passcode: string;
    MinPasscodeLength = 6;
    MaxPassCodeLength = 24;

    // Protocol related variables
    readonly ControllerMaxAreas = 128;
    readonly ControllerMaxPointInArea = 600;
    readonly ControllerMaxOutput = 600;
    readonly ControllerMaxCommandBytes = 236;
    readonly ControllerMaxNotificationMessageBytes = 480;
    readonly EP1 = new Uint8Array([0x01]); // Expected Protocol 0x01
    readonly EP2 = new Uint8Array([0x02]); // Expected Protocol 0x02
    readonly FE = new Uint8Array([0xFE]);  // FE response
    readonly FC = new Uint8Array([0xFC]);  // FC response

    CurrentControllerState = BGControllerState.Idle;

    // Mininum protocol supported version
    readonly MinimumIntrusionIntegrationProtocolVersion = new BGProtocolVersion(5, 208, 0);

    // Current Panel related variables
    PanelRPSProtocolVersion = new BGProtocolVersion(0, 0, 0);
    PanelIntrusionIntegrationProtocolVersion = new BGProtocolVersion(0, 0, 0);
    PanelExecuteProtocolVersion = new BGProtocolVersion(0, 0, 0);
    PanelBusyFlag = false;
    PanelType = BGPanelType.Undefined;
    MaxAreas = 0;
    MaxPoints = 0;
    MaxOutputs = 0;
    MaxUsers = 0;
    MaxKeypads = 0;
    MaxDoors= 0;

    AreaArray: BGArea[];

    constructor(Host: string, Port:number, UserType: BGUserType, Passcode: string) {
      super();
      this.Host = Host;
      this.Port = Port;
      this.Passcode = Passcode;
      this.UserType = UserType;
      this.AreaArray = [];

      //this.emit('PanelReadyForOperation', false);
      this.CurrentControllerState = BGControllerState.ConnectingToPanel;
      this.Socket = tls.connect(this.Port, this.Host, {rejectUnauthorized: false}, () => {
        //console.debug('Secure connection with ' + this.Host + ':' + this.Port + '...');
      });

      this.Socket.on('data', (data: Buffer) => {
        const Protocol = data[0];
        const Data = data.slice(1, data.length);

        //console.log(Data);

        switch(Protocol){
          case 0x01:{
            this.ReadProtocolMessage_0x01(Data);
            break;
          }

          case 0x02:{
            this.ReadProtocolMessage_0x02(Data);
            break;
          }
        }
      });
    }

    private CheckExpectedResponse(Data: Buffer, ExpectedResponse: Uint8Array):boolean{
      if(Data[1] !== ExpectedResponse[0]){
        if(Data[1] === 0xFD){
          this.emit('ControllerError', BGControllerError.BoschPanelError, BGNegativeAcknowledgement[Data[2]]);
        } else{
          this.emit('ControllerError', BGControllerError.UndefinedError, '');
        }
        return false;
      }
      return true;
    }

    private ReadProtocolMessage_0x01(Data: Buffer){

      if(Data.length < 2 || Data.length > this.ControllerMaxCommandBytes){
        this.emit('ControllerError', BGControllerError.ResponseLengthOverflow, '');
        return;
      }

      if(Data[0] !== Data.length - 1){
        this.emit('ControllerError', BGControllerError.InvalidResponseLength, '');
        return;
      }

      switch(this.CurrentControllerState){
        case BGControllerState.GetPanelMode2WhatAreYou:{
          if(this.CheckExpectedResponse(Data, this.FE)){
            this.ReadMode2WhatAreYou(Data);
            this.SendMode2Passcode();
          }
          break;
        }

        case BGControllerState.GetPanelMode2Passcode:{
          if(this.CheckExpectedResponse(Data, this.FE)){
            this.ReadMode2Passcode(Data);
          }
          break;
        }

        case BGControllerState.GetPanelMode2Capacitie:{
          if(this.CheckExpectedResponse(Data, this.FE)){
            this.ReadMode2ReqPanelCapacitie(Data);
          }
          break;
        }

        case BGControllerState.TerminatingConnection:{
          if(this.CheckExpectedResponse(Data, this.FC)){
            this.ReadTerminateSession(Data);
          }
          break;
        }

        case BGControllerState.GetPanelConfiguredAreas:{
          if(this.CheckExpectedResponse(Data, this.FE)){
            this.ReadMode2ReqConfiguredAreas(Data);
          }
          break;
        }

        case BGControllerState.GetPanelMode2ReqAreaText:{
          if(this.CheckExpectedResponse(Data, this.FE)){
            this.ReadMode2ReqAreaText(Data);
          }
          break;
        }

        case BGControllerState.GetPanelMode2ReqPointsInArea:{
          if(this.CheckExpectedResponse(Data, this.FE)){
            this.ReadMode2ReqPointsInArea(Data);
          }
          break;
        }

        case BGControllerState.GetPanelMode2ReqPointText:{
          if(this.CheckExpectedResponse(Data, this.FE)){
            this.ReadMode2ReqPointText(Data);
          }
          break;
        }

        case BGControllerState.GetPanelMode2ReqAreaStatus:{
          if(this.CheckExpectedResponse(Data, this.FE)){
            this.ReadMode2ReqAreaStatus(Data);
          }
          break;
        }

        case BGControllerState.Mode2SetSubscriptions:{
          if(this.CheckExpectedResponse(Data, this.FC)){
            this.ReadMode2SetSubscriptions(Data);
          }
          break;
        }

        case BGControllerState.GetPanelMode2ReqOutputStatus:{
          if(this.CheckExpectedResponse(Data, this.FE)){
            this.ReadMode2ReqOutputStatus(Data);
          }
          break;
        }

        case BGControllerState.GetPanelMode2ArmPanelAreas:{
          if(this.CheckExpectedResponse(Data, this.FC)){
            this.ReadMode2ReqOutputStatus(Data);
          }
          break;
        }
      }
      return;
    }

    private ReadProtocolMessage_0x02(Data: Buffer){

      if(Data.length < 2 || Data.length > (this.ControllerMaxNotificationMessageBytes - 2)){
        this.emit('ControllerError', BGControllerError.NotificationLengthOverflow, '');
        return;
      }

      // Data length over 2 bytes
      const NotificationLength = (Data[0] << 8) + Data[1];

      if(NotificationLength !== Data.length-2){
        this.emit('ControllerError', BGControllerError.InvalidNotificationLength, '');
        return;
      }

      let i = 1 ;
      while(i <= NotificationLength){
        const StatusItemType = Data[++i];
        const EntryNumber = Data[++i];

        // Confidence message
        if(StatusItemType === 0){
          this.emit('ConfidenceMessage');
          continue;
        }

        for(let j = 0; j < EntryNumber ; j++){

          // Area On Off Sate
          if(StatusItemType === 4){
            const AreaNumber = (Data[++i] << 8) + Data[++i];
            const AreaStatus = Data[++i];
            const AreaIndex = this.GetAreaIndexFromNumber(AreaNumber);
            this.AreaArray[AreaIndex].SetAreaStatus(AreaStatus);
            this.emit('AreaOnOffStateChange', this.AreaArray[AreaIndex]);
          }

          // Area ready state
          if(StatusItemType === 5){
            const AreaNumber = (Data[++i] << 8) + Data[++i];
            const AreaReadyState = Data[++i];
            const Fault = (Data[++i] << 8) + Data[++i];

            const AreaIndex = this.GetAreaIndexFromNumber(AreaNumber);
            if(AreaReadyState === 0){
              this.AreaArray[AreaIndex].SetAreaReadyState(false, false, Fault);
            }

            if(AreaReadyState === 1){
              this.AreaArray[AreaIndex].SetAreaReadyState(false, true, Fault);
            }

            if(AreaReadyState === 2){
              this.AreaArray[AreaIndex].SetAreaReadyState(true, true, Fault);
            }

            this.emit('AreaReadyStateChange', this.AreaArray[AreaIndex]);
          }

          // Output state
          if(StatusItemType === 6){
            const Output = (Data[++i] << 8) + Data[++i];
            const OutputPater = Data[++i];
          }

          // Panel System status
          if(StatusItemType === 10){
            // got panel status
            const option = Data[i++];
            const PStatus = (Data[++i] << 8) + Data[++i];
            const Event = (Data[++i] << 8) + Data[++i];
          }

          // Read extended point status notification
          if(StatusItemType === 12){
            const PointNumber = (Data[++i] << 8) + Data[++i];
            const PointStatus = Data[++i];
            const AreaNumber = (Data[++i] << 8) + Data[++i];
            const Bypassable = Data[++i];
            const PointCode = Data[++i];
            const Condition = (Data[++i] << 16) + (Data[++i] << 8) + Data[++i];

            //Get Area Index
            const AreaIndex = this.GetAreaIndexFromNumber(AreaNumber);
            const PointIndex = this.GetPointIndexFromNumber(AreaIndex, PointNumber);
            this.AreaArray[AreaIndex].PointArray[PointIndex].UpdatePoint(PointStatus, (Bypassable !== 0), PointCode, Condition);
            this.emit('PointStatusChange', this.AreaArray[AreaIndex].PointArray[PointIndex]);
          }
        }
      }
      return;
    }

    Connect(){
      this.SendMode2WhatAreYou();
    }

    GetArea(Areanumber: number){
      for(let i = 0 ; i < this.AreaArray.length ; i++){
        if(this.AreaArray[i].AreaNumber === Areanumber){
          return this.AreaArray[i];
        }
      }
      return null;
    }

    private GetAreaIndexFromNumber(AreaNumber: number){
      for(let i = 0; i < this.AreaArray.length ; i++){
        if(this.AreaArray[i].AreaNumber === AreaNumber){
          return i;
        }
      }
      return -1;
    }

    private GetPointIndexFromNumber(AreaIndex: number, PointNumber:number){

      const PointArray = this.AreaArray[AreaIndex].PointArray;

      for(let i = 0; i < PointArray.length ; i++){
        if(PointArray[i].PointNumber === PointNumber){
          return i;
        }
      }
      return -1;
    }

    GetAreaIndex(AreaNumber: number){
      for(let i = 0 ; i < this.AreaArray.length ; i++){
        if(this.AreaArray[i].AreaNumber === AreaNumber){
          return i;
        }
      }
      return -1;
    }

    GetPoint(PointNumber: number){
      for(let i = 0 ; i < this.AreaArray.length ; i++){
        for(let j = 0 ; j < this.AreaArray[i].PointArray.length;j++){
          if(this.AreaArray[i].PointArray[j].PointNumber === PointNumber){
            return this.AreaArray[i].PointArray[j];
          }
        }

      }
      return null;
    }

    SendTerminateSession(){
      this.CurrentControllerState = BGControllerState.TerminatingConnection;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x05]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);
      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    private ReadTerminateSession(Data: Buffer){
      this.CurrentControllerState = BGControllerState.Idle;
    }

    // Function SendMode2Passcode
    // Authentificate with panel
    // Command Format 1
    // Supported in protocol version 1.12
    //
    private SendMode2Passcode(){
      this.CurrentControllerState = BGControllerState.GetPanelMode2Passcode;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x06]);
      const CommandFormat = new Uint8Array([]);

      if(this.Passcode.length < 6 || this.Passcode.length > 24){
        this.emit('ControllerError', BGControllerError.PasscodeLengthError, 'Invalid Passcode Length');
        return;
      }

      const UserTypeArray = new Uint8Array([this.UserType]);
      const T = new this.Util.TextEncoder();

      let PasscodeArray = new Uint8Array([]);
      if(this.Passcode.length < 24){
        PasscodeArray = T.encode(this.Passcode + ' ');
      } else{
        PasscodeArray = T.encode(this.Passcode);
      }

      const Data = new Uint8Array(UserTypeArray.length + PasscodeArray.length);
      Data.set(UserTypeArray, 0);
      Data.set(PasscodeArray, UserTypeArray.length);
      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2Passcode
    // Authentificate with panel
    // Command Format 1
    // Supported in protocol version 1.12
    //
    private ReadMode2Passcode(Data: Buffer){
      const Authorized = Data[2];

      switch(Authorized){
        case 0:{
          this.emit('ControllerError', BGControllerError.UserNotAuthentificated, 'Invalid App Passcode');
          break;
        }

        case 1:{
          this.SendMode2ReqPanelCapacitie();
          break;
        }

        case 2:{
          this.emit('ControllerError', BGControllerError.PanelBusy, 'Panel is busy, cannot accept new connection');
          break;
        }
      }
    }

    // Function SendMode2ReqConfiguredAreas
    // Return all configured areas the user has authority over in the panel,
    // Supported in protocol version 1.14
    //
    private SendMode2ReqConfiguredAreas(){
      this.CurrentControllerState = BGControllerState.GetPanelConfiguredAreas;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x24]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);
      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2ReqConfiguredAreas
    // Return all configured areas the user has authority over in the panel,
    // Supported in protocol version 1.14
    //
    private ReadMode2ReqConfiguredAreas(Data:Buffer){
      const BitMaskArray = new Uint8Array([0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]);
      const ActiveAreaMaskArray = Data.slice(2, Data.length);


      if(ActiveAreaMaskArray.length > 16){
        this.emit('ControllerError', BGControllerError.MaxAreaNumberError,
          'This controller ony support ' + this.ControllerMaxAreas + ' areas');
        return;
      }

      for (let i = 0; i < ActiveAreaMaskArray.length ; i++) {
        const ActiveAreaMask = ActiveAreaMaskArray[i];

        for(let j = 0; j < 8; j++){
          const AreaNumer = (i*8)+j+1;

          if(AreaNumer > this.MaxAreas){
            break;
          }

          if(ActiveAreaMask & BitMaskArray[j]){
            const Area = new BGArea(AreaNumer);
            this.AreaArray.push(Area);
          }
        }
      }

      this.SendMode2ReqAreaText(0);
    }

    // SendMode2ReqPanelCapacitie
    // This command returns basic capacity of the panel.
    // Supported in protocol version 1.23
    //
    private SendMode2ReqPanelCapacitie(){
      this.CurrentControllerState = BGControllerState.GetPanelMode2Capacitie;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x1F]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);
      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // ReadMode2ReqPanelCapacitie
    // This command returns basic capacity of the panel.
    // Supported in protocol version 1.23
    //
    private ReadMode2ReqPanelCapacitie(Data: Buffer){
      this.MaxAreas = (Data[3] * 255) + Data[4];
      this.MaxPoints = (Data[5] * 255) + Data[6];
      this.MaxOutputs = (Data[7] * 255) + Data[8];
      this.MaxUsers = (Data[9] * 255) + Data[10];
      this.MaxKeypads = Data[11];
      this.MaxDoors = Data[12];

      this.SendMode2ReqConfiguredAreas();
    }

    // Function SendModeWhatAreYou
    // Return information about the panel
    // Command Format 1
    // Supported in Protocol Version 1.14
    //
    private SendMode2WhatAreYou(){
      this.CurrentControllerState = BGControllerState.GetPanelMode2WhatAreYou;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x01]);
      const CommandFormat = new Uint8Array([0x01]);
      const Data = new Uint8Array([]);
      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadModeWhatAreYou
    // Return information about the panel
    // Command Format 1
    // Supported in Protocol Version 1.14
    //
    private ReadMode2WhatAreYou(Data: Buffer){
      this.PanelType = Data[2];
      this.PanelRPSProtocolVersion = new BGProtocolVersion(Data[3], Data[4], Data[5] + 255 * Data[6]);
      this.PanelIntrusionIntegrationProtocolVersion = new BGProtocolVersion(Data[7], Data[8], Data[9] + 255 * Data[10]);
      this.PanelExecuteProtocolVersion = new BGProtocolVersion(Data[11], Data[12], Data[13] + 255 * Data[14]);

      this.PanelBusyFlag = false;
      if(Data[15] === MaxConnectionsInUseFlags.MaxUserBasedRemoteAccessUsersInUse){
        this.PanelBusyFlag = true;
        this.emit('ControllerError', BGControllerError.PanelBusy, 'Max User Based Remote Access Users In Use');
      }

      if(Data[15] === MaxConnectionsInUseFlags.MaxAutomationUsersInUse){
        this.PanelBusyFlag = true;
        this.emit('ControllerError', BGControllerError.PanelBusy, 'Max Automation Users In Use');
      }
    }

    // Function SendMode2ReqAreaText
    // This command retrieves area text for the specified area
    // Supported in protocol version 1.23
    //
    SendMode2ReqAreaText(LastAreaRead: number){
      this.CurrentControllerState = BGControllerState.GetPanelMode2ReqAreaText;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x29]);
      const CommandFormat = new Uint8Array([]);

      const High = (LastAreaRead >> 8) & 0xFF;
      const Low = LastAreaRead & 0xFF;

      const Data = new Uint8Array([High, Low, 0, 1]);


      // Work untin number of max area is bigger than 255
      //const Data = new Uint8Array([0, this.AreaArray[this.AreaReadingIndex].AreaNumber, 0]);
      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2ReqAreaText
    // This command retrieves area text for the specified area
    // Supported in protocol version 1.23
    //
    ReadMode2ReqAreaText(Data: Buffer){

      const DataLength = Data[0];

      // No more data to be read, all point text has been received from panel
      if(DataLength <= 1){
        this.SendMode2ReqPointsInArea();
        return;
      }

      let i = 1;
      while(i < DataLength){
        const AreaNumber = (Data[++i] << 8) + Data[++i];
        let AreaText = '';

        while(i < DataLength){
          const Read = Data[++i];
          if(Read !== 0){
            AreaText += String.fromCharCode(Read);
          } else{

            // read a zero: done reading text
            const Area = this.GetArea(AreaNumber);
            if(Area){
              Area.AreaText = AreaText;
            }

            if(i === DataLength){
              this.SendMode2ReqAreaText(AreaNumber);
              return;
            }
            break;
          }
        }
      }
    }

    // Function SendMode2ReqPointsInArea
    // This returns a mask of all configured points in an area that the user has authority over
    // Supported in protocol version 1.23
    //
    private SendMode2ReqPointsInArea(){
      this.CurrentControllerState = BGControllerState.GetPanelMode2ReqPointsInArea;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x36]);
      const CommandFormat = new Uint8Array([]);

      // Work untin number of max area is bigger than 255
      const Data = new Uint8Array([0, this.AreaArray[this.AreaReadingIndex].AreaNumber]);
      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2ReqPointsInArea
    // This returns a mask of all configured points in an area that the user has authority over
    // Supported in protocol version 1.23
    //
    private ReadMode2ReqPointsInArea(Data: Buffer){
      const BitMaskArray = new Uint8Array([0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]);
      const ActivePointMaskArray = Data.slice(2, Data.length);

      for (let i = 0; i < ActivePointMaskArray.length ; i++) {
        const ActiveAreaMask = ActivePointMaskArray[i];

        for(let j = 0; j < 8; j++){
          const PointNumber = (i*8)+j+1;

          if(PointNumber > this.MaxPoints){
            break;
          }

          if(ActiveAreaMask & BitMaskArray[j]){
            const p = new BGPoint(PointNumber);
            this.AreaArray[this.AreaReadingIndex].PointArray.push(p);
          }
        }
      }

      if(this.AreaReadingIndex < this.AreaArray.length-1){
        this.AreaReadingIndex = this.AreaReadingIndex + 1;
        this.SendMode2ReqPointsInArea();
      } else{
        this.AreaReadingIndex = 0;
        this.SendMode2ReqPointText(0);
      }
    }

    // Function SendMode2ReqPointText()
    // Returns the text for multiple points
    // Supported in Protocol Version 2.5
    // Command option 1
    //
    SendMode2ReqPointText(LastPointRead: number){
      this.CurrentControllerState = BGControllerState.GetPanelMode2ReqPointText;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x3C]);
      const CommandFormat = new Uint8Array([]);

      const High = (LastPointRead >> 8) & 0xFF;
      const Low = LastPointRead & 0xFF;

      const Data = new Uint8Array([High, Low, 0, 1]);
      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2ReqPointText()
    // Returns the text for multiple points
    // Supported in Protocol Version 2.5
    // Command option 1
    //
    ReadMode2ReqPointText(Data: Buffer){

      const DataLength = Data[0];

      // No more data to be read, all point text has been received from panel
      if(DataLength <= 1){
        this.emit('PanelReadyForOperation', true);
        return;
      }

      let i = 1;
      while(i < DataLength){
        const PointNumber = (Data[++i] << 8) + Data[++i];
        let PointText = '';

        while(i < DataLength){
          const Read = Data[++i];
          if(Read !== 0){
            PointText += String.fromCharCode(Read);
          } else{

            // read a zero: done reading text
            const Point = this.GetPoint(PointNumber);
            if(Point){
              Point.PointText = PointText;
            }

            if(i === DataLength){
              this.SendMode2ReqPointText(PointNumber);
              return;
            }
            break;
          }
        }
      }
    }

    private SendMode2ReqAreaStatus(){
      // Command Format 2
      const MaxAreaNumberPerRequest = 40;

      this.CurrentControllerState = BGControllerState.GetPanelMode2ReqAreaStatus;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x26]);
      const CommandFormat = new Uint8Array([0x01]);

      let Data = new Uint8Array([]);
      const MaxBound = Math.min(this.AreaArray.length, MaxAreaNumberPerRequest);

      for(let i = 0; i < MaxBound ; i++){
        const AreaIndex = (this.AreaReadingIndex * MaxAreaNumberPerRequest) + i;
        const AreaNumber = this.AreaArray[AreaIndex].AreaNumber;

        const AHigh = (AreaNumber >> 8) & 0xFF;
        const ALow = AreaNumber & 0xFF;

        const temp = new Uint8Array(Data.length + 2);
        temp.set(Data);
        temp.set([AHigh, ALow], Data.length);
        Data = temp;
      }

      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    private ReadMode2ReqAreaStatus(Data:Buffer){

      const MaxAreaNumberPerRequest = 40;
      const length = Data[0];
      const it = (length - 1) /5;

      for(let i = 0; i<it ; i++){
        //let index = (this.AreaReadingIndex * MaxAreaNumberPerRequest) + i;
        const AreaNumberHigh = Data[(i*5) + 2];
        const AreaNumberLow = Data[(i*5) + 3];

        const AreaNumber = (AreaNumberHigh << 8) + AreaNumberLow;
        const Area = this.GetArea(AreaNumber);
        if(Area){
          Area.AreaStatus = Data[(i*5) + 4];

          const AlarmAnnunciationPriorityHigh = Data[(i*5) + 5];
          const AlarmAnnunciationPriorityLow = Data[(i*5) + 6];
          const AlarmAnnunciationPriority = (AlarmAnnunciationPriorityHigh << 8) + AlarmAnnunciationPriorityLow;
          Area.SetAlarm(AlarmAnnunciationPriority);

          console.log('Area' + Area.AreaNumber+ ': Status: ' + BGAreaStatus[Area.AreaStatus]);
          console.log(' Fire: ' + BGAlarmType[Area.FireAlarm]);
          console.log(' Gaz: ' + BGAlarmType[Area.GazAlarm]);
          console.log(' Personnal: ' + BGAlarmType[Area.PersonnalAlarm]);
          console.log(' Burglary: ' + BGAlarmType[Area.BurglaryAlarm]);
        }
      }

      this.AreaReadingIndex = this.AreaReadingIndex + 1;
      if(this.AreaReadingIndex * MaxAreaNumberPerRequest <= this.AreaArray.length-1){
        this.SendMode2ReqAreaStatus();
      } else{
        // Done reading all area status
        this.CurrentControllerState = BGControllerState.Idle;
        this.AreaReadingIndex = 0;
        //this.SendMode2ReqOutputStatus();
        this.emit('PanelReadyForOperation', true);
      }
    }

    SendMode2ArmPanelAreas(AreaToArm: number[], ArmingType: BGArmingType ){
      this.CurrentControllerState = BGControllerState.GetPanelMode2ArmPanelAreas;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x27]);
      const CommandFormat = new Uint8Array([ArmingType]);

      let TotalAreaMask = new Uint8Array([]);

      // Maximum of 128 zones
      // 16 bytes maximum
      for(let i = 0 ; i < Math.ceil(this.MaxAreas/8) ; i++){

        let LocalAreaMask = 0;

        // For every byte:
        // bit 7 = area n
        // bit 6 = area n+1
        // bit 5 = area n+2
        // bit 4 = area n+3
        // bit 3 = area n+4
        // bit 2 = area n+5
        // bit 1 = area n+6
        // bit 0 = area n+7
        for(let k = 1 ; k <= 8 ; k ++){
          for(let j = 0 ; j < AreaToArm.length ; j++){
            if(AreaToArm[j] === ((i*8)+k)){
              LocalAreaMask = LocalAreaMask + Math.pow(2, 8-k);
            }
          }
        }

        const temp = new Uint8Array(TotalAreaMask.length + 1);
        temp.set(TotalAreaMask);
        temp.set([LocalAreaMask], TotalAreaMask.length);
        TotalAreaMask = temp;
      }

      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, TotalAreaMask));
    }

    ReadMode2ArmPanelAreas(Data:Buffer){
      return;
    }


    SendMode2ReqOutputStatus(){
      this.CurrentControllerState = BGControllerState.GetPanelMode2ReqOutputStatus;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x31]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);
      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    ReadMode2ReqOutputStatus(Data:Buffer){
      return;
    }

    // Function SendMode2SetSubscriptions()
    // This command requests a list of subscriptions to asynchronous panel status messages
    // Supported in Protocol Version 5.207
    // Command Format 3
    //
    SendMode2SetSubscriptions(){

      this.CurrentControllerState = BGControllerState.Mode2SetSubscriptions;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x5F]);
      const CommandFormat = new Uint8Array([0x03]);

      const ConfidenceMsg = new Uint8Array([0x01]);
      const EventMem = new Uint8Array([0x00]);
      const EventLog = new Uint8Array([0x00]);
      const ConfigChange = new Uint8Array([0x00]);
      const AreaOnOff = new Uint8Array([0x01]);
      const AreaReady = new Uint8Array([0x01]);
      const OutputState = new Uint8Array([0x01]);
      const PointState = new Uint8Array([0x00]);
      const DoorState = new Uint8Array([0x00]);     // Dont change
      const WalkTestType = new Uint8Array([0x00]);  // Dont change
      const RequestPanelSystem = new Uint8Array([0x01]);
      const WirelessLeanModeState = new Uint8Array([0x00]);
      const PoinExtendedState = new Uint8Array([0x01]);

      const Data = new Uint8Array([ConfidenceMsg[0], EventMem[0], EventLog[0],
        ConfigChange[0], AreaOnOff[0], AreaReady[0], OutputState[0], PointState[0], DoorState[0], WalkTestType[0],
        RequestPanelSystem[0], WirelessLeanModeState[0], PoinExtendedState[0]]);
      this.Socket.write(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2SetSubscriptions()
    // This command requests a list of subscriptions to asynchronous panel status messages
    // Supported in Protocol Version 5.207
    // Command Format 3
    //
    private ReadMode2SetSubscriptions(Data: Buffer){
      this.CurrentControllerState = BGControllerState.Idle;
    }

    private FormatCommand(Protocol:Uint8Array, Command:Uint8Array, CommandFormat: Uint8Array, Data: Uint8Array){

      if(Protocol.length !== 1){
        this.emit('ControllerError', BGControllerError.InvalidProtocolLength, '');
        return new Uint8Array();
      }

      if(Command.length !== 1){
        this.emit('ControllerError', BGControllerError.InvalidCommandLength, '');
        return new Uint8Array();
      }

      if(CommandFormat.length > 1){
        this.emit('ControllerError', BGControllerError.InvalidCommandFormatLength, '');
        return new Uint8Array();
      }

      let offset = 0;
      const Length = new Uint8Array([Command.length + CommandFormat.length + Data.length]);
      const Request = new Uint8Array(Protocol.length + Length.length + Command.length + CommandFormat.length + Data.length);
      Request.set(Protocol, offset);
      Request.set(Length, offset += Protocol.length);
      Request.set(Command, offset += Length.length);
      Request.set(CommandFormat, offset += Command.length);
      Request.set(Data, offset += CommandFormat.length);

      if(Request.length > this.ControllerMaxCommandBytes){
        this.emit('ControllerError', BGControllerError.CommandLengthOverflow, '');
        return new Uint8Array();
      }

      return Request;
    }
}