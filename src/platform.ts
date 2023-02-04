import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { BGPanelType, BGUserType, BGAreaStatus, BGAlarmPriority } from './BGConst';
import { BGController, BGControllerError } from './BGController';
import { BGPointStatus} from './BGPoint';
import { HKSecurityPanel } from './HKSecurityPanel';
import { HKMotionSensor } from './HKMotionSensor';
import { HKContactSensor } from './HKContactSensor';
import { HKLeakSensor } from './HKLeakSensor';
import { HKSmokeSensor } from './HKSmokeSensor';
import { HKCOSensor } from './HKCOSensor';
import { HKSensor } from './HKSensor';
import { HKOutputAccessory } from './HKOutputAccessory';
import { HKAlarmSensor } from './HKAlarmSensor';

export enum BGSensorType {
  MotionSensor = 'MotionSensor',
  ContactSensor = 'ContactSensor',
  LeakSensor = 'LeakSensor',
  SmokeSensor = 'SmokeSensor',
  COSensor = 'COSensor'
}

export class HB_BoschControlPanel_BGSeries implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public accessories: PlatformAccessory[] = [];
  public CreatedAccessories: PlatformAccessory[] = [];

  private PanelHost = '';
  private PanelPort = 14999;
  private PanelPasscode = '';
  private ForceLegacyMode = false;
  public readonly Panel: BGController;

  private PointsArray:Record<number, HKSensor> = {};
  private OutputsArray:Record<number, HKOutputAccessory> = {};
  private ControlPanelArray: HKSecurityPanel[] = [];

  private InitialRun = true;
  private ReceivingPanelNotification = false;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    if(!this.CheckConfigPhase1()){
      log.error('Aborting plugin operation - Failed Config Phase 1 (Host, Port or Passcode error)');
      this.Panel = new BGController(this.PanelHost, this.PanelPort, BGUserType.AutomationUser,
        this.PanelPasscode, false);
      return;
    }

    this.Panel = new BGController(this.PanelHost, this.PanelPort, BGUserType.AutomationUser, this.PanelPasscode,
      this.ForceLegacyMode);

    this.api.on('didFinishLaunching', () => {
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.push(accessory);
  }

  // First config check
  // check if panel host, port and passcode are set
  CheckConfigPhase1():boolean{
    const Host = this.config.Host;
    const Port = this.config.Port;
    const Passcode = this.config.Passcode;
    const ForceLegacyMode = this.config.ForceLegacyMode;


    if(Host !== undefined && Host !== ''){
      if(Port !== undefined && !isNaN(Port)){
        if(Passcode !== undefined && Passcode !== ''){
          this.PanelHost = Host;
          this.PanelPort = Port;
          this.PanelPasscode = Passcode;

          if(ForceLegacyMode !== undefined){
            this.ForceLegacyMode = ForceLegacyMode;
          }

          return true;
        }
      }
    }
    return false;
  }

  // Second config check
  // Check that areas exist whitout any duplicates
  // Check that points exist whitout any duplicates
  // Check that outputs exit without any duplicates
  CheckConfigPhase2():boolean{

    const TempPoint: number[] = [];
    const TempArea: number[] = [];
    const TempOutput: number[] = [];

    // Points
    if(this.config.Points !== undefined){
      for(const Point of this.config.Points){

        // Point in config not found in panel;
        if(this.Panel.GetPoints()[Point.PointNumber] === undefined ){
          this.log.error('Aborting: Point ' + Point.PointNumber + ' in config file is not configured on the panel');
          return false;
        }

        //Check for duplicate point
        if(TempPoint.indexOf(Point.PointNumber) !== -1){
          this.log.error('Aborting: Dupicate Point ' + Point.PointNumber + ' in config file');
          return false;
        }

        TempPoint.push(Point.PointNumber);
      }
    }

    // Areas

    if(this.config.Areas !== undefined){
      for(const Area of this.config.Areas){

        if(this.Panel.GetAreas()[Area.AreaNumber] === undefined){
          this.log.error('Aborting: Area ' + Area.AreaNumber + ' in config file is not configured on the panel');
          return false;
        }

        //Check for duplicate area
        if(TempArea.indexOf(Area.AreaNumber) !== -1){
          this.log.error('Aborting: Duplicate Area ' + Area.AreaNumber + ' in config file');
          return false;
        }

        // Check for Area In Scope (coma separated number values)
        if(Area.AreaInScope === undefined || Area.AreaInScope === ''){
          continue;
        } else{
          const ScopeStringArray = Area.AreaInScope.split(',');
          const ScopeNumberArray:number[] = [];

          for(let i = 0 ; i < ScopeStringArray.length ; i ++){

            // check for valid numeric area number
            if(this.Panel.GetAreas()[ScopeStringArray[i]] === undefined){
              this.log.error('Aborting: Area' + Area.AreaNumber +', Area Scope Error in config file (invalid Area argument: \''
              + ScopeStringArray[i] +'\'');
              return false;
            }

            // check for duplicate area
            if(ScopeNumberArray.indexOf(Number(ScopeStringArray[i])) !== -1){
              this.log.error('Aborting: Area' + Area.AreaNumber +', Area Scope Error in config file (duplicate Area argument: '
              + ScopeStringArray[i]);
              return false;
            }
            ScopeNumberArray.push(Number(ScopeStringArray[i]));
          }
        }

        TempArea.push(Area.AreaNumber);
      }
    }

    // Outputs
    if(this.config.Outputs !== undefined){
      for(const Output of this.config.Outputs){

        if(this.Panel.GetOutputs()[Output.OutputNumber] === undefined){
          this.log.error('Aborting: Output' + Output.OutputNumber + ' in config file is not configured on the panel');
          return false;
        }

        //Check for duplicate output
        if(TempOutput.indexOf(Output.OutputNumber) !== -1){
          this.log.error('Aborting: Duplicate Output' + Output.OutputNumber + ' in config file');
          return false;
        }

        TempOutput.push(Output.OutputNumber);
      }
    }

    return true;
  }

  private DiscoverOutputs(){

    // Return if no Outputs are configured in config file
    if(this.config.Outputs === undefined){
      return;
    }

    for(const Output of this.config.Outputs){

      if(Output.Active){
        this.OutputsArray[Output.OutputNumber] = new HKOutputAccessory(this, Output.OutputNumber);
      }
    }
  }

  private DiscoverAreas(){

    // Return if no Areas are configured in config file
    if(this.config.Areas === undefined){
      return;
    }

    for(const Area of this.config.Areas){
      const AreaInScope:number[] = [];
      const PasscodeFollowsScope = Area.PasscodeFollowsScope;

      if(Area.Active){
        if(Area.AreaInScope !== undefined && Area.AreaInScope !== ''){
          const ScopeStringArray = Area.AreaInScope.split(',');
          for(let i = 0 ; i < ScopeStringArray.length ; i ++){
            AreaInScope.push(Number(ScopeStringArray[i]));
          }
        }

        this.ControlPanelArray.push(new HKSecurityPanel(this, Area.AreaNumber, AreaInScope, PasscodeFollowsScope));
      }
    }
  }

  private DiscoverPoints(){

    // Return if no Points are configured in config file
    if(this.config.Points === undefined){
      return;
    }

    for(const Point of this.config.Points){
      if(Point.Active){

        switch(Point.SensorType){

          case BGSensorType.MotionSensor:{
            this.PointsArray[Point.PointNumber] = new HKMotionSensor(this, Point.PointNumber);
            break;
          }

          case BGSensorType.ContactSensor:{
            this.PointsArray[Point.PointNumber] =new HKContactSensor(this, Point.PointNumber);
            break;
          }

          case BGSensorType.LeakSensor :{
            this.PointsArray[Point.PointNumber] = new HKLeakSensor(this, Point.PointNumber);
            break;
          }

          case BGSensorType.SmokeSensor :{
            this.PointsArray[Point.PointNumber] = new HKSmokeSensor(this, Point.PointNumber);
            break;
          }

          case BGSensorType.COSensor :{
            this.PointsArray[Point.PointNumber] = new HKCOSensor(this, Point.PointNumber);
            break;
          }
        }
      }
    }
  }

  private DiscoverMasterAlarm(){

    if(this.config.MasterFireAlarm){
      this.CreateMasterAlarm('Fire', 0);
    }

    if(this.config.MasterGazAlarm){
      this.CreateMasterAlarm('Gaz', 0);
    }

    if(this.config.MasterBurglaryAlarm){
      this.CreateMasterAlarm('Burglary', 0);
    }

    if(this.config.MasterPersonnalAlarm){
      this.CreateMasterAlarm('Personnal', 0);
    }
  }

  private DeviceCacheCleanUp(){
    // Do some cleanup of point that have been restored and are not in config file anymore
    for(let i = 0; i< this.accessories.length;i++){
      if(this.CreatedAccessories.indexOf(this.accessories[i]) === -1){
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.accessories[i]]);
      }
    }
  }

  discoverDevices() {
    this.Panel.on('PanelReadyForOperation', () => {

      // Phase 2 config file check
      if(!this.CheckConfigPhase2()){
        this.log.error('Aborting plugin operation - Failed Config Phase 2');
        return;
      }

      this.DumpPanelInfo();

      if(this.InitialRun){
        this.log.info('-----------------------------------------');
        this.log.info('Configuring Homebridge plugin accessories');
        this.log.info('-----------------------------------------');
        this.DiscoverAreas();
        this.DiscoverPoints();
        this.DiscoverOutputs();
        this.DiscoverMasterAlarm();
        this.DeviceCacheCleanUp();
        this.InitialRun = false;
      }

      // Start panel event notifications.
      this.log.info('-----------------------------------------');
      this.log.info('Starting Control Panel Operation');
      this.log.info('-----------------------------------------');
      this.Panel.StartOperation();
    });

    this.Panel.on('PanelReceivingNotifiation', (PanelReceivingNotification) =>{
      if(!PanelReceivingNotification){
        // fault device
      }
    });

    this.Panel.on('PointStatusChange', (Point) => {
      const message = 'Panel: Point' + Point.PointNumber + '(' + Point.PointText + '): ' + BGPointStatus[Point.PointStatus];
      this.AdvanceLog(this.config.LogPoint, message);

      if(this.PointsArray[Point.PointNumber] !== undefined){
        this.PointsArray[Point.PointNumber].HandleEventDetected(Point.PointStatus);
      }
    });

    this.Panel.on('OutputStateChange', (Output)=>{
      const message = 'Panel: Output' + Output.OutputNumber + '(' + Output.OutputText + '): ' + Output.OutputState;
      this.AdvanceLog(this.config.LogOutput, message);

      if(this.OutputsArray[Output.OutputNumber] !== undefined){
        this.OutputsArray[Output.OutputNumber].HandleOutputChange(Output.OutputState);
      }
    });

    this.Panel.on('AreaAlarmStateChange', (Area)=>{

      if(Area.GetIsAlarmNominal()){
        const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): AlarmState: Normal';
        this.AdvanceLog(this.config.LogAreaAlarm, message);
      } else{

        const FireAlarm = Area.GetFireAlarm();
        if(FireAlarm.length > 0){
          for (const Alarm of FireAlarm){
            const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): Fire - ' + BGAlarmPriority[Alarm];
            this.AdvanceLog(this.config.LogAreaAlarm, message);
          }
        }

        const BurglaryAlarm = Area.GetBurglaryAlarm();
        if(BurglaryAlarm.length > 0){
          for (const Alarm of BurglaryAlarm){
            const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): Burglary - ' + BGAlarmPriority[Alarm];
            this.AdvanceLog(this.config.LogAreaAlarm, message);
          }
        }

        const GazAlarm = Area.GetGazAlarm();
        if(GazAlarm.length > 0){
          for (const Alarm of GazAlarm){
            const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): Gas - ' + BGAlarmPriority[Alarm];
            this.AdvanceLog(this.config.LogAreaAlarm, message);
          }
        }

        const PersonnalAlarm = Area.GetPersonnalAlarm();
        if(PersonnalAlarm.length > 0 ){
          for (const Alarm of BurglaryAlarm){
            const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): Personnal - ' + BGAlarmPriority[Alarm];
            this.AdvanceLog(this.config.LogAreaAlarm, message);
          }
        }
      }
    });

    // Set notification management for Confidence messages sent by panel
    this.Panel.on('ConfidenceMessage', () => {
      const message = 'Panel: Received Confidence Message';
      this.AdvanceLog(this.config.LogConfidenceMessage, message);
      this.ReceivingPanelNotification = true;
    });

    this.Panel.on('AreaOnOffStateChange', (Area)=>{
      const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): ' + BGAreaStatus[Area.AreaStatus];
      this.AdvanceLog(this.config.LogAreaArmingStatus, message);
    });

    this.Panel.on('ControllerError', (Error, ErrorString) => {
      this.log.error(Error + ' (' + ErrorString + ')');

      // Reconnect if connection to panel has been lost
      if(Error === BGControllerError.ConnectionError){

        if(this.ReceivingPanelNotification === true){
          this.ReceivingPanelNotification = false;
          this.log.info('-----------------------------------------');
          this.log.info('Stopping Control Panel Operation');
          this.log.info('-----------------------------------------');
        }

        setTimeout(() => {
          this.log.info('Trying to reconnect ....');
          this.Panel.Connect();
        }, 60000); // Try to reconnect every 60 sec

      }
    });

    // Start panel initialisation
    this.Panel.Connect();
  }

  private CreateMasterAlarm(MonitoringEvent:string, MonitoringArea:number){
    const uuid = this.api.hap.uuid.generate('BGMasterAlarm' + this.Panel.PanelType + MonitoringEvent + MonitoringArea);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      new HKAlarmSensor(this, existingAccessory, this.Panel, MonitoringArea, MonitoringEvent);
      this.CreatedAccessories.push(existingAccessory);
    } else{
      const accessory = new this.api.platformAccessory('Master ' + MonitoringEvent + ' Alarm', uuid);
      new HKAlarmSensor(this, accessory, this.Panel, MonitoringArea, MonitoringEvent);
      this.CreatedAccessories.push(accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  private DumpPanelInfo(){
    this.log.info('-----------------------------------------');
    this.log.info('Bosch Control Panel Information');
    this.log.info('-----------------------------------------');
    this.log.info('Panel Type: ' + BGPanelType[this.Panel.PanelType]);
    this.log.info('Firmware: ' + this.Panel.FirmwareVersion.toSring());
    this.log.info('RPS Version: ' + this.Panel.PanelRPSProtocolVersion.toSring());
    this.log.info('Intrusion Protocol Version: ' + this.Panel.PanelIIPVersion.toSring());
    this.log.info('Execute Protocol Version: ' + this.Panel.PanelExecuteProtocolVersion.toSring());
    this.log.info('Panel Max Areas: ' + this.Panel.MaxAreas);
    this.log.info('Panel Max Points: ' + this.Panel.MaxPoints);
    this.log.info('Panel Max Outputs: ' + this.Panel.MaxOutputs);
    this.log.info('Panel Max Users: ' + this.Panel.MaxUsers);
    this.log.info('Panel Max Keypads: ' + this.Panel.MaxKeypads);
    this.log.info('Panel Max Doors: ' + this.Panel.MaxDoors);
    this.log.info('Panel Legacy Mode: ' + this.Panel.LegacyMode);
    this.log.info('Panel Using Subscriptions: '+ this.Panel.GetPanelUsingSubscription()) ;

    if(!this.ForceLegacyMode){
      this.log.debug('Protocol 0x01: ' + this.Panel.FeatureProtocol01);
      this.log.debug('Protocol 0x02: ' + this.Panel.FeatureProtocol02);
      this.log.debug('Protocol 0x03: ' + this.Panel.FeatureProtocol03);
      this.log.debug('Protocol 0x04: ' + this.Panel.FeatureProtocol04);
      this.log.debug('Protocol 0x05: ' + this.Panel.FeatureProtocol05);
      this.log.debug('Packet(512 Bytes): ' + this.Panel.Feature512BytesPacket);
      this.log.debug('Packet(1460 Bytes): ' + this.Panel.Feature1460BytesPacket);
      this.log.debug('Command 0x01 - WhatAreYou_CF01: ' + this.Panel.FeatureCommandWhatAreYouCF01);
      this.log.debug('Command 0x01 - WhatAreYou_CF02: ' + this.Panel.FeatureCommandWhatAreYouCF02);
      this.log.debug('Command 0x01 - WhatAreYou_CF03: ' + this.Panel.FeatureCommandWhatAreYouCF03 );
      this.log.debug('Command 0x01 - WhatAreYou_CF04: ' + this.Panel.FeatureCommandWhatAreYouCF04);
      this.log.debug('Command 0x01 - WhatAreYou_CF05: ' + this.Panel.FeatureCommandWhatAreYouCF05);
      this.log.debug('Command 0x01 - WhatAreYou_CF06: ' + this.Panel.FeatureCommandWhatAreYouCF06);
      this.log.debug('Command 0x01 - WhatAreYou_CF07: ' + this.Panel.FeatureCommandWhatAreYouCF07);
      this.log.debug('Command 0x24 - RequestConfiguredArea_CF01: ' + this.Panel.FeatureCommandRequestConfiguredAreaCF01 );
      this.log.debug('Command 0x27 - ArmPanelAreas_CF01: ' + this.Panel.FeatureCommandArmPanelAreasCF01 );
      this.log.debug('Command 0x29 - RequestAreaText_CF01: ' + this.Panel.FeatureCommandRequestAreaTextCF01 );
      this.log.debug('Command 0x29 - RequestAreaText_CF03: ' + this.Panel.FeatureCommandRequestAreaTextCF03 );
      this.log.debug('Command 0x30 - RequestConfiguredOutputs_CF01: ' + this.Panel.FeatureCommandRequestConfiguredOutputsCF01 );
      this.log.debug('Command 0x32 - SetOutputState_CF01: ' + this.Panel.FeatureCommandSetOutputStateCF01 );
      this.log.debug('Command 0x32 - SetOutputState_CF02: ' + this.Panel.FeatureCommandSetOutputStateCF02 );
      this.log.debug('Command 0x33 - RequestOutputText_CF01: ' + this.Panel.FeatureCommandRequestOuputTextCF01 );
      this.log.debug('Command 0x33 - RequestOutputText_CF03: ' + this.Panel.FeatureCommandRequestOuputTextCF03 );
      this.log.debug('Command 0x36 - RequestPointsInArea_CF01: ' + this.Panel.FeatureCommandRequestPointsInAreaCF01 );
      this.log.debug('Command 0x3C - RequestPointText_CF01: ' + this.Panel.FeatureCommandRequestPointTextCF01 );
      this.log.debug('Command 0x3C - RequestPointText_CF03: ' + this.Panel.FeatureCommandRequestPointTextCF03 );
      this.log.debug('Command 0x5F - SetSubscription_CF01: ' + this.Panel.FeatureCommandSetSubscriptionCF01 );
      this.log.debug('Command 0x5F - SetSubscription_CF02: ' + this.Panel.FeatureCommandSetSubscriptionCF02 );
      this.log.debug('Command 0x5F - SetSubscription_CF03: ' + this.Panel.FeatureCommandSetSubscriptionCF03 );
      this.log.debug('Command 0x5F - SetSubscription_CF04: ' + this.Panel.FeatureCommandSetSubscriptionCF04 );
      this.log.debug('Command 0x5F - SetSubscription_CF05: ' + this.Panel.FeatureCommandSetSubscriptionCF05 );
    }

    for (const AreaNumber in this.Panel.GetAreas()){
      const Area = this.Panel.GetAreas()[AreaNumber];
      this.log.info('Area' + Area.AreaNumber + ': ' + Area.AreaText);

      for(const PointNumber in this.Panel.GetPoints()){
        const Point = this.Panel.GetPoints()[PointNumber];
        if(Point.AreaNumber === Area.AreaNumber){
          this.log.info('  Point' + Point.PointNumber + ': ' + Point.PointText);
        }
      }
    }

    for (const OutputNumber in this.Panel.GetOutputs()){
      const Output = this.Panel.GetOutputs()[OutputNumber];
      this.log.info('Output' + Output.OutputNumber + ': ' + Output.OutputText);
    }
  }

  private AdvanceLog(Log:boolean, Message:string){
    if(Log){
      this.log.info(Message);
    } else{
      this.log.debug(Message);
    }
  }
}