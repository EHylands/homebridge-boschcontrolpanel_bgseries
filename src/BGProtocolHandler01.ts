import { BGController, BGControllerError, MaxConnectionsInUseFlags } from './BGController';
import { BGNegativeAcknowledgement, BGPanelType, BGArmingType, BGAlarmPriority } from './BGConst';
import { BGProtocolVersion } from './BGProtocolVersion';
import { BGArea } from './BGArea';
import { BGPoint } from './BGPoint';
import { BGOutput } from './BGOutput';

export class BGProtocolHandler01 {

    private Controller:BGController;
    private ProtocolId = 0x01;
    private ProtocolCommandMaxBytes = 236;

    constructor(Controller:BGController){
      this.Controller = Controller;
    }

    private FormatCommand(Protocol:Uint8Array, Command:Uint8Array, CommandFormat: Uint8Array, Data: Uint8Array){

      if(Protocol.length !== 1){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolLength, Protocol.toString());
        return new Uint8Array();
      }

      if(Command.length !== 1){
        this.Controller.emit('ControllerError', BGControllerError.InvalidCommandLength, Command.toString());
        return new Uint8Array();
      }

      if(CommandFormat.length > 1){
        this.Controller.emit('ControllerError', BGControllerError.InvalidCommandFormatLength, CommandFormat.toString());
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

      if(Request.length > this.ProtocolCommandMaxBytes){
        this.Controller.emit('ControllerError', BGControllerError.CommandLengthOverflow, Request.toString());
        return new Uint8Array();
      }

      return Request;
    }

    private ValidateResponse(Response: string|Buffer, ExpectedResponse:number, Name:string):boolean{
      // Check Protocol
      if(Response[0] !== this.ProtocolId){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocol, Name);
        return false;
      }

      // Check length
      const Length = Number(Response[1]) + 2;
      if(Response.length !== Length){
        this.Controller.emit('ControllerError', BGControllerError.InvalidResponseLength, Name);
        return false;
      }

      // Check Response
      if(Response[2] !== ExpectedResponse){
        if(Response[2] === 0xFD){
          this.Controller.emit('ControllerError', BGControllerError.BoschPanelError, Name + ' ' + BGNegativeAcknowledgement[Response[3]]);
        } else{
          this.Controller.emit('ControllerError', BGControllerError.UndefinedError, Name);
        }
        return false;
      }

      return true;
    }

    // Function ModeWhatAreYou_CF01
    // Return information about the panel
    // Command Format 1
    // Supported in Protocol Version 1.14
    //
    async Mode2WhatAreYou_CF01():Promise<boolean>{
      const Protocol = new Uint8Array([this.ProtocolId]);
      const Command = new Uint8Array([0x01]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2WhatAreYou_CF01')){
        return false;
      }

      this.Controller.PanelType = Number(Res![3]);
      this.Controller.PanelRPSProtocolVersion =
      new BGProtocolVersion(Number(Res![4]), Number(Res![5]), Number(Res![6]) + (Number(Res![7]) << 8));
      this.Controller.PanelIIPVersion = new BGProtocolVersion(Number(Res![8]), Number(Res![9]), Number(Res![10]) + (Number(Res![11]) << 8));
      this.Controller.PanelExecuteProtocolVersion = new BGProtocolVersion(Number(Res![12]), Number(Res![13]), Number(Res![14]) +
        (Number(Res![15]) << 8));

      this.Controller.PanelBusyFlag = false;
      if(Number(Res![16]) === MaxConnectionsInUseFlags.MaxUserBasedRemoteAccessUsersInUse){
        this.Controller.PanelBusyFlag = true;
        this.Controller.emit('ControllerError', BGControllerError.PanelBusy, 'Mode2WhatAreYou: Max User Based Remote Access Users In Use');
        return false;
      }

      if(Number(Res![16]) === MaxConnectionsInUseFlags.MaxAutomationUsersInUse){
        this.Controller.PanelBusyFlag = true;
        this.Controller.emit('ControllerError', BGControllerError.PanelBusy, 'Mode2WhatAreYou: Max Automation Users In Use');
        return false;
      }

      if(this.Controller.PanelType ===BGPanelType.Solution2000 ||
          this.Controller.PanelType === BGPanelType.Solution3000 ||
          this.Controller.PanelType === BGPanelType.AMAX2100 ||
          this.Controller.PanelType === BGPanelType.AMAX3000 ||
          this.Controller.PanelType === BGPanelType.AMAX4000
      ){
        this.Controller.LegacyMode = true;
      }
      return true;
    }

    // Function Mode2WhatAreYou_CF03
    // Return information about the panel
    // Command Format 3
    // Supported in Protocol Version 5.72
    //
    async Mode2WhatAreYou_CF03():Promise<boolean>{
      const Protocol = new Uint8Array([this.ProtocolId]);
      const Command = new Uint8Array([0x01]);
      const CommandFormat = new Uint8Array([0x03]);
      const Data = new Uint8Array([]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2WhatAreYou_CF03')){
        return false;
      }

      this.Controller.PanelType = Number(Res![3]);
      this.Controller.PanelRPSProtocolVersion =
      new BGProtocolVersion(Number(Res![4]), Number(Res![5]), Number(Res![6]) + (Number(Res![7]) << 8));
      this.Controller.PanelIIPVersion = new BGProtocolVersion(Number(Res![8]), Number(Res![9]), Number(Res![10]) + (Number(Res![11]) << 8));
      this.Controller.PanelExecuteProtocolVersion =
        new BGProtocolVersion(Number(Res![12]), Number(Res![13]), Number(Res![14]) + (Number(Res![15]) << 8));

      this.Controller.PanelBusyFlag = false;
      if(Number(Res![16]) === MaxConnectionsInUseFlags.MaxUserBasedRemoteAccessUsersInUse){
        this.Controller.PanelBusyFlag = true;
        this.Controller.emit('ControllerError', BGControllerError.PanelBusy, 'Mode2WhatAreYou: Max User Based Remote Access Users In Use');
        return false;
      }

      if(Number(Res![16]) === MaxConnectionsInUseFlags.MaxAutomationUsersInUse){
        this.Controller.PanelBusyFlag = true;
        this.Controller.emit('ControllerError', BGControllerError.PanelBusy, 'Mode2WhatAreYou: Max Automation Users In Use');
        return false;
      }

      // Data 16 - Month
      // Data 17 - Day
      // Data 18 - Year
      // Data 19 - Hour
      // Data 20 - Minute
      // Data 21 - A-Link Protocol Version Major
      // Data 22 - A-Link Protocol Version Minor
      // Data 23 - A-Link Protocol Version Micro LSB
      // Data 24 - A-Link Protocol Version Micro MSB

      const BitMask = Res!.slice(26, Res!.length);
      this.Controller.FeatureProtocol01 = (Number(BitMask[0]) & 0x80) !== 0;
      this.Controller.FeatureProtocol02 = (Number(BitMask[0]) & 0x40) !== 0;
      this.Controller.FeatureProtocol03 = (Number(BitMask[0]) & 0x20) !== 0;
      this.Controller.FeatureProtocol04 = (Number(BitMask[0]) & 0x10) !== 0;
      this.Controller.FeatureProtocol05 = (Number(BitMask[0]) & 0x08) !== 0;
      this.Controller.Feature512BytesPacket = (Number(BitMask[0]) & 0x02) !== 0;
      this.Controller.Feature1460BytesPacket = (Number(BitMask[0]) & 0x01) !== 0;
      this.Controller.FeatureCommandWhatAreYouCF01 = (Number(BitMask[1]) & 0x80) !== 0;
      this.Controller.FeatureCommandWhatAreYouCF02 = (Number(BitMask[1]) & 0x40) !== 0;
      this.Controller.FeatureCommandWhatAreYouCF03 = (Number(BitMask[1]) & 0x20) !== 0;
      this.Controller.FeatureCommandWhatAreYouCF04 = (Number(BitMask[27]) & 0x20) !== 0;
      this.Controller.FeatureCommandWhatAreYouCF05 = (Number(BitMask[27]) & 0x10) !== 0;
      this.Controller.FeatureCommandWhatAreYouCF06 = (Number(BitMask[27]) & 0x08) !== 0;
      this.Controller.FeatureCommandWhatAreYouCF07 = (Number(BitMask[30]) & 0x10) !== 0;
      this.Controller.FeatureCommandRequestConfiguredAreaCF01 = (Number(BitMask[6]) & 0x10) !== 0;
      this.Controller.FeatureCommandArmPanelAreasCF01 = (Number(BitMask[7]) & 0x80) !== 0;
      this.Controller.FeatureCommandRequestAreaTextCF01 = (Number(BitMask[7]) & 0x20) !== 0;
      this.Controller.FeatureCommandRequestAreaTextCF03 = (Number(BitMask[7]) & 0x08) !== 0;
      this.Controller.FeatureCommandSetOutputStateCF01 = (Number(BitMask[8]) & 0x01) !== 0;
      this.Controller.FeatureCommandSetOutputStateCF02 = (Number(BitMask[9]) & 0x80) !== 0;
      this.Controller.FeatureCommandRequestOuputTextCF01 = (Number(BitMask[9]) & 0x40) !== 0;
      this.Controller.FeatureCommandRequestOuputTextCF03 = (Number(BitMask[9]) & 0x10) !== 0;
      this.Controller.FeatureCommandRequestPointsInAreaCF01 = (Number(BitMask[10]) & 0x40) !== 0;
      this.Controller.FeatureCommandRequestPointTextCF01 = (Number(BitMask[11]) & 0x80) !== 0;
      this.Controller.FeatureCommandRequestPointTextCF03 = (Number(BitMask[11]) & 0x20) !== 0;
      this.Controller.FeatureCommandRequestConfiguredOutputsCF01 = (Number(BitMask[8]) & 0x04) !== 0;
      this.Controller.FeatureCommandSetSubscriptionCF01 = (Number(BitMask[16]) & 0x20) !== 0;
      this.Controller.FeatureCommandSetSubscriptionCF02 = (Number(BitMask[24]) & 0x40) !== 0;
      this.Controller.FeatureCommandSetSubscriptionCF03 = (Number(BitMask[26]) & 0x01) !== 0;
      this.Controller.FeatureCommandSetSubscriptionCF04 = (Number(BitMask[28]) & 0x80) !== 0;
      this.Controller.FeatureCommandSetSubscriptionCF04 = (Number(BitMask[29]) & 0x01) !== 0;
      this.Controller.FeatureCommandReqAlarmAreasByPriorityCF01 = (Number(BitMask[5]) & 0x01) !== 0;
      this.Controller.FeatureCommandReqAlarmMemorySummaryCF01 = (Number(BitMask[2]) & 0x20) !== 0;
      this.Controller.FeatureCommandReqAlarmMemoryDetailCF01 =(Number(BitMask[6]) & 0x40) !== 0;

      return true;
    }

    // Function Mode2Passcode
    // Authentificate with panel
    // Command Format 1
    // Supported in protocol version 1.12
    //
    async Mode2Passcode():Promise<boolean>{
      const Protocol = new Uint8Array([this.ProtocolId]);
      const Command = new Uint8Array([0x06]);
      const CommandFormat = new Uint8Array([]);

      if(this.Controller.Passcode.length < this.Controller.MinPasscodeLength ||
        this.Controller.Passcode.length > this.Controller.MaxPassCodeLength){
        this.Controller.emit('ControllerError', BGControllerError.PasscodeLengthError, 'Invalid Passcode Length');
        return false;
      }

      const UserTypeArray = new Uint8Array([this.Controller.UserType]);
      const T = new this.Controller.Util.TextEncoder();

      let PasscodeArray = new Uint8Array([]);
      if(this.Controller.Passcode.length < 24){
        PasscodeArray = T.encode(this.Controller.Passcode + ' ');
      } else{
        PasscodeArray = T.encode(this.Controller.Passcode);
      }

      const Data = new Uint8Array(UserTypeArray.length + PasscodeArray.length);
      Data.set(UserTypeArray, 0);
      Data.set(PasscodeArray, UserTypeArray.length);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2Passcode')){
        return false;
      }

      const Authorized = Res![3];

      switch(Authorized){
        case 0:{
          this.Controller.emit('ControllerError', BGControllerError.UserNotAuthentificated, 'Mode2Passcode: Invalid Automation Passcode');
          return false;
        }

        case 1:{
          // Autorised
          return true;
        }

        case 2:{
          this.Controller.emit('ControllerError', BGControllerError.PanelBusy,
            'Mode2Passcode: Panel is busy, cannot accept new connection');
          return false;
        }
      }
      return true;
    }

    // Function Mode2ReqAlarmMemorySummary_CF01()
    // Returns a list of the number of alarms present (not yet cleared) for
    // each priority for all areas the user has authority over
    // Supported in Protocol Version 1.24
    //
    async Mode2ReqAlarmMemorySummary_CF01():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 24, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqAlarmMemorySummary, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x08]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array();

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqAlarmMemorySummary_CF01')){
        return false;
      }

      Res = Res!.slice(3, Res!.length);

      for(let i = 0 ; i <10 ; i++){
        const AlarmCount = (Number(Res[i*2]) << 8) + Number(Res[(i*2)+1]);
        const AlarmPriority = i+1;

        if(AlarmCount === 0 ){
          for( const AreaNumber in this.Controller.Areas){
            const Area = this.Controller.Areas[AreaNumber];
            if(Area !== undefined){
              if(Area.RemoveAlarm(AlarmPriority)){
                this.Controller.emit('AreaAlarmStateChange', Area);
              }
            }
          }
        } else{
          // Alarm detected
          await this.Mode2ReqAlarmMemoryDetail_CF01(AlarmPriority, 0, 0);
        }
      }

      return true;
    }

    // Mode2ReqPanelCapacitie
    // This command returns basic capacity of the panel.
    // Supported in protocol version 1.23
    //
    async Mode2ReqPanelCapacitie(): Promise<boolean>{
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x1F]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 23, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPanelCapacitie, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqPanelCapacitie')){
        return false;
      }

      this.Controller.MaxAreas = (Number(Res![4]) << 8) + Number(Res![5]);
      this.Controller.MaxPoints = (Number(Res![6]) << 8) + Number(Res![7]);
      this.Controller.MaxOutputs = (Number(Res![8]) << 8) + Number(Res![9]);
      this.Controller.MaxUsers = (Number(Res![10]) << 8) + Number(Res![11]);
      this.Controller.MaxKeypads = Number(Res![12]);
      this.Controller.MaxDoors = Number(Res![13]);

      return true;
    }

    // Function Mode2ReqPanelSystemStatus()
    // Return panel status
    // Supported in Protocol Version 1.14
    //
    async Mode2ReqPanelSystemStatus():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPanelSystemStatus, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x20]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqPanelSystemStatus')){
        return false;
      }

      this.Controller.FirmwareVersion.Version = Number(Res![3]);

      if(this.Controller.PanelType === BGPanelType.Solution2000 || this.Controller.PanelType === BGPanelType.Solution3000){
        this.Controller.FirmwareVersion.Revision = Number(Res![4]);
      } else{
        this.Controller.FirmwareVersion.Revision = (Number(Res![4]) << 8) + Number(Res![5]);
      }

      return true;
    }

    // Function Mode2ReqAlarmAreasByPriority_CF01()
    // Returns a bit mask identifying the areas with an event in memory
    // Supported in Protocol Version 1.14
    //
    async Mode2ReqAlarmAreasByPriority_CF01(AlarmPriority:BGAlarmPriority):Promise<boolean>{
      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqAlarmAreasByPriority_CF01, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x22]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([AlarmPriority]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqAlarmAreasByPriority_CF01')){
        return false;
      }

      Res = Res!.slice(3, Res!.length);
      let AreaAlarm = false;

      for(const AreaNumber in this.Controller.Areas){
        const Area = this.Controller.Areas[AreaNumber];
        const Num = Number(AreaNumber);
        const Index = Math.floor(Num/8);

        AreaAlarm = false;
        if(Index < Res.length){
          const Residu = Num - (Index * 8);
          const AreaMask = Math.pow(2, 8-Residu);

          if((Number(Res[Index]) & AreaMask) > 0){
            AreaAlarm = true;
          }
        }

        if(AreaAlarm){
          if(Area.AddAlarm(AlarmPriority)){
            this.Controller.emit('AreaAlarmStateChange', Area);
          }
        } else{
          if(Area.RemoveAlarm(AlarmPriority)){
            this.Controller.emit('AreaAlarmStateChange', Area);
          }
        }
      }

      return true;
    }

    // Function Send Mode2ReqAlarmMemoryDetail_CF01()
    // Returns a list of the number of alarms present (not yet cleared) for
    // each priority for all areas the user has authority over
    // Supported in Protocol Version 1.23
    //
    async Mode2ReqAlarmMemoryDetail_CF01(AlarmPriority:BGAlarmPriority, LastArea:number, LastPoint:number):Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 23, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqAlarmMemoryDetail, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x23]);
      const CommandFormat = new Uint8Array([]);
      let Data = new Uint8Array([AlarmPriority]);

      if(LastArea !== 0 && LastPoint !== 0){
        Data = new Uint8Array([AlarmPriority, (LastArea >> 8) & 0xFF, LastArea & 0xFF, (LastPoint >> 8) & 0xFF, LastPoint & 0xFF ]);
      }

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqAlarmMemoryDetail_CF01')){
        return false;
      }
      Res = Res!.slice(3, Res!.length);

      // No alarm on panel for that AlarmPriority
      // Remove that alarm priority from every area on panel
      if(Res.length === 0){
        for(const AreaNumber in this.Controller.Areas){
          const Area = this.Controller.Areas[AreaNumber];

          // Fire event emitter if a change was notice
          if(Area.RemoveAlarm(AlarmPriority)){
            this.Controller.emit('AreaAlarmStateChange', Area);
          }
        }
      }

      const ChunkLength = 5;
      const Chunk = Res.length / ChunkLength;

      for(let i = 0 ; i < Chunk ; i ++){
        const Detail = Res.slice(i*ChunkLength, i*ChunkLength + ChunkLength);
        const AreaNumber = (Number(Detail[0]) << 8) + Number(Detail[1]);
        const ItemPointKeypadUser = (Number(Detail[3]) << 8) + Number(Detail[4]);

        // More data to come
        if(ItemPointKeypadUser === 0xFFFF){
          const LastDetail = Data.slice((i-1)*ChunkLength, (i-1)*ChunkLength + ChunkLength);
          const LastArea = ( LastDetail[0] << 8) + LastDetail[1];
          const LastItemPointKeypadUser = (LastDetail[3] << 8) + LastDetail[4];
          if(!await this.Mode2ReqAlarmMemoryDetail_CF01(AlarmPriority, LastArea, LastItemPointKeypadUser)){
            return false;
          }
        }

        const Area = this.Controller.Areas[AreaNumber];
        if(Area !== undefined){
          if(Area.AddAlarm(AlarmPriority)){
            this.Controller.emit('AreaAlarmStateChange', Area);
          }
        }
      }

      return true;
    }

    // Function Mode2ReqConfiguredAreas
    // Return all configured areas the user has authority over in the panel,
    // Supported in protocol version 1.14
    //
    async Mode2ReqConfiguredAreas():Promise<boolean>{

      const Protocol = new Uint8Array([this.ProtocolId]);
      const Command = new Uint8Array([0x24]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'Mode2ReqConfiguredAreas, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqConfiguredAreas')){
        return false;
      }

      const BitMaskArray = new Uint8Array([0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]);
      const ActiveAreaMaskArray = Res!.slice(3, Res!.length);

      if(ActiveAreaMaskArray.length > 16){
        this.Controller.emit('ControllerError', BGControllerError.MaxAreaNumberError, 'Mode2ReqConfiguredAreas');
        return false;
      }

      for (let i = 0; i < ActiveAreaMaskArray.length ; i++) {
        const ActiveAreaMask = Number(ActiveAreaMaskArray[i]);

        for(let j = 0; j < 8; j++){
          const AreaNumber = (i*8)+j+1;

          if(AreaNumber > this.Controller.MaxAreas){
            break;
          }

          if(ActiveAreaMask & BitMaskArray[j]){
            this.Controller.Areas[AreaNumber] = new BGArea(AreaNumber);
          }
        }
      }

      return true;
    }

    // Function  Mode2ReqAreaStatus_CF01()
    // Return Area status
    // Supported in Protocol Version 1.23
    //
    async Mode2ReqAreaStatus_CF01():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 23, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqAreaStatus_CF01, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const MaxPair = 50;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x26]);
      const CommandFormat = new Uint8Array([]);

      let Data = new Uint8Array();

      for( const AreaNumber in this.Controller.Areas){
        const High = (Number(AreaNumber) >> 8) & 0xFF;
        const Low = Number(AreaNumber) & 0xFF;
        const Value = [High, Low];

        const Temp = new Uint8Array(Data.length + Value.length);
        Temp.set(Data, 0);
        Temp.set(Value, Data.length);
        Data = Temp;

        if((Data.length) / 2 >= MaxPair){
          //
          //Data = new Uint8Array();
        }
      }

      if(Data.length > 0){

        const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
        this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

        let Res: string | Buffer | undefined;
        do{
          Res = await this.Controller.PromiseS.read();
        } while(Res![0] !== this.ProtocolId);

        if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqAreaStatus_CF01')){
          return false;
        }

        Res = Res!.slice(3, Res!.length);

        for(let i = 0 ; i < Res.length/3 ; i++){
          const High = Number(Res[i*3]);
          const Low = Number(Res[(i*3) + 1]);
          const Status = Number(Res[(i*3)+2]);
          const AreaNumber = (High << 8) + Low;

          const Area = this.Controller.Areas[AreaNumber];
          if(Area.AreaStatus !== Status){
            Area.AreaStatus = Status;
            this.Controller.emit('AreaOnOffStateChange', Area);
          }
        }
      }
      return true;
    }

    // Function Mode2ArmPanelAreas
    // This command retrieves area text for the specified area
    // Supported in protocol version
    //
    async Mode2ArmPanelAreas(AreaToArm: number[], ArmingType: BGArmingType):Promise<boolean>{

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x27]);
      const CommandFormat = new Uint8Array([ArmingType]);

      let TotalAreaMask = new Uint8Array([]);

      // Maximum of 128 areas
      // 16 bytes maximum
      for(let i = 0 ; i < Math.ceil(this.Controller.MaxAreas/8) ; i++){

        let LocalAreaMask = 0;

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

      const command = this.FormatCommand(Protocol, Command, CommandFormat, TotalAreaMask);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFC, 'Mode2ArmPanelAreas')){
        return false;
      }

      return true;
    }

    // Function Mode2ReqAreaText_CF01
    // This command retrieves area text for the specified area
    // Supported in protocol version 1.23
    //
    async Mode2ReqAreaText_CF01():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 23, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqAreaText_CF01, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x29]);
      const CommandFormat = new Uint8Array([]);

      for (const Area in this.Controller.Areas){
        const High = (Number(Area) >> 8) & 0xFF;
        const Low = Number(Area) & 0xFF;
        const Data = new Uint8Array([High, Low, 0]);

        const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
        this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

        let Res: string | Buffer | undefined;
        do{
          Res = await this.Controller.PromiseS.read();
        } while(Res![0] !== this.ProtocolId);

        if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqAreaText_CF01')){
          return false;
        }

        let i = 3;
        let AreaText = '';
        while(Res![i] !== 0x00){
          const Read = Res![i];
          AreaText += String.fromCharCode(Number(Read));
          i++;
        }

        if(this.Controller.Areas[Number(Area)]!== undefined){
          this.Controller.Areas[Number(Area)].AreaText = AreaText;
        }
      }

      return true;
    }

    // Function Mode2ReqAreaText_CF03
    // This command retrieves area text for the specified area
    // Supported in protocol version 2.5
    //
    async Mode2ReqAreaText_CF03(LastAreaRead:number):Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(2, 5, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPanelCapacitie, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const Protocol = new Uint8Array([this.ProtocolId]);
      const Command = new Uint8Array([0x29]);
      const CommandFormat = new Uint8Array([]);

      const High = (LastAreaRead >> 8) & 0xFF;
      const Low = LastAreaRead & 0xFF;
      const Data = new Uint8Array([High, Low, 0, 1]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqAreaText_CF03')){
        return false;
      }

      Res = Res!.slice(3, Res!.length);

      // No more data to be read, all point text has been received from panel
      if(Res!.length <= 1){
        return true;
      }

      let i = 0;
      while(i < Res!.length){
        const AreaNumber = (Number(Res![i++]) << 8) + Number(Res![i++]);
        let AreaText = '';

        while(i < Res!.length){
          const Read = Number(Res![i++]);
          if(Read !== 0){
            AreaText += String.fromCharCode(Read);

          } else{
            // read a zero: done reading text
            const Area = this.Controller.Areas[AreaNumber];
            if(Area !== undefined){
              Area.AreaText = AreaText;
            }

            if(i === Res!.length){
              await this.Mode2ReqAreaText_CF03(AreaNumber);
            }
            break;
          }
        }
      }

      return true;
    }

    // Function Mode2ReqConfiguredOutputs()
    // Returns configured panel outputs
    // Supported in Protocol Version 1.14
    //
    async Mode2ReqConfiguredOutputs():Promise<boolean>{
      const Protocol = new Uint8Array([this.ProtocolId]);
      const Command = new Uint8Array([0x30]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqConfiguredOutputs, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqConfiguredOutputs')){
        return false;
      }

      const BitMaskArray = new Uint8Array([0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]);
      const ConfiguredOutputMaskArray = Res!.slice(3, Res!.length);

      if(ConfiguredOutputMaskArray.length * 8 > this.Controller.BoschMaxOutputs){
        this.Controller.emit('ControllerError', BGControllerError.MaxOutputNumberError,
          'This controller ony support ' + this.Controller.BoschMaxOutputs + ' outputs');
        return false;
      }

      for(let i = 0 ; i < ConfiguredOutputMaskArray.length ; i++){
        for(let j = 0 ; j < 8 ; j++){
          if(Number(ConfiguredOutputMaskArray[i]) & BitMaskArray[j]){
            const OutputNumber = (i*8) + j + 1;
            this.Controller.Outputs[OutputNumber] = new BGOutput(OutputNumber);
          }
        }
      }

      return true;
    }

    // Function Mode2ReqOutputStatus()
    // Return panel outputs
    // Supported in Protocol Version 1.14
    //
    async Mode2ReqOutputStatus():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqOutputStatus, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x31]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqOutputStatus')){
        return false;
      }

      Res = Res!.slice(3, Res!.length);

      for (const OutputNumer in this.Controller.Outputs){
        const Output = this.Controller.Outputs[OutputNumer];
        const Num = Number(OutputNumer);
        const Index = Math.floor(Num/8);

        // If response if empty, no active output on panel
        let NewStatus = false;

        if(Index < Res.length){
          const Byte = Number(Res[Index]);
          const Residu = Num - (Index * 8);
          NewStatus = ((Byte & Math.pow(2, 8-Residu)) > 0);
        }

        if(Output.OutputState !== NewStatus || this.Controller.InitialRun === true){
          Output.OutputState = NewStatus;
          this.Controller.emit('OutputStateChange', Output);
        }
      }

      this.Controller.InitialRun = false;
      return true;
    }

    // Function Mode2SetOutputState_CF01()
    // Set output state
    // Supported in Protocol Version 1.14
    //
    async Mode2SetOutputState_CF01(OutputNumber: number, OutputState: boolean):Promise<boolean>{
      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2SetOutputState_CF01, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x32]);
      const CommandFormat = new Uint8Array([]);
      const ONumber = OutputNumber & 0xFF;

      let State = 0;
      if(OutputState){
        State = 1;
      }

      const Data = new Uint8Array([ONumber, State]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFC, 'Mode2SetOutputState_CF01')){
        return false;
      }

      return true;
    }

    // Function SendMode2SetOutputState_CF02()
    // Set output state
    // Supported in Protocol Version 2.5
    //
    async Mode2SetOutputState_CF02(OutputNumber: number, OutputState: boolean):Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(2, 5, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'Mode2SetOutputState_CF02, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const Protocol = new Uint8Array([this.ProtocolId]);
      const Command = new Uint8Array([0x32]);
      const CommandFormat = new Uint8Array([]);
      const MSB = (OutputNumber >> 8) & 0xFF;
      const LSB = OutputNumber & 0xFF;

      let State = 0;
      if(OutputState){
        State = 1;
      }

      const Data = new Uint8Array([MSB, LSB, State]);
      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);

      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFC, 'Mode2SetOutputState_CF02')){
        return false;
      }

      return true;
    }

    // Function Mode2ReqOutputText_CF01()
    // This command retrieves output text
    // Supported in Protocol Version 1.14
    // Command Format 1
    async Mode2ReqOutputText_CF01():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqOutputText_CF01, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x33]);
      const CommandFormat = new Uint8Array([]);

      for (const Output in this.Controller.Outputs){
        const Data = new Uint8Array([ Number(Output) & 0xFF, 0]);

        const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
        this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

        let Res: string | Buffer | undefined;
        do{
          Res = await this.Controller.PromiseS.read();
        } while(Res![0] !== this.ProtocolId);

        if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqOutputText_CF01')){
          return false;
        }

        let i = 3;
        let OutputText = '';
        while(Res![i] !== 0x00){
          const Read = Res![i];
          OutputText += String.fromCharCode(Number(Read));
          i++;
        }

        if(this.Controller.Outputs[Number(Output)]!== undefined){
          this.Controller.Outputs[Number(Output)].OutputText = OutputText;
        }
      }
      return true;
    }

    // Function Mode2ReqOutputText_CF03()
    // This command retrieves output text
    // Supported in Protocol Version 2.5
    //
    async Mode2ReqOutputText_CF03(OutputNumber):Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(2, 5, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqOutputText_CF03, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x33]);
      const CommandFormat = new Uint8Array([]);
      const MSB = (OutputNumber >> 8) & 0xFF;
      const LSB = OutputNumber & 0xFF;
      const Data = new Uint8Array([MSB, LSB, 0, 1]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqOutputText_CF03')){
        return false;
      }

      Res = Res!.slice(3, Res!.length);

      if(Res!.length <= 1){
        return true;
      }

      let i = 0;
      while(i < Res!.length){
        const OutputNumber = (Number(Res![i++]) << 8) + Number(Res![i++]);
        let OutputText = '';

        while(i < Res!.length){
          const Read = Number(Res![i++]);
          if(Read !== 0){
            OutputText += String.fromCharCode(Read);
          } else{

            // read a zero: done reading text
            const Output = this.Controller.Outputs[OutputNumber];
            if(Output !== undefined){
              Output.OutputText = OutputText;
            }

            if(i === Res!.length){
              await this.Mode2ReqOutputText_CF03(OutputNumber);
            }
            break;
          }
        }
      }
      return true;
    }

    // Function Mode2ReqPointsInArea
    // This returns a mask of all configured points in an area that the user has authority over
    // Supported in protocol version 1.23
    //
    async Mode2ReqPointsInArea():Promise<boolean>{

      const Protocol = new Uint8Array([this.ProtocolId]);
      const Command = new Uint8Array([0x36]);
      const CommandFormat = new Uint8Array([]);

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 23, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPointsInArea, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      for (const AreaNumber in this.Controller.Areas){
        const Data = new Uint8Array([0, Number(AreaNumber)]);

        const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
        this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

        let Res: string | Buffer | undefined;
        do{
          Res = await this.Controller.PromiseS.read();
        } while(Res![0] !== this.ProtocolId);

        if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqPointsInArea')){
          return false;
        }

        const ActivePointMaskArray = Res!.slice(3, Res!.length);

        for (let i = 0; i < ActivePointMaskArray.length ; i++) {
          const ActiveAreaMask = Number(ActivePointMaskArray[i]);

          for(let j = 0; j < 8; j++){
            const PointNumber = (i*8)+j+1;

            if(PointNumber > this.Controller.MaxPoints){
              break;
            }

            if(ActiveAreaMask & Math.pow(2, 7-j)){
              this.Controller.Points[PointNumber] = new BGPoint(PointNumber, Number(AreaNumber));
            }
          }
        }
      }

      return true;
    }

    // Function Mode2ReqPointsStatus()
    // This returns a list of up to 66 pairs of point numbers and their status
    // Supported in Protocol Version 1.14
    //
    async Mode2ReqPointsStatus():Promise<boolean>{
      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPointsStatus, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const MaxPair = 66;
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x38]);
      const CommandFormat = new Uint8Array([]);

      let Data = new Uint8Array();

      for( const PointNumber in this.Controller.Points){
        const High = (Number(PointNumber) >> 8) & 0xFF;
        const Low = Number(PointNumber) & 0xFF;
        const Value = [High, Low];

        const Temp = new Uint8Array(Data.length + Value.length);
        Temp.set(Data, 0);
        Temp.set(Value, Data.length);
        Data = Temp;

        if((Data.length) / 2 >= MaxPair){
          const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
          this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

          let Res: string | Buffer | undefined;
          do{
            Res = await this.Controller.PromiseS.read();
          } while(Res![0] !== this.ProtocolId);

          if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqPointsStatus')){
            return false;
          }

          Res = Res!.slice(3, Res!.length);
          const Pair = Res!.length/3;

          for(let i = 0; i<Pair ; i++){
            const High = Number(Res[i*3]);
            const Low = Number(Res[(i*3)+1]);
            const NewStatus = Number(Res[(i*3)+2]);
            const PointNumber = (High << 8) + Low;

            const Point = this.Controller.Points[PointNumber];
            if(Point !== undefined){
              if(Point.UpdateStatus(NewStatus)){
                this.Controller.emit('PointStatusChange', Point);
              }
            }
          }

          Data = new Uint8Array();
        }
      }

      if(Data.length > 0){
        const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
        this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

        let Res: string | Buffer | undefined;
        do{
          Res = await this.Controller.PromiseS.read();
        } while(Res![0] !== this.ProtocolId);

        if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqPointsStatus')){
          return false;
        }

        Res = Res!.slice(3, Res!.length);
        const Pair = Res!.length/3;

        for(let i = 0; i<Pair ; i++){
          const High = Number(Res[i*3]);
          const Low = Number(Res[(i*3)+1]);
          const NewStatus = Number(Res[(i*3)+2]);
          const PointNumber = (High << 8) + Low;

          const Point = this.Controller.Points[PointNumber];
          if(Point !== undefined){
            if(Point.UpdateStatus(NewStatus)){
              this.Controller.emit('PointStatusChange', Point);
            }
          }
        }
      }

      return true;
    }

    // Function Mode2ReqPointText_CF01()
    // Returns the text for multiple points
    // Supported in Protocol Version 1.14
    // Command format 1
    //
    async Mode2ReqPointText_CF01():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPointText_CF01, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x3C]);
      const CommandFormat = new Uint8Array([]);

      for(const Point in this.Controller.Points){
        const High = (Number(Point) >> 8) & 0xFF;
        const Low = Number(Point) & 0xFF;
        const Data = new Uint8Array([High, Low, 0]);

        const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
        this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

        let Res: string | Buffer | undefined;
        do{
          Res = await this.Controller.PromiseS.read();
        } while(Res![0] !== this.ProtocolId);

        if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqPointText_CF01')){
          return false;
        }

        let i = 3;
        let PointText = '';
        while(Res![i] !== 0x00){
          const Read = Res![i];
          PointText += String.fromCharCode(Number(Read));
          i++;
        }

        if(this.Controller.Points[Number(Point)]!== undefined){
          this.Controller.Points[Number(Point)].PointText = PointText;
        }
      }

      return true;
    }

    // Function Mode2ReqPointText_CF03()
    // Returns the text for multiple points
    // Supported in Protocol Version 2.5
    // Command Format 3
    //
    async Mode2ReqPointText_CF03(LastPointRead:number):Promise<boolean> {

      // Check min supported version
      const MinVersion = new BGProtocolVersion(2, 5, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'SendMode2ReqPointText_CF03, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([this.ProtocolId]);
      const Command = new Uint8Array([0x3C]);
      const CommandFormat = new Uint8Array([]);

      const High = (LastPointRead >> 8) & 0xFF;
      const Low = LastPointRead & 0xFF;

      const Data = new Uint8Array([High, Low, 0, 1]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2ReqPointText_CF03')){
        return false;
      }

      Res = Res!.slice(3, Res!.length);

      // No more data to be read, all point text has been received from panel
      if(Res!.length <= 1){
        return true;
      }

      let i = 0;
      while(i < Res!.length){
        const PointNumber = (Number(Res![i++]) << 8) + Number(Res![i++]);
        let PointText = '';

        while(i < Res!.length){
          const Read = Number(Res![i++]);
          if(Read !== 0){
            PointText += String.fromCharCode(Read);
          } else{
            // read a zero: done reading text
            const Point = this.Controller.Points[PointNumber];
            if(Point !== undefined){
              Point.PointText = PointText;
            }

            if(i === Res!.length){
              await this.Mode2ReqPointText_CF03(PointNumber);
            }

            break;
          }
        }
      }

      return true;
    }

    // Function Mode2LoginRSCUser
    // User Based Remote Access Connection Only
    // Command Format 1
    // Supported in protocol version 1.14
    //
    async Mode2LoginRSCUser():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(1, 14, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'Mode2LoginRSCUser, Expecting IIP version >= ' + MinVersion.toSring());
        return false;
      }

      // Check passcode length
      if(this.Controller.Passcode.length < 3 || this.Controller.Passcode.length > 8){
        this.Controller.emit('ControllerError', BGControllerError.PasscodeLengthError, 'Invalid Passcode Length');
        return false;
      }

      // Check passcode
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x3E]);
      const CommandFormat = new Uint8Array([]);

      const PasscodeMSB1 = Number(this.Controller.Passcode[0]) << 4;
      const PasscodeMSB2 = Number(this.Controller.Passcode[1]);
      const PasscodeMSB = PasscodeMSB1 + PasscodeMSB2;
      const PasscodeBody1 = Number(this.Controller.Passcode[2]) << 4;

      let PasscodeBody2 = 0xF;
      if(this.Controller.Passcode.length >= 4){
        PasscodeBody2 = Number(this.Controller.Passcode[3]);
      }

      let PasscodeBody3 = 0xF;
      if(this.Controller.Passcode.length >= 5){
        PasscodeBody3 = Number(this.Controller.Passcode[4]);
      }
      PasscodeBody3 = PasscodeBody3 << 4;

      let PasscodeBody4 = 0xF;
      if(this.Controller.Passcode.length >= 6){
        PasscodeBody4 = Number(this.Controller.Passcode[5]);
      }

      let PasscodeLSB1 = 0xF;
      if(this.Controller.Passcode.length >= 7){
        PasscodeLSB1 = Number(this.Controller.Passcode[6]);
      }
      PasscodeLSB1 = PasscodeLSB1 << 4;

      let PasscodeLSB2 = 0xF;
      if(this.Controller.Passcode.length >= 8){
        PasscodeLSB2 = Number(this.Controller.Passcode[7]);
      }

      const PasscodeLSB = PasscodeLSB1 + PasscodeLSB2;
      const Data = new Uint8Array([PasscodeMSB, PasscodeBody1 + PasscodeBody2, PasscodeBody3+PasscodeBody4, PasscodeLSB]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFE, 'Mode2LoginRSCUser')){
        return false;
      }

      return true;
    }

    // Function Mode2SetSubscriptions_CF01()
    // This command requests a list of subscriptions to asynchronous panel status messages
    // Supported in Protocol Version 5.0
    // Command Format 1
    //
    async Mode2SetSubscriptions_CF01():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(5, 0, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'Mode2SetSubscriptions_CF01, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x5F]);
      const CommandFormat = new Uint8Array([0x01]);

      const ConfidenceMsg = new Uint8Array([0x01]);
      const EventMem = new Uint8Array([0x01]);
      const EventLog = new Uint8Array([0x00]);
      const ConfigChange = new Uint8Array([0x00]);
      const AreaOnOff = new Uint8Array([0x01]);
      const AreaReady = new Uint8Array([0x01]);
      const OutputState = new Uint8Array([0x01]);
      const PointState = new Uint8Array([0x01]);
      const DoorState = new Uint8Array([0x00]);
      const WalkTestType = new Uint8Array([0x00]);

      const Data = new Uint8Array([ConfidenceMsg[0], EventMem[0], EventLog[0],
        ConfigChange[0], AreaOnOff[0], AreaReady[0], OutputState[0], PointState[0], DoorState[0], WalkTestType[0]]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFC, 'Mode2SetSubscriptions_CF01')){
        return false;
      }

      this.Controller.PanelReceivingNotifcation = true;
      this.Controller.emit('PanelReceivingNotifiation', this.Controller.PanelReceivingNotifcation);
      return true;
    }

    // Function Mode2SetSubscriptions_CF02()
    // This command requests a list of subscriptions to asynchronous panel status messages
    // Supported in Protocol Version 5.0
    // Command Format 1
    //
    async Mode2SetSubscriptions_CF02():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(5, 81, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'Mode2SetSubscriptions_CF01, Expecting IIP version >= ' + MinVersion.toSring());
      }

      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x5F]);
      const CommandFormat = new Uint8Array([0x02]);

      const ConfidenceMsg = new Uint8Array([0x01]);
      const EventMem = new Uint8Array([0x01]);
      const EventLog = new Uint8Array([0x00]);
      const ConfigChange = new Uint8Array([0x00]);
      const AreaOnOff = new Uint8Array([0x01]);
      const AreaReady = new Uint8Array([0x01]);
      const OutputState = new Uint8Array([0x01]);
      const PointState = new Uint8Array([0x01]);
      const DoorState = new Uint8Array([0x00]);
      const WalkTestType = new Uint8Array([0x00]);
      const RequestPanelSystem = new Uint8Array([0x00]);
      const WirelessLeanModeState = new Uint8Array([0x00]);


      const Data = new Uint8Array([ConfidenceMsg[0], EventMem[0], EventLog[0],
        ConfigChange[0], AreaOnOff[0], AreaReady[0], OutputState[0], PointState[0], DoorState[0], WalkTestType[0], RequestPanelSystem[0],
        WirelessLeanModeState[0]]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFC, 'Mode2SetSubscriptions_CF02')){
        return false;
      }

      this.Controller.PanelReceivingNotifcation = true;
      this.Controller.emit('PanelReceivingNotifiation', this.Controller.PanelReceivingNotifcation);
      return true;
    }

    // Function Mode2SetSubscriptions_CF03()
    // This command requests a list of subscriptions to asynchronous panel status messages
    // Supported in Protocol Version 5.208
    // Command Format 3
    //
    async Mode2SetSubscriptions_CF03():Promise<boolean>{

      // Check min supported version
      const MinVersion = new BGProtocolVersion(5, 208, 0);
      if(!this.Controller.PanelIIPVersion.GTE(MinVersion)){
        this.Controller.emit('ControllerError', BGControllerError.InvalidProtocolVersion,
          'Mode2SetSubscriptions_CF03, Expecting IIP version >= ' + MinVersion.toSring());
      }

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

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFC, 'Mode2SetSubscriptions_CF03')){
        return false;
      }

      this.Controller.PanelReceivingNotifcation = true;
      this.Controller.emit('PanelReceivingNotifiation', this.Controller.PanelReceivingNotifcation);
      return true;
    }

    async Mode2TerminateSession():Promise<boolean>{
      const Protocol = new Uint8Array([0x01]);
      const Command = new Uint8Array([0x05]);
      const CommandFormat = new Uint8Array([]);
      const Data = new Uint8Array([]);

      const command = this.FormatCommand(Protocol, Command, CommandFormat, Data);
      this.Controller.PromiseS.write(Buffer.alloc(command.length, command));

      let Res: string | Buffer | undefined;
      do{
        Res = await this.Controller.PromiseS.read();
      } while(Res![0] !== this.ProtocolId);

      if(!this.ValidateResponse(Res!, 0xFC, 'Mode2TerminateSession')){
        return false;
      }

      return true;
    }
}