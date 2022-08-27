import { BGPoint } from './BGPoint';
import { BGOutput } from './BGOutput';
import { BGArmingType, BGArea } from './BGArea';
import { BGProtocolVersion } from './BGProtocolVersion';
import { TypedEmitter } from 'tiny-typed-emitter';
import tls = require('tls');
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
  MaxAreaNumberError = 'Number of configured areas over controller maximum area number',
  MaxOutputNumberError = 'Number of configured outputs over controller maximum output number',
  ConnectionError = 'Control Panel Connection Error'
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

export enum BGAlarmPriority{
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
  TechnicalGasFault =19
}

export interface BoschControllerMode2Event {
  'PanelReadyForOperation': (PanelReady: boolean) => void;
  'PanelReceivingNotifiation': (PanelReceivingNotification:boolean) => void;
  'ControllerError': (Error: BGControllerError, ErrorString: string) => void;
  'PointStatusChange': (Point: BGPoint) => void;
  'AreaReadyStateChange':(Area: BGArea) => void;
  'AreaOnOffStateChange':(Area: BGArea) => void;
  'AreaAlarmStateChange':(Area: BGArea) => void;
  'OutputStateChange':(Output: BGOutput) => void;
  'ConfidenceMessage':() => void;
}

export class BGController extends TypedEmitter<BoschControllerMode2Event> {
    Util = require('util');

    private Host: string;
    private Port: number;
    private SecureSocket:tls.TLSSocket;
    private Socket: net.Socket;
    private SocktetTimeout = 180000;

    private UserType: BGUserType;
    private Passcode: string;
    private MinPasscodeLength = 6;
    private MaxPassCodeLength = 24;

    // Bosch Protocol related variables
    readonly BoschMaxAreas = 128;
    readonly BoschMaxPointInArea = 600;
    readonly BoschMaxOutput = 600;
    readonly BoschMaxCommandBytes = 236;
    readonly BoschMaxNotificationMessageBytes = 480;

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

    // Protocol 0x01 Command Queue variables
    private ProtocolCommandQueue_0x01:Uint8Array[] = [];
    private WaitingProtocolResponse_0x01 = false;

    private Areas:Record<number, BGArea> = {};
    private Outputs:Record<number, BGOutput> = {};
    private Points:Record<number, BGPoint> = {};

    private PanelReadyForOperation = false;
    private PanelReceivingNotifcation = false;

    constructor(Host: string, Port:number, UserType: BGUserType, Passcode: string) {
      super();
      this.Host = Host;
      this.Port = Port;
      this.Passcode = Passcode;
      this.UserType = UserType;
      this.Socket = new net.Socket();
      this.SecureSocket = new tls.TLSSocket(this.Socket, {rejectUnauthorized: false});
    }

    Connect(){
      this.Outputs = {};
      this.Areas = {};
      this.Points = {};

      this.PanelReadyForOperation = false;
      this.PanelReceivingNotifcation = false;

      this.Socket = new net.Socket();
      this.Socket.setTimeout(this.SocktetTimeout);
      this.SecureSocket = new tls.TLSSocket(this.Socket, {rejectUnauthorized: false});

      this.Socket.on('timeout', ()=>{
        this.PanelReadyForOperation = false;
        this.PanelReceivingNotifcation = false;
        this.emit('PanelReceivingNotifiation', this.PanelReceivingNotifcation);
        this.Socket.destroy();
        this.emit('ControllerError', BGControllerError.ConnectionError, 'Timeout');
      });

      this.Socket.on('error', (error: Error) => {
        this.PanelReadyForOperation = false;
        this.PanelReceivingNotifcation = false;
        this.emit('PanelReceivingNotifiation', this.PanelReceivingNotifcation);
        this.Socket.destroy();
        this.emit('ControllerError', BGControllerError.ConnectionError, error.message);
      });

      this.SecureSocket.on('data', (data: Buffer) => {
        const Protocol = data[0];
        const Data = data.slice(1, data.length);

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

      // Initial connection to Panel
      this.Socket.connect(this.Port, this.Host, () => {
        this.SendMode2WhatAreYou();
      });
    }

    GetAreas(){
      return this.Areas;
    }

    GetPoints(){
      return this.Points;
    }

    GetOutputs(){
      return this.Outputs;
    }

    SetOutputState(OutputNumer: number, State:boolean){
      this.SendMode2SetOutputState(OutputNumer, State);
      return;
    }


    private QueueProtocolCommand_0x01(Command:Uint8Array, AllowDuplicate:boolean){

      if(!AllowDuplicate){
        for(let i = 0 ; i < this.ProtocolCommandQueue_0x01.length ; i ++){
          const iCommand = this.ProtocolCommandQueue_0x01[i];

          if(iCommand.length !== Command.length){
            continue;
          }

          let FoundDuplicate = true;
          for(let j = 0 ; j < Command.length; j++){
            FoundDuplicate = FoundDuplicate && (Command[j] === iCommand[j]);
            if(FoundDuplicate){
              return;
            }
          }
        }
      }

      this.ProtocolCommandQueue_0x01.push(Command);

      if(!this.WaitingProtocolResponse_0x01){
        this.SendProtocolCommand_0x01();
      }
    }

    private SendProtocolCommand_0x01(){

      if(this.ProtocolCommandQueue_0x01.length === 0){
        this.WaitingProtocolResponse_0x01 = false;
        return;
      }

      this.WaitingProtocolResponse_0x01 = true;
      this.SecureSocket.write(this.ProtocolCommandQueue_0x01[0]);
    }

    private ReadProtocolMessage_0x01(Data: Buffer){

      const LastCommand = this.ProtocolCommandQueue_0x01[0][2];
      const LastQueue = this.ProtocolCommandQueue_0x01[0];
      const Response = Data[1];

      // Clear Command Queue
      this.ProtocolCommandQueue_0x01.shift();

      if(Data.length < 2 || Data.length > this.BoschMaxCommandBytes){
        this.emit('ControllerError', BGControllerError.ResponseLengthOverflow, '');
        return;
      }

      if(Data[0] !== Data.length - 1){
        this.emit('ControllerError', BGControllerError.InvalidResponseLength, '');
        return;
      }

      switch (LastCommand) {
        case 0x01: // Mode2WhatAreYou
          if(Response === 0xFE){
            this.ReadMode2WhatAreYou(Data);
            this.SendMode2Passcode();
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2WhatAreYou: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2WhatAreYou: ' + Data);
            }
          }
          break;

        case 0x05: // SendTerminateSession;
          if(Response === 0xFC){
            this.ReadTerminateSession();
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'SendTerminateSession: '
              + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'SendTerminateSession: ' + Data);
            }
          }
          break;

        case 0x06: // Mode2Passcode
          if(Response === 0xFE){
            this.ReadMode2Passcode(Data);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2Passcode: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2Passcode: ' + Data);
            }
          }
          break;

        case 0x1F: // Mode2Capacitie
          if(Response === 0xFE){
            this.ReadMode2ReqPanelCapacitie(Data);
            this.SendMode2ReqConfiguredAreas();
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2Capacitie: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2Capacitie: ' + Data);
            }
          }
          break;

        case 0x24: // PanelConfiguredAreas
          if(Response === 0xFE){
            this.ReadMode2ReqConfiguredAreas(Data);
            this.SendMode2ReqPointsInArea();
            this.SendMode2ReqConfiguredOutputs();
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'PanelConfiguredAreas: '
              + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'PanelConfiguredAreas: ' + Data);
            }
          }
          break;

        case 0x26: // Mode2ReqAreaStatus
          if(Response === 0xFE){
            this.ReadMode2ReqAreaStatus(Data);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ReqAreaStatus: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ReqAreaStatus: ' + Data);
            }
          }
          break;

        case 0x27: // Mode2ArmPanelAreas
          if(Response === 0xFC){
            this.ReadMode2ArmPanelAreas();
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ArmPanelAreas: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ArmPanelAreas: ' + Data);
            }
          }
          break;

        case 0x29: // Mode2ReqAreaText
          if(Response === 0xFE){
            this.ReadMode2ReqAreaText(Data);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ReqAreaText: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ReqAreaText: ' + Data);
            }
          }
          break;

        case 0x36: // GetPanelMode2ReqPointsInArea
          if(Response === 0xFE){
            this.ReadMode2ReqPointsInArea(Data, LastQueue[4]);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'GetPanelMode2ReqPointsInArea: '
              + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'GetPanelMode2ReqPointsInArea: ' + Data);
            }
          }
          break;

        case 0x3C: // Mode2ReqPointText
          if(Response === 0xFE){
            this.ReadMode2ReqPointText(Data);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ReqPointText: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ReqPointText: ' + Data);
            }
          }
          break;

        case 0x30: // Mode2ReqConfiguredOutputs
          if(Response === 0xFE){
            this.ReadMode2ReqConfiguredOutputs(Data);
            this.SendMode2ReqAreaText(0);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ReqConfiguredOutputs: '
              + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ReqConfiguredOutputs: ' + Data);
            }
          }
          break;

        case 0x32: // Mode2SetOutputState
          if(Response === 0xFC){
            this.ReadMode2SetOutputState();
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2SetOutputState:' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2SetOutputState:' + Data);
            }
          }
          break;

        case 0x33: // Mode2ReqOutputText
          if(Response === 0xFE){
            this.ReadMode2ReqOutputText(Data);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ReqOutputText: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ReqOutputText: ' + Data);
            }
          }
          break;

        case 0x5F: // Mode2SetSubscriptions
          if(Response === 0xFC){
            this.ReadMode2SetSubscriptions();
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2SetSubscriptions:'
              + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2SetSubscriptions:' + Data);
            }
          }
          break;

        default:
          break;
      }
      this.SendProtocolCommand_0x01();
    }

    private ReadProtocolMessage_0x02(Data: Buffer){

      if(Data.length < 2 || Data.length > (this.BoschMaxNotificationMessageBytes - 2)){
        this.emit('ControllerError', BGControllerError.NotificationLengthOverflow, Data.toString());
        return;
      }

      // Data length over 2 bytes
      const NotificationLength = (Data[0] << 8) + Data[1];

      if(NotificationLength !== Data.length-2){
        this.emit('ControllerError', BGControllerError.InvalidNotificationLength, Data.toString());
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

          // Event Summary State Entry
          if(StatusItemType === 1){
            let Priority = Data[++i];
            Priority = Priority + 0;
            let AlarmCount = (Data[++i] << 8) + Data[++i];
            AlarmCount = AlarmCount + 0;
            this.SendMode2ReqAreaStatus();
          }

          // Area On Off Sate
          if(StatusItemType === 4){
            const AreaNumber = (Data[++i] << 8) + Data[++i];
            const AreaStatus = Data[++i];
            const Area = this.Areas[AreaNumber];
            Area.SetAreaStatus(AreaStatus);
            this.emit('AreaOnOffStateChange', Area);
          }

          // Area ready state
          if(StatusItemType === 5){
            const AreaNumber = (Data[++i] << 8) + Data[++i];
            const AreaReadyState = Data[++i];
            const Fault = (Data[++i] << 8) + Data[++i];

            const Area = this.Areas[AreaNumber];
            if(AreaReadyState === 0){
              Area.SetAreaReadyState(false, false, Fault);
            }

            if(AreaReadyState === 1){
              Area.SetAreaReadyState(false, true, Fault);
            }

            if(AreaReadyState === 2){
              Area.SetAreaReadyState(true, true, Fault);
            }

            this.emit('AreaReadyStateChange', Area);
          }

          // Output state
          if(StatusItemType === 6){
            const OutputNumber = (Data[++i] << 8) + Data[++i];
            const OutputPatern = Data[++i];

            const Output = this.Outputs[OutputNumber];
            if(OutputPatern === 0){
              Output.OutputState = false;
            } else{
              Output.OutputState = true;
            }
            this.emit('OutputStateChange', Output);
          }

          // Panel System status
          if(StatusItemType === 10){
            let option = Data[i++];
            option = option + 0;
            let PStatus = (Data[++i] << 8) + Data[++i];
            PStatus = PStatus + 0;
            let Event = (Data[++i] << 8) + Data[++i];
            Event = Event + 0;
          }

          // Read extended point status notification
          if(StatusItemType === 12){
            const PointNumber = (Data[++i] << 8) + Data[++i];
            const PointStatus = Data[++i];
            let AreaNumber = (Data[++i] << 8) + Data[++i];
            AreaNumber = AreaNumber + 0;
            const Bypassable = Data[++i];
            const PointCode = Data[++i];
            const Condition = (Data[++i] << 16) + (Data[++i] << 8) + Data[++i];

            const Point = this.Points[PointNumber];
            Point.UpdatePoint(PointStatus, (Bypassable !== 0), PointCode, Condition);
            this.emit('PointStatusChange', Point);
          }
        }
      }
      return;
    }

    SendTerminateSession(){
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x05]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
    }

    private ReadTerminateSession(){
      return;
    }

    // Function SendMode2Passcode
    // Authentificate with panel
    // Command Format 1
    // Supported in protocol version 1.12
    //
    private SendMode2Passcode(){
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
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
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
          this.emit('ControllerError', BGControllerError.UserNotAuthentificated, 'Mode2Passcode: Invalid App Passcode');
          break;
        }

        case 1:{
          this.SendMode2ReqPanelCapacitie();
          break;
        }

        case 2:{
          this.emit('ControllerError', BGControllerError.PanelBusy, 'Mode2Passcode: Panel is busy, cannot accept new connection');
          break;
        }
      }
    }

    // Function SendMode2ReqConfiguredAreas
    // Return all configured areas the user has authority over in the panel,
    // Supported in protocol version 1.14
    //
    private SendMode2ReqConfiguredAreas(){
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x24]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
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
          'This controller ony support ' + this.BoschMaxAreas + ' areas');
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
            this.Areas[AreaNumer] = new BGArea(AreaNumer);
          }
        }
      }
    }

    // SendMode2ReqPanelCapacitie
    // This command returns basic capacity of the panel.
    // Supported in protocol version 1.23
    //
    private SendMode2ReqPanelCapacitie(){
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x1F]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
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
    }

    // Function SendModeWhatAreYou
    // Return information about the panel
    // Command Format 1
    // Supported in Protocol Version 1.14
    //
    private SendMode2WhatAreYou(){
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x01]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
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
        this.emit('ControllerError', BGControllerError.PanelBusy, 'Mode2WhatAreYou: Max User Based Remote Access Users In Use');
      }

      if(Data[15] === MaxConnectionsInUseFlags.MaxAutomationUsersInUse){
        this.PanelBusyFlag = true;
        this.emit('ControllerError', BGControllerError.PanelBusy, 'Mode2WhatAreYou: Max Automation Users In Use');
      }
    }

    // Function SendMode2ReqAreaText
    // This command retrieves area text for the specified area
    // Supported in protocol version 1.23
    //
    SendMode2ReqAreaText(LastAreaRead: number){
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x29]);
      const CommandFormat = new Uint8Array([]);

      const High = (LastAreaRead >> 8) & 0xFF;
      const Low = LastAreaRead & 0xFF;

      const Data = new Uint8Array([High, Low, 0, 1]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
    }

    // Function ReadMode2ReqAreaText
    // This command retrieves area text for the specified area
    // Supported in protocol version 1.23
    //
    ReadMode2ReqAreaText(Data: Buffer){

      const DataLength = Data[0];

      // No more data to be read, all point text has been received from panel
      if(DataLength <= 1){
        this.SendMode2ReqPointText(0);
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
            const Area = this.Areas[AreaNumber];
            Area.AreaText = AreaText;

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
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x36]);
      const CommandFormat = new Uint8Array([]);

      for (const AreaNumber in this.Areas){
        const Data = new Uint8Array([0, Number(AreaNumber)]);
        this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
      }
    }

    // Function ReadMode2ReqPointsInArea
    // This returns a mask of all configured points in an area that the user has authority over
    // Supported in protocol version 1.23
    //
    private ReadMode2ReqPointsInArea(Data: Buffer, AreaNumber:number){
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
            this.Points[PointNumber] = new BGPoint(PointNumber, AreaNumber);
          }
        }
      }
    }

    // Function SendMode2ReqPointText()
    // Returns the text for multiple points
    // Supported in Protocol Version 2.5
    // Command option 1
    //
    SendMode2ReqPointText(LastPointRead: number){
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x3C]);
      const CommandFormat = new Uint8Array([]);

      const High = (LastPointRead >> 8) & 0xFF;
      const Low = LastPointRead & 0xFF;

      const Data = new Uint8Array([High, Low, 0, 1]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
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
        this.SendMode2ReqOutputText(0);
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
            const Point = this.Points[PointNumber];
            Point.PointText = PointText;

            if(i === DataLength){
              this.SendMode2ReqPointText(PointNumber);
              return;
            }
            break;
          }
        }
      }
    }

    // Function SendMode2ReqConfiguredOutputs()
    // Returns configured panel outputs
    // Supported in Protocol Version 1.14
    //
    private SendMode2ReqConfiguredOutputs(){
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x30]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
    }

    // Function ReadMode2ReqConfiguredOutputs()
    // Returns configured panel outputs
    // Supported in Protocol Version 1.14
    //
    private ReadMode2ReqConfiguredOutputs(Data:Buffer){
      const BitMaskArray = new Uint8Array([0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]);
      const ConfiguredOutputMaskArray = Data.slice(2, Data.length);

      if(ConfiguredOutputMaskArray.length * 8 > this.BoschMaxOutput){
        this.emit('ControllerError', BGControllerError.MaxOutputNumberError,
          'This controller ony support ' + this.BoschMaxOutput + ' outputs');
      }

      for(let i = 0 ; i < ConfiguredOutputMaskArray.length ; i++){
        for(let j = 0 ; j < 8 ; j++){
          if(ConfiguredOutputMaskArray[i] & BitMaskArray[j]){
            const OutputNumber = (i*8) + j + 1;
            this.Outputs[OutputNumber] = new BGOutput(OutputNumber);
          }
        }
      }
    }

    private SendMode2ReqOutputText(OutputNumber: number){
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x33]);
      const CommandFormat = new Uint8Array([]);
      const MSB = (OutputNumber >> 8) & 0xFF;
      const LSB = OutputNumber & 0xFF;
      const Data = new Uint8Array([MSB, LSB, 0, 1]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
    }

    private ReadMode2ReqOutputText(Data:Buffer){

      const DataLength = Data[0];

      // No more data to be read, all output text has been received from panel
      if(DataLength <= 1){
        if(!this.PanelReadyForOperation){
          this.PanelReadyForOperation = true;
          this.emit('PanelReadyForOperation', true);
        }
        return;
      }

      let i = 1;
      while(i < DataLength){
        const OutputNumber = (Data[++i] << 8) + Data[++i];
        let OutputText = '';

        while(i < DataLength){
          const Read = Data[++i];
          if(Read !== 0){
            OutputText += String.fromCharCode(Read);
          } else{

            // read a zero: done reading text
            const Output = this.Outputs[OutputNumber];
            Output.OutputText = OutputText;

            if(i === DataLength){
              this.SendMode2ReqOutputText(OutputNumber);
              return;
            }
            break;
          }
        }
      }
    }

    // Function SendMode2SetOutputState()
    // Set output state
    // Supported in Protocol Version 2.5
    //
    private SendMode2SetOutputState(OutputNumber: number, OutputState: boolean){

      // Check for valid Output
      // TODO

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x32]);
      const CommandFormat = new Uint8Array([]);

      const MSB = (OutputNumber >> 8) & 0xFF;
      const LSB = OutputNumber & 0xFF;

      let State = 0;
      if(OutputState){
        State = 1;
      }

      const Data = new Uint8Array([MSB, LSB, State]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
    }

    // Function ReadMode2SetOutputState()
    // Set output state
    // Supported in Protocol Version 2.5
    //
    private ReadMode2SetOutputState(){
      return;
    }


    private SendMode2ReqAreaStatus(){
      // Command Format 2

      // Max area per request
      // For the moment, biggest G panel has 32 area
      //const MaxAreaNumberPerRequest = 40;

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x26]);
      const CommandFormat = new Uint8Array([0x01]);

      let Data = new Uint8Array([]);

      for (const AreaNumber in this.Areas){
        const AHigh = (Number(AreaNumber) >> 8) & 0xFF;
        const ALow = Number(AreaNumber) & 0xFF;

        const temp = new Uint8Array(Data.length + 2);
        temp.set(Data);
        temp.set([AHigh, ALow], Data.length);
        Data = temp;
      }
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), false);
    }

    private ReadMode2ReqAreaStatus(Data:Buffer){

      const length = Data[0];
      const it = (length - 1) /5;

      for(let i = 0; i<it ; i++){
        const AreaNumberHigh = Data[(i*5) + 2];
        const AreaNumberLow = Data[(i*5) + 3];

        const AreaNumber = (AreaNumberHigh << 8) + AreaNumberLow;
        const Area = this.Areas[AreaNumber];
        Area.AreaStatus = Data[(i*5) + 4];

        const AlarmAnnunciationPriorityHigh = Data[(i*5) + 5];
        const AlarmAnnunciationPriorityLow = Data[(i*5) + 6];
        const AlarmAnnunciationPriority = (AlarmAnnunciationPriorityHigh << 8) + AlarmAnnunciationPriorityLow;
        Area.SetAlarm(AlarmAnnunciationPriority);
        if(this.PanelReceivingNotifcation){
          this.emit('AreaAlarmStateChange', Area);
        }
      }
    }

    SendMode2ArmPanelAreas(AreaToArm: number[], ArmingType: BGArmingType ){
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x27]);
      const CommandFormat = new Uint8Array([ArmingType]);

      let TotalAreaMask = new Uint8Array([]);

      // Maximum of 128 areas
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
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, TotalAreaMask), true);
    }

    ReadMode2ArmPanelAreas(){
      return;
    }

    // Function SendMode2SetSubscriptions()
    // This command requests a list of subscriptions to asynchronous panel status messages
    // Supported in Protocol Version 5.207
    // Command Format 3
    //
    SendMode2SetSubscriptions(){

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x5F]);
      const CommandFormat = new Uint8Array([0x03]);

      const ConfidenceMsg = new Uint8Array([0x01]);
      const EventMem = new Uint8Array([0x01]);
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

      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data), true);
    }

    // Function ReadMode2SetSubscriptions()
    // This command requests a list of subscriptions to asynchronous panel status messages
    // Supported in Protocol Version 5.207
    // Command Format 3
    //
    private ReadMode2SetSubscriptions(){
      this.PanelReceivingNotifcation = true;
      this.emit('PanelReceivingNotifiation', this.PanelReceivingNotifcation);
    }

    private FormatCommand(Protocol:Uint8Array, Command:Uint8Array, CommandFormat: Uint8Array, Data: Uint8Array){

      if(Protocol.length !== 1){
        this.emit('ControllerError', BGControllerError.InvalidProtocolLength, Protocol.toString());
        return new Uint8Array();
      }

      if(Command.length !== 1){
        this.emit('ControllerError', BGControllerError.InvalidCommandLength, Command.toString());
        return new Uint8Array();
      }

      if(CommandFormat.length > 1){
        this.emit('ControllerError', BGControllerError.InvalidCommandFormatLength, CommandFormat.toString());
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

      if(Request.length > this.BoschMaxCommandBytes){
        this.emit('ControllerError', BGControllerError.CommandLengthOverflow, Request.toString());
        return new Uint8Array();
      }

      return Request;
    }
}