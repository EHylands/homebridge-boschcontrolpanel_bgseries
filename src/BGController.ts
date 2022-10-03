import { BGPoint } from './BGPoint';
import { BGOutput } from './BGOutput';
import { BGArmingType, BGArea, BGAlarmPriority } from './BGArea';
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
  Noauthority = 0x06,
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
  InvalidProtocolVersion = 'Invalid Protocol Version',
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

    // Current Panel related variables
    PanelRPSProtocolVersion = new BGProtocolVersion(0, 0, 0);
    PanelExecuteProtocolVersion = new BGProtocolVersion(0, 0, 0);
    PanelIIPVersion = new BGProtocolVersion(0, 0, 0);
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

    // Legacy options
    private LowestAlarmPriority = -1;
    private InitialRun = true;
    private PoolInterval = 500;
    private ForleLegacyMode = false;
    LegacyMode = false;
    private EventDataLength = 0;

    constructor(Host: string, Port:number, UserType: BGUserType, Passcode: string, ForceLegacyMode:boolean) {
      super();
      this.Host = Host;
      this.Port = Port;
      this.Passcode = Passcode;
      this.ForleLegacyMode = ForceLegacyMode;
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
      this.InitialRun = true;
      this.LegacyMode = false;
      this.EventDataLength = 0;

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

          default:{
            this.emit('ControllerError', BGControllerError.InvalidProtocol,
              'Received unknown protocol number from panel');
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
      if(this.LegacyMode){
        this.SendMode2SetOutputState_CF01(OutputNumer, State);
      } else{
        this.SendMode2SetOutputState_CF02(OutputNumer, State);
      }
      return;
    }

    StartOperation(){
      if(this.LegacyMode){
        this.PoolPanel();
      } else{
        this.SendMode2SetSubscriptions();
      }
    }

    private PoolPanel(){
      this.SendMode2ReqPointsStatus();
      this.SendMode2ReqOutputStatus();
      this.SendMode2ReqAreaStatus_CF01();
      this.SendMode2ReqAlarmMemorySummary_CF01();
    }

    private QueueProtocolCommand_0x01(Command:Uint8Array){

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

            if(this.PanelType === BGPanelType.Solution2000 ||
              this.PanelType === BGPanelType.Solution3000 ||
              this.PanelType === BGPanelType.AMAX2100 ||
              this.PanelType === BGPanelType.AMAX3000 ||
              this.PanelType === BGPanelType.AMAX4000
            ){
              this.SendMode2LoginRSCUser();
            } else{
              this.SendMode2Passcode();
            }
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2WhatAreYou: '
              + BGNegativeAcknowledgement[Data[2]]);
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

        case 0x08: // Mode2ReqAlarmMemorySummary;
          if(Response === 0xFE){
            this.ReadMode2ReqAlarmMemorySummary_CF01(Data);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ReqAlarmMemorySummary: '
              + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ReqAlarmMemorySummary: '
              + Data);
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

        case 0x22: // Mode2ReqAlarmAreasByPriority_CF01
          if(Response === 0xFE){
            const AlarmPriority = LastQueue[3];
            this.ReadMode2ReqAlarmAreasByPriority_CF01(Data, AlarmPriority);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ReqAlarmAreasByPriority_CF01: '
              + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ReqAlarmAreasByPriority_CF01: ' + Data);
            }
          }
          break;

        case 0x23: // Mode2ReqAlarmMemoryDetail
          if(Response === 0xFE){
            this.ReadMode2ReqAlarmMemoryDetail_CF01(Data, LastQueue[3]);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ReqAlarmMemoryDetail: '
              + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ReqAlarmMemoryDetail: ' + Data);
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
            if(this.LegacyMode){
              this.ReadMode2ReqAreaStatus_CF01(Data);
            } else{
              this.ReadMode2ReqAreaStatus_CF02(Data);
            }
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError,
                'Mode2ReqAreaStatus_CF02: ' + BGNegativeAcknowledgement[Data[2]]);
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
            const LastArea = LastQueue[4];
            if(this.LegacyMode){
              this.ReadMode2ReqAreaText_CF01(Data, LastArea);
            } else{
              this.ReadMode2ReqAreaText_CF03(Data);
            }
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ReqAreaText: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ReqAreaText: ' + Data);
            }
          }
          break;

        case 0x31: // SendMode2ReqOutputStatus
          if(Response === 0xFE){
            this.ReadMode2ReqOutputStatus(Data);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'SendMode2ReqOutputStatus: '
              + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'SendMode2ReqOutputStatus: ' + Data);
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
            if(this.LegacyMode){
              const LastPoint = LastQueue[4];
              this.ReadMode2ReqPointText_CF01(Data, LastPoint);
            } else{
              this.ReadMode2ReqPointText_CF03(Data);
            }
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

            if(this.LegacyMode){
              this.SendMode2ReqAreaText_CF01();
              this.SendMode2ReqPointText_CF01();
              this.SendMode2ReqOutputText_CF01();
            } else{
              this.SendMode2ReqAreaText_CF03(0);
            }
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
            if(this.LegacyMode){
              this.ReadMode2SetOutputState_CF01();
            } else{
              this.ReadMode2SetOutputState_CF02();
            }
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

            if(this.LegacyMode){
              const LastOutput = LastQueue[3];
              this.ReadMode2ReqOutputText_CF01(Data, LastOutput);
            } else{
              this.ReadMode2ReqOutputText_CF03(Data);
            }
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError, 'Mode2ReqOutputText: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'Mode2ReqOutputText: ' + Data);
            }
          }
          break;


        case 0x38: //ReadMode2ReqPointsStatus
          if(Response === 0xFE){
            this.ReadMode2ReqPointsStatus(Data);
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError,
                'ReadMode2ReqPointsStatus: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'ReadMode2LoginRSCUser: ' + Data);
            }
          }
          break;

        case 0x3E: // ReadMode2LoginRSCUser
          if(Response === 0xFE){
            this.SendMode2ReqPanelCapacitie();
          }else{
            if(Response === 0xFD){
              this.emit('ControllerError', BGControllerError.BoschPanelError,
                'ReadMode2LoginRSCUser: ' + BGNegativeAcknowledgement[Data[2]]);
            } else{
              this.emit('ControllerError', BGControllerError.UndefinedError, 'ReadMode2LoginRSCUser: ' + Data);
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
            const AlarmPriority = Data[++i];
            const AlarmCount = (Data[++i] << 8) + Data[++i];

            if(AlarmCount === 0){
              for( const AreaNumber in this.Areas){
                const Area = this.Areas[AreaNumber];
                if(Area.RemoveAlarm(AlarmPriority)){
                  this.emit('AreaAlarmStateChange', Area);
                }
              }
            } else{
              this.SendMode2ReqAlarmAreasByPriority_CF01(AlarmPriority);
            }
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
            if(Output !== undefined){
              Output.OutputState = OutputPatern !== 0;
              this.emit('OutputStateChange', Output);
            }
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
            if(Point !== undefined){
              Point.UpdatePoint(PointStatus, (Bypassable !== 0), PointCode, Condition);
              this.emit('PointStatusChange', Point);
            }
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
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
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
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
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
          this.emit('ControllerError', BGControllerError.UserNotAuthentificated, 'Mode2Passcode: Invalid Automation Passcode');
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

    // Function SendMode2LoginRSCUser
    // User Based Remote Access Connection Only
    // Command Format 1
    // Supported in protocol version 1.14
    //
    private SendMode2LoginRSCUser(){

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2LoginRSCUser, Expecting IIP version >= ' + MinVersion.toSring());
      }

      // Check passcode length
      if(this.Passcode.length < 3 || this.Passcode.length > 8){
        this.emit('ControllerError', BGControllerError.PasscodeLengthError, 'Invalid Passcode Length');
        return;
      }

      // Check passcode
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x3E]);
      const CommandFormat = new Uint8Array([]);

      const PasscodeMSB1 = Number(this.Passcode[0]) << 4;
      const PasscodeMSB2 = Number(this.Passcode[1]);
      const PasscodeMSB = PasscodeMSB1 + PasscodeMSB2;

      const PasscodeBody1 = Number(this.Passcode[2]) << 4;

      let PasscodeBody2 = 0xF;
      if(this.Passcode.length >= 4){
        PasscodeBody2 = Number(this.Passcode[3]);
      }

      let PasscodeBody3 = 0xF;
      if(this.Passcode.length >= 5){
        PasscodeBody3 = Number(this.Passcode[4]);
      }
      PasscodeBody3 = PasscodeBody3 << 4;

      let PasscodeBody4 = 0xF;
      if(this.Passcode.length >= 6){
        PasscodeBody4 = Number(this.Passcode[5]);
      }

      let PasscodeLSB1 = 0xF;
      if(this.Passcode.length >= 7){
        PasscodeLSB1 = Number(this.Passcode[6]);
      }
      PasscodeLSB1 = PasscodeLSB1 << 4;

      let PasscodeLSB2 = 0xF;
      if(this.Passcode.length >= 8){
        PasscodeLSB2 = Number(this.Passcode[7]);
      }

      const PasscodeLSB = PasscodeLSB1 + PasscodeLSB2;
      const Data = new Uint8Array([PasscodeMSB, PasscodeBody1 + PasscodeBody2, PasscodeBody3+PasscodeBody4, PasscodeLSB]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2LoginRSCUser
    // User Based Remote Access Connection Only
    // Command Format 1
    // Supported in protocol version 1.14
    //
    private ReadMode2LoginRSCUser(){
      return;
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

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2LoginRSCUser, Expecting IIP version >= ' + MinVersion.toSring());
      }

      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
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

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 23, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPanelCapacitie, Expecting IIP version >= ' + MinVersion.toSring());
      }

      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // ReadMode2ReqPanelCapacitie
    // This command returns basic capacity of the panel.
    // Supported in protocol version 1.23
    //
    private ReadMode2ReqPanelCapacitie(Data: Buffer){
      this.MaxAreas = (Data[3] << 8) + Data[4];
      this.MaxPoints = (Data[5] << 8) + Data[6];
      this.MaxOutputs = (Data[7] << 8) + Data[8];
      this.MaxUsers = (Data[9] << 8) + Data[10];
      this.MaxKeypads = Data[11];
      this.MaxDoors = Data[12];
      this.EventDataLength = Data[13];
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
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadModeWhatAreYou
    // Return information about the panel
    // Command Format 1
    // Supported in Protocol Version 1.14
    //
    private ReadMode2WhatAreYou(Data: Buffer){
      this.PanelType = Data[2];
      this.PanelRPSProtocolVersion = new BGProtocolVersion(Data[3], Data[4], Data[5] + 255 * Data[6]);
      this.PanelIIPVersion = new BGProtocolVersion(Data[7], Data[8], Data[9] + 255 * Data[10]);
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

      if(this.PanelType ===BGPanelType.Solution2000 ||
        this.PanelType === BGPanelType.Solution3000 ||
        this.PanelType === BGPanelType.AMAX2100 ||
        this.PanelType === BGPanelType.AMAX3000 ||
        this.PanelType === BGPanelType.AMAX4000
      ){
        this.LegacyMode = true;
      }

      if(this.ForleLegacyMode){
        this.LegacyMode = true;
      }
    }

    // Function SendMode2ReqAreaText_CF01
    // This command retrieves area text for the specified area
    // Supported in protocol version 1.23
    //
    SendMode2ReqAreaText_CF01(){

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 23, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqAreaText_CF1, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x29]);
      const CommandFormat = new Uint8Array([]);

      for (const Area in this.Areas){
        const High = (Number(Area) >> 8) & 0xFF;
        const Low = Number(Area) & 0xFF;
        const Data = new Uint8Array([High, Low, 0]);
        this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
      }
    }

    // Function ReadMode2ReqAreaText_CF01
    // This command retrieves area text for the specified area
    // Supported in protocol version 1.23
    //
    ReadMode2ReqAreaText_CF01(Data: Buffer, AreaNumber: number){

      let i = 2;
      let AreaText = '';
      while(Data[i] !== 0x00){
        const Read = Data[i];
        AreaText += String.fromCharCode(Read);
        i++;
      }

      if(this.Areas[AreaNumber]!== undefined){
        this.Areas[AreaNumber].AreaText = AreaText;
      }

      return;
    }

    // Function SendMode2ReqAreaText
    // This command retrieves area text for the specified area
    // Supported in protocol version 2.5
    //
    SendMode2ReqAreaText_CF03(LastAreaRead: number){

      // Check min supported version
      const MinVersion = new BGProtocolVersion(2, 5, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPanelCapacitie, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x29]);
      const CommandFormat = new Uint8Array([]);

      const High = (LastAreaRead >> 8) & 0xFF;
      const Low = LastAreaRead & 0xFF;

      const Data = new Uint8Array([High, Low, 0, 1]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2ReqAreaText_CF03
    // This command retrieves area text for the specified area
    // Supported in protocol version 2.5
    //
    ReadMode2ReqAreaText_CF03(Data: Buffer){

      const DataLength = Data[0];

      // No more data to be read, all point text has been received from panel
      if(DataLength <= 1){
        this.SendMode2ReqPointText_CF03(0);
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
            if(Area !== undefined){
              Area.AreaText = AreaText;
            }

            if(i === DataLength){
              this.SendMode2ReqAreaText_CF03(AreaNumber);
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

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 23, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPointsInArea, Expecting IIP version >= ' + MinVersion.toSring());
      }

      for (const AreaNumber in this.Areas){
        const Data = new Uint8Array([0, Number(AreaNumber)]);
        this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
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

    // Function SendMode2ReqPointText_CF01()
    // Returns the text for multiple points
    // Supported in Protocol Version 1.14
    // Command format 1
    //
    SendMode2ReqPointText_CF01(){
      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPointText_CF01, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x3C]);
      const CommandFormat = new Uint8Array([]);

      for(const Point in this.Points){
        const High = (Number(Point) >> 8) & 0xFF;
        const Low = Number(Point) & 0xFF;
        const Data = new Uint8Array([High, Low, 0]);
        this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
      }
    }

    // Function ReadMode2ReqPointText_CF01()
    // Returns the text for multiple points
    // Supported in Protocol Version 1.14
    // Command format 1
    //
    ReadMode2ReqPointText_CF01(Data: Buffer, PointNumber){
      let i = 2;
      let PointText = '';
      while(Data[i] !== 0x00){
        const Read = Data[i];
        PointText += String.fromCharCode(Read);
        i++;
      }

      if(this.Points[PointNumber]!== undefined){
        this.Points[PointNumber].PointText = PointText;
      }

      return;
    }

    // Function SendMode2ReqPointText_CF03()
    // Returns the text for multiple points
    // Supported in Protocol Version 2.5
    // Command format 3
    //
    SendMode2ReqPointText_CF03(LastPointRead: number){

      // Check min supported version
      const MinVersion = new BGProtocolVersion(2, 5, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPointText_CF03, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x3C]);
      const CommandFormat = new Uint8Array([]);

      const High = (LastPointRead >> 8) & 0xFF;
      const Low = LastPointRead & 0xFF;

      const Data = new Uint8Array([High, Low, 0, 1]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2ReqPointText_CF03()
    // Returns the text for multiple points
    // Supported in Protocol Version 2.5
    // Command format 3
    //
    ReadMode2ReqPointText_CF03(Data: Buffer){

      const DataLength = Data[0];

      // No more data to be read, all point text has been received from panel
      if(DataLength <= 1){
        this.SendMode2ReqOutputText_CF03(0);
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
            if(Point !== undefined){
              Point.PointText = PointText;
            }

            if(i === DataLength){
              this.SendMode2ReqPointText_CF03(PointNumber);
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

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqConfiguredOutputs, Expecting IIP version >= ' + MinVersion.toSring());
      }

      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
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

    // Function SendMode2ReqOutputText_CF01()
    // This command retrieves output text
    // Supported in Protocol Version 1.14
    // Command Format 1
    private SendMode2ReqOutputText_CF01(){

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqOutputText_CF01, Expecting IIP version >= ' + MinVersion.toSring());
      }

      // If no output are configured on the panel, return and start panel operation.
      const length = Object.keys(this.Outputs).length;
      if(length === 0){
        if(!this.PanelReadyForOperation){
          this.PanelReadyForOperation = true;
          this.emit('PanelReadyForOperation', true);
        }
        return;
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x33]);
      const CommandFormat = new Uint8Array([]);

      for (const Output in this.Outputs){
        const Data = new Uint8Array([ Number(Output) & 0xFF, 0]);
        this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
      }
    }

    private ReadMode2ReqOutputText_CF01(Data:Buffer, OutputNumber:number){
      let i = 2;
      let OutputText = '';
      while(Data[i] !== 0x00){
        const Read = Data[i];
        OutputText += String.fromCharCode(Read);
        i++;
      }

      if(this.Outputs[OutputNumber]!== undefined){
        this.Outputs[OutputNumber].OutputText = OutputText;
      }

      const keys2 = Object.keys(this.Outputs);
      const LastOuputNumber = keys2[keys2.length-1];

      if(Number(LastOuputNumber) === OutputNumber){
        if(!this.PanelReadyForOperation){
          this.PanelReadyForOperation = true;
          this.emit('PanelReadyForOperation', true);
        }
      }
      return;
    }

    // Function SendMode2ReqOutputText_CF03()
    // This command retrieves output text
    // Supported in Protocol Version 2.5
    //
    private SendMode2ReqOutputText_CF03(OutputNumber: number){

      // Check min supported version
      const MinVersion = new BGProtocolVersion(2, 5, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqOutputText_CF03, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x33]);
      const CommandFormat = new Uint8Array([]);
      const MSB = (OutputNumber >> 8) & 0xFF;
      const LSB = OutputNumber & 0xFF;
      const Data = new Uint8Array([MSB, LSB, 0, 1]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    private ReadMode2ReqOutputText_CF03(Data:Buffer){

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
            if(Output !== undefined){
              Output.OutputText = OutputText;
            }

            if(i === DataLength){
              this.SendMode2ReqOutputText_CF03(OutputNumber);
              return;
            }
            break;
          }
        }
      }
    }

    // Function SendMode2SetOutputState_CF01()
    // Set output state
    // Supported in Protocol Version 1.14
    //
    private SendMode2SetOutputState_CF01(OutputNumber: number, OutputState: boolean){

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2SetOutputState_CF01, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x32]);
      const CommandFormat = new Uint8Array([]);
      const Number = OutputNumber & 0xFF;

      let State = 0;
      if(OutputState){
        State = 1;
      }

      const Data = new Uint8Array([Number, State]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2SetOutputState_CF01()
    // Set output state
    // Supported in Protocol Version 1.14
    //
    private ReadMode2SetOutputState_CF01(){
      return;
    }

    // Function SendMode2SetOutputState_CF02()
    // Set output state
    // Supported in Protocol Version 2.5
    //
    private SendMode2SetOutputState_CF02(OutputNumber: number, OutputState: boolean){

      // Check min supported version
      const MinVersion = new BGProtocolVersion(2, 5, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2SetOutputState_CF02, Expecting IIP version >= ' + MinVersion.toSring());
      }

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
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2SetOutputState_CF02()
    // Set output state
    // Supported in Protocol Version 2.5
    //
    private ReadMode2SetOutputState_CF02(){
      return;
    }

    // Function  SendMode2ReqAreaStatus_CF01()
    // Return Area status
    // Supported in Protocol Version 1.23
    //
    private SendMode2ReqAreaStatus_CF01(){

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 23, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqAreaStatus_CF01, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const MaxPair = 50;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x26]);
      const CommandFormat = new Uint8Array([]);

      let Data = new Uint8Array();

      for( const AreaNumber in this.Areas){
        const High = (Number(AreaNumber) >> 8) & 0xFF;
        const Low = Number(AreaNumber) & 0xFF;
        const Value = [High, Low];

        const Temp = new Uint8Array(Data.length + Value.length);
        Temp.set(Data, 0);
        Temp.set(Value, Data.length);
        Data = Temp;

        if((Data.length) / 2 >= MaxPair){
          this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
          Data = new Uint8Array();
        }
      }

      if(Data.length > 0){
        this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
      }
    }

    // Function  ReadMode2ReqAreaStatus_CF01()
    // Return Area status
    // Supported in Protocol Version 1.23
    //
    private ReadMode2ReqAreaStatus_CF01(Data:Buffer){
      Data = Data.slice(2, Data.length);

      for(let i = 0 ; i < Data.length/3 ; i++){
        const High = Data[i*3];
        const Low = Data[(i*3) + 1];
        const Status = Data[(i*3)+2];
        const AreaNumber = (High << 8) + Low;
        const Area = this.Areas[AreaNumber];
        if(Area.AreaStatus !== Status){
          Area.AreaStatus = Status;
          this.emit('AreaOnOffStateChange', Area);
        }
      }
    }

    private SendMode2ReqAreaStatus_CF02(){
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
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    private ReadMode2ReqAreaStatus_CF02(Data:Buffer){

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
        this.emit('AreaAlarmStateChange', Area);
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
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, TotalAreaMask));
    }

    ReadMode2ArmPanelAreas(){
      return;
    }

    // Function SendMode2SetSubscriptions()
    // This command requests a list of subscriptions to asynchronous panel status messages
    // Supported in Protocol Version 5.207
    // Command Format 3
    //
    private SendMode2SetSubscriptions(){

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
      const DoorState = new Uint8Array([0x00]);
      const WalkTestType = new Uint8Array([0x00]);
      const RequestPanelSystem = new Uint8Array([0x00]);
      const WirelessLeanModeState = new Uint8Array([0x00]);
      const PoinExtendedState = new Uint8Array([0x01]);

      const Data = new Uint8Array([ConfidenceMsg[0], EventMem[0], EventLog[0],
        ConfigChange[0], AreaOnOff[0], AreaReady[0], OutputState[0], PointState[0], DoorState[0], WalkTestType[0],
        RequestPanelSystem[0], WirelessLeanModeState[0], PoinExtendedState[0]]);

      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
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

    // Function SendMode2ReqPointsStatus()
    // This returns a list of up to 66 pairs of point numbers and their status
    // Supported in Protocol Version 1.14
    //
    private SendMode2ReqPointsStatus(){
      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPointsStatus, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const MaxPair = 66;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x38]);
      const CommandFormat = new Uint8Array([]);

      let Data = new Uint8Array();

      for( const PointNumber in this.Points){
        const High = (Number(PointNumber) >> 8) & 0xFF;
        const Low = Number(PointNumber) & 0xFF;
        const Value = [High, Low];

        const Temp = new Uint8Array(Data.length + Value.length);
        Temp.set(Data, 0);
        Temp.set(Value, Data.length);
        Data = Temp;

        if((Data.length) / 2 >= MaxPair){
          this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
          Data = new Uint8Array();
        }
      }

      if(Data.length > 0){
        this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
      }
    }

    // Function ReadMode2ReqPointsStatus()
    // This returns a list of up to 66 pairs of point numbers and their status
    // Supported in Protocol Version 1.14
    //
    private ReadMode2ReqPointsStatus(Data:Buffer){
      Data = Data.slice(2, Data.length);
      const Pair = Data.length/3;

      for(let i = 0; i<Pair ; i++){
        const High = Data[i*3];
        const Low = Data[(i*3)+1];
        const NewStatus = Data[(i*3)+2];
        const Number = (High << 8) + Low;


        const Point = this.Points[Number];
        if(Point !== undefined){
          if(Point.UpdateStatus(NewStatus)){
            this.emit('PointStatusChange', Point);
          }
        }
      }
      return;
    }

    // Function SendMode2ReqAlarmMemorySummary_CF01()
    // Returns a list of the number of alarms present (not yet cleared) for
    // each priority for all areas the user has authority over
    // Supported in Protocol Version 1.24
    //
    private SendMode2ReqAlarmMemorySummary_CF01(){
      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 24, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqAlarmMemorySummary, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x08]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array();
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2ReqAlarmMemorySummary()
    // Returns a list of the number of alarms present (not yet cleared) for
    // each priority for all areas the user has authority over
    // Supported in Protocol Version 1.24
    //
    private ReadMode2ReqAlarmMemorySummary_CF01(Data:Buffer){
      Data = Data.slice(2, Data.length);
      let AlarmDetected = false;
      this.LowestAlarmPriority = -1;

      for(let i = 0 ; i <10 ; i++){
        const AlarmCount = (Data[i*2] << 8) + Data[(i*2)+1];
        const AlarmPriority = i+1;

        if(AlarmCount === 0 ){
          for( const AreaNumber in this.Areas){
            const Area = this.Areas[AreaNumber];
            if(Area.RemoveAlarm(AlarmPriority)){
              this.emit('AreaAlarmStateChange', Area);
            }
          }
        } else{
          AlarmDetected = true;
          this.LowestAlarmPriority = AlarmPriority;
          this.SendMode2ReqAlarmAreasByPriority_CF01(AlarmPriority);
        }
      }

      if(!AlarmDetected){

        setTimeout(() => {
          this.PoolPanel();
        }, this.PoolInterval);
        return;
      }
    }

    // Function SendMode2ReqAlarmAreasByPriority_CF01()
    // Returns a bit mask identifying the areas with an event in memory
    // Supported in Protocol Version 1.14
    //
    private SendMode2ReqAlarmAreasByPriority_CF01(AlarmPriority:BGAlarmPriority){
      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqAlarmAreasByPriority_CF01, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x22]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([AlarmPriority]);
      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2ReqAlarmAreasByPriority_CF01()
    // Returns a bit mask identifying the areas with an event in memory
    // Supported in Protocol Version 1.14
    //
    private ReadMode2ReqAlarmAreasByPriority_CF01(Data:Buffer, AlarmPriority:number){
      Data = Data.slice(2, Data.length);
      let AreaAlarm = false;

      for(const AreaNumber in this.Areas){
        const Area = this.Areas[AreaNumber];
        const Num = Number(AreaNumber);
        const Index = Math.floor(Num/8);

        AreaAlarm = false;
        if(Index < Data.length){
          const Residu = Num - (Index * 8);
          const AreaMask = Math.pow(2, 8-Residu);

          if((Data[Index] & AreaMask) > 0){
            AreaAlarm = true;
          }
        }

        if(AreaAlarm){
          if(Area.AddAlarm(AlarmPriority)){
            this.emit('AreaAlarmStateChange', Area);
          }
        } else{
          if(Area.RemoveAlarm(AlarmPriority)){
            this.emit('AreaAlarmStateChange', Area);
          }
        }
      }

      if(AlarmPriority === this.LowestAlarmPriority){
        setTimeout(() => {
          this.PoolPanel();
        }, this.PoolInterval);
        return;
      }
    }

    // Function Send Mode2ReqAlarmMemoryDetail_CF01()
    // Returns a list of the number of alarms present (not yet cleared) for
    // each priority for all areas the user has authority over
    // Supported in Protocol Version 1.23
    //
    private SendMode2ReqAlarmMemoryDetail_CF01(AlarmPriority:BGAlarmPriority, LastArea:number, LastPoint:number){
      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 23, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqAlarmMemoryDetail, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x23]);
      const CommandFormat = new Uint8Array([]);
      let Data = new Uint8Array([AlarmPriority]);

      if(LastArea !== 0 && LastPoint !== 0){
        Data = new Uint8Array([AlarmPriority, (LastArea >> 8) & 0xFF, LastArea & 0xFF, (LastPoint >> 8) & 0xFF, LastPoint & 0xFF ]);
      }

      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2ReqAlarmMemoryDetail_CF01()
    // Returns a list of the number of alarms present (not yet cleared) for
    // each priority for all areas the user has authority over
    // Supported in Protocol Version 1.24
    //
    private ReadMode2ReqAlarmMemoryDetail_CF01(Data:Buffer, AlarmPriority:BGAlarmPriority){
      Data = Data.slice(2, Data.length);

      // No alarm on panel for that AlarmPriority
      // Remove that alarm priority from every area on panel
      if(Data.length === 0){
        for(const AreaNumber in this.Areas){
          const Area = this.Areas[AreaNumber];

          // Fire event emitter if a change was notice
          if(Area.RemoveAlarm(AlarmPriority)){
            this.emit('AreaAlarmStateChange', Area);
          }
        }
      }

      const ChunkLength = 5;
      const Chunk = Data.length / ChunkLength;

      for(let i = 0 ; i < Chunk ; i ++){
        const Detail = Data.slice(i*ChunkLength, i*ChunkLength + ChunkLength);
        const AreaNumber = (Detail[0] << 8) + Detail[1];
        //const ItemType = Detail[2];
        const ItemPointKeypadUser = (Detail[3] << 8) + Detail[4];

        // More data to come
        if(ItemPointKeypadUser === 0xFFFF){
          const LastDetail = Data.slice((i-1)*ChunkLength, (i-1)*ChunkLength + ChunkLength);
          const LastArea = ( LastDetail[0] << 8) + LastDetail[1];
          const LastItemPointKeypadUser = (LastDetail[3] << 8) + LastDetail[4];
          this.SendMode2ReqAlarmMemoryDetail_CF01(AlarmPriority, LastArea, LastItemPointKeypadUser);
        }

        const Area = this.Areas[AreaNumber];
        if(Area.AddAlarm(AlarmPriority)){
          this.emit('AreaAlarmStateChange', Area);
        }
      }

      if(AlarmPriority === 1){
        setTimeout(() => {
          this.PoolPanel();
        }, this.PoolInterval);
      }

    }

    // Function SendMode2ReqOutputStatus()
    // Return panel outputs
    // Supported in Protocol Version 1.14
    //
    private SendMode2ReqOutputStatus(){
      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.PanelIIPVersion.GTE(MinVersion)){
        this.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqOutputStatus, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x31]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);

      this.QueueProtocolCommand_0x01(this.FormatCommand(Protocol, Command, CommandFormat, Data));
    }

    // Function ReadMode2ReqOutputStatus()
    // Return panel outputs
    // Supported in Protocol Version 1.14
    //
    private ReadMode2ReqOutputStatus(Data:Buffer){
      Data = Data.slice(2, Data.length);

      for (const OutputNumer in this.Outputs){
        const Output = this.Outputs[OutputNumer];
        const Num = Number(OutputNumer);
        const Index = Math.floor(Num/8);

        // If response if empty, no active output on panel
        let NewStatus = false;

        if(Index < Data.length){
          const Byte = Data[Index];
          const Residu = Num - (Index * 8);
          NewStatus = ((Byte & Math.pow(2, 8-Residu)) > 0);
        }

        if(Output.OutputState !== NewStatus || this.InitialRun === true){
          Output.OutputState = NewStatus;
          this.emit('OutputStateChange', Output);
        }
      }

      this.InitialRun = false;
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