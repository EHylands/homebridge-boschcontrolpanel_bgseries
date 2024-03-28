import { BGPoint } from './BGPoint';
import { BGUserType, BGPanelType } from './BGConst';
//import { BoschCertificate20202030 } from './BGCertificate';
import { BGOutput } from './BGOutput';
import { BGArea } from './BGArea';
import { BGProtocolVersion } from './BGProtocolVersion';
import { BGArmingType } from './BGConst';
import { TypedEmitter } from 'tiny-typed-emitter';
import { BGFirmwareVersion } from './BGFirmwareVersion';
import { BGProtocolHandler01 } from './BGProtocolHandler01';
import { BGProtocolHandler02 } from './BGProtocolHandler02';
import {PromiseSocket} from 'promise-socket';
import tls = require('tls');
import net = require('net');

export enum BGControllerError{

  InvalidProtocol = 'Invalid Protocol',
  InvalidProtocolLength = 'Invalid Protocol Length',
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

export enum MaxConnectionsInUseFlags {
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
    Semaphore = require('ts-semaphore');

    private Host: string;
    private Port: number;
    private Socket: net.Socket;
    private SocktetTimeout = 180000;
    PromiseS = new PromiseSocket();

    UserType: BGUserType;
    Passcode: string;
    MinPasscodeLength = 6;
    MaxPassCodeLength = 24;

    // Bosch Protocol related variables
    readonly BoschMaxAreas = 128;
    readonly BoschMaxPoints = 600;
    readonly BoschMaxOutputs = 600;


    readonly BoschMaxNotificationMessageBytes = 480;

    // Current Panel related variables
    PanelRPSProtocolVersion = new BGProtocolVersion(0, 0, 0);
    PanelExecuteProtocolVersion = new BGProtocolVersion(0, 0, 0);
    PanelIIPVersion = new BGProtocolVersion(0, 0, 0);
    FirmwareVersion = new BGFirmwareVersion(0, 0);
    PanelBusyFlag = false;
    PanelType = BGPanelType.Undefined;
    MaxAreas = 0;
    MaxPoints = 0;
    MaxOutputs = 0;
    MaxUsers = 0;
    MaxKeypads = 0;
    MaxDoors= 0;

    Areas:Record<number, BGArea> = {};
    Outputs:Record<number, BGOutput> = {};
    Points:Record<number, BGPoint> = {};

    PanelReadyForOperation = false;
    PanelReceivingNotifcation = false;

    // ProtocolHandler
    Protocol01 = new BGProtocolHandler01(this);
    Protocol02 = new BGProtocolHandler02(this);
    private semaphore = new this.Semaphore(1);

    // Legacy options
    LegacyMode = false;
    InitialRun = true;
    PoolInterval = 500;

    // Panel Supported Features
    FeatureProtocol01 = false;
    FeatureProtocol02 = false;
    FeatureProtocol03 = false;
    FeatureProtocol04 = false;
    FeatureProtocol05 = false;
    Feature512BytesPacket = false;
    Feature1460BytesPacket = false;
    FeatureCommandWhatAreYouCF01 = false;
    FeatureCommandWhatAreYouCF02 = false;
    FeatureCommandWhatAreYouCF03 = false;
    FeatureCommandWhatAreYouCF04 = false;
    FeatureCommandWhatAreYouCF05 = false;
    FeatureCommandWhatAreYouCF06 = false;
    FeatureCommandWhatAreYouCF07 = false;
    FeatureCommandRequestAreaTextCF01 = false;
    FeatureCommandRequestAreaTextCF03 = false;
    FeatureCommandRequestOuputTextCF01 = false;
    FeatureCommandRequestOuputTextCF03 = false;
    FeatureCommandRequestPointTextCF01 = false;
    FeatureCommandRequestPointTextCF03 = false;
    FeatureCommandRequestConfiguredAreaCF01 = false;
    FeatureCommandArmPanelAreasCF01 = false;
    FeatureCommandRequestConfiguredOutputsCF01 = false;
    FeatureCommandRequestPointsInAreaCF01 = false;
    FeatureCommandSetOutputStateCF01 = false;
    FeatureCommandSetOutputStateCF02 = false;
    FeatureCommandSetSubscriptionCF01 = false;
    FeatureCommandSetSubscriptionCF02 = false;
    FeatureCommandSetSubscriptionCF03 = false;
    FeatureCommandSetSubscriptionCF04 = false;
    FeatureCommandSetSubscriptionCF05 = false;
    FeatureCommandReqAlarmAreasByPriorityCF01 = false;
    FeatureCommandReqAlarmMemorySummaryCF01 = false;
    FeatureCommandReqAlarmMemoryDetailCF01 = false;

    constructor(Host: string, Port:number, UserType: BGUserType, Passcode: string, ForceLegacyMode:boolean) {
      super();
      this.Host = Host;
      this.Port = Port;
      this.Passcode = Passcode;
      this.LegacyMode = ForceLegacyMode;
      this.UserType = UserType;
      this.Socket = new net.Socket();
    }

    Connect(){
      this.Outputs = {};
      this.Areas = {};
      this.Points = {};

      this.PanelReadyForOperation = false;
      this.PanelReceivingNotifcation = false;
      this.InitialRun = true;

      const options = {
        rejectUnauthorized: false,
        //ca: [BoschCertificate20202030],
        //checkServerIdentity: function () {
        //  return undefined;
        //},
      };

      try {
        this.Socket = tls.connect(this.Port, this.Host, options, () => {
          this.PromiseS = new PromiseSocket(this.Socket);
          this.Configure();
        });

        this.Socket.setTimeout(this.SocktetTimeout);

        this.Socket.on('timeout', ()=>{
          this.PanelReadyForOperation = false;
          this.PanelReceivingNotifcation = false;
          this.emit('PanelReceivingNotifiation', this.PanelReceivingNotifcation);
          this.emit('ControllerError', BGControllerError.ConnectionError, 'Timeout');
          this.Socket.destroy();
        });

        this.Socket.on('error', (error: Error) => {
          this.PanelReadyForOperation = false;
          this.PanelReceivingNotifcation = false;
          this.emit('PanelReceivingNotifiation', this.PanelReceivingNotifcation);
          this.emit('ControllerError', BGControllerError.ConnectionError, error.message);
          this.Socket.destroy();
        });

        this.Socket.on('data', (data: Buffer) => {
          const Protocol = data[0];
          const Data = data.slice(1, data.length);

          switch(Protocol){
            case 0x01:{
              break;
            }

            case 0x02:{
              this.Protocol02.ParseMessage(Data);
              break;
            }

            default:{
              this.emit('ControllerError', BGControllerError.InvalidProtocol,
                'Received unknown protocol number from panel');
            }
          }
        });
      } catch (e) {
        this.emit('PanelReceivingNotifiation', this.PanelReceivingNotifcation);
        this.emit('ControllerError', BGControllerError.ConnectionError, (<Error>e).message);
        this.Socket.destroy();
        return;
      }
    }

    async Configure(){
      if(this.LegacyMode){
        if(!await this.Protocol01.Mode2WhatAreYou_CF01()){
          return;
        }
      } else{
        if(!await this.Protocol01.Mode2WhatAreYou_CF03()){
          return;
        }
      }

      if(this.PanelType === BGPanelType.Solution2000 ||
        this.PanelType === BGPanelType.Solution3000 ||
        this.PanelType === BGPanelType.AMAX2100 ||
        this.PanelType === BGPanelType.AMAX3000 ||
        this.PanelType === BGPanelType.AMAX4000
      ){
        if(!await this.Protocol01.Mode2LoginRSCUser()){
          return;
        }
      } else{

        if(!await this.Protocol01.Mode2Passcode()){
          return;
        }
      }

      if(!await this.Protocol01.Mode2ReqPanelCapacitie()){
        return;
      }

      if(!await this.Protocol01.Mode2ReqPanelSystemStatus()){
        return;
      }

      if(!await this.Protocol01.Mode2ReqConfiguredAreas()){
        return;
      }

      if(!await this.Protocol01.Mode2ReqPointsInArea()){
        return;
      }

      if(!await this.Protocol01.Mode2ReqConfiguredOutputs()){
        return;
      }

      if(this.LegacyMode || !this.FeatureCommandRequestAreaTextCF03){
        if(!await this.Protocol01.Mode2ReqAreaText_CF01()){
          return;
        }
      } else{
        if(!await this.Protocol01.Mode2ReqAreaText_CF03(0)){
          return;
        }
      }

      if(this.LegacyMode || !this.FeatureCommandRequestPointTextCF03){
        if(!await this.Protocol01.Mode2ReqPointText_CF01()){
          return;
        }
      } else{
        if(!await this.Protocol01.Mode2ReqPointText_CF03(0)){
          return;
        }
      }

      if(this.LegacyMode || !this.FeatureCommandRequestOuputTextCF03){
        if(!await this.Protocol01.Mode2ReqOutputText_CF01()){
          return;
        }
      } else{
        if(!await this.Protocol01.Mode2ReqOutputText_CF03(0)){
          return;
        }
      }

      this.PanelReadyForOperation = true;
      this.emit('PanelReadyForOperation', true);
    }

    async StartOperation(){

      // Pool panel in LegacyMode
      if(this.LegacyMode){
        this.PoolPanel();
        return;
      }

      // Enable subscriptions if available on panel
      if(this.FeatureProtocol02){

        if(this.FeatureCommandSetSubscriptionCF03 === true){
          await this.Protocol01.Mode2SetSubscriptions_CF03();
          return;
        }

        if(this.FeatureCommandSetSubscriptionCF01 === true){
          await this.Protocol01.Mode2SetSubscriptions_CF01();
          return;
        }
      }

      // Default to Pooling Panel
      this.PoolPanel();
    }

    private async PoolPanel(){
      if(!await this.Protocol01.Mode2ReqPointsStatus()){
        return;
      }

      if(!await this.Protocol01.Mode2ReqOutputStatus()){
        return;
      }

      if(!await this.Protocol01.Mode2ReqAreaStatus_CF01()){
        return;
      }

      if(!await this.Protocol01.Mode2ReqAlarmMemorySummary_CF01()){
        return;
      }

      setTimeout(() => {
        this.PoolPanel();
      }, this.PoolInterval);
    }

    GetPanelUsingSubscription():boolean{
      if(this.LegacyMode){
        return false;
      }

      return this.FeatureProtocol02;
    }

    async SetOutputState(OutputNumer: number, State:boolean){

      this.semaphore.use(async () => {

        if(this.LegacyMode){
          await this.Protocol01.Mode2SetOutputState_CF01(OutputNumer, State);
          return;
        }

        if(this.PanelType === BGPanelType.Solution2000 ||
        this.PanelType === BGPanelType.Solution3000 ||
        this.PanelType === BGPanelType.AMAX4000||
        this.PanelType === BGPanelType.AMAX2100 ||
        this.PanelType === BGPanelType.AMAX3000){
          await this.Protocol01.Mode2SetOutputState_CF01(OutputNumer, State);
          return;
        }

        if(this.FeatureCommandSetOutputStateCF02){
          await this.Protocol01.Mode2SetOutputState_CF02(OutputNumer, State);
          return;
        }

        // Last resort
        await this.Protocol01.Mode2SetOutputState_CF01(OutputNumer, State);
      });
      return;
    }

    async ArmArea(AreaToArm: number[], ArmingType: BGArmingType){
      this.semaphore.use(async () => {
        await this.Protocol01.Mode2ArmPanelAreas(AreaToArm, ArmingType);
        return;
      });
    }
}