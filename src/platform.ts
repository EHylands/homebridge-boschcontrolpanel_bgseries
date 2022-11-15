import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { BGController, BGPanelType, BGUserType, BGControllerError } from './BGController';
import { BGPoint, BGPointStatus} from './BGPoint';
import { BGAreaStatus, BGAlarmPriority } from './BGArea';
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
  private RejectUnauthorizedTLS = true;
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
        this.PanelPasscode, false, this.RejectUnauthorizedTLS);
      return;
    }

    this.Panel = new BGController(this.PanelHost, this.PanelPort, BGUserType.AutomationUser, this.PanelPasscode,
      this.ForceLegacyMode, this.RejectUnauthorizedTLS);

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
    const RejectUnauthorizedTLS = this.config.RejectUnauthorizedTLS;


    if(Host !== undefined && Host !== ''){
      if(Port !== undefined && !isNaN(Port)){
        if(Passcode !== undefined && Passcode !== ''){
          this.PanelHost = Host;
          this.PanelPort = Port;
          this.PanelPasscode = Passcode;

          if(ForceLegacyMode !== undefined){
            this.ForceLegacyMode = ForceLegacyMode;
          }

          if(RejectUnauthorizedTLS !== undefined){
            this.RejectUnauthorizedTLS = RejectUnauthorizedTLS;
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

    // Areas
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

    // Outputs
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

    return true;
  }

  private DiscoverOutputs(){

    for(const Output of this.config.Outputs){

      if(!Output.Active){
        continue;
      }

      const uuid = this.api.hap.uuid.generate('BGOutput' + this.Panel.PanelType + Output.OutputNumber);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        this.OutputsArray[Output.OutputNumber] = new HKOutputAccessory(this, existingAccessory, this.Panel, Output.OutputNumber);
        this.CreatedAccessories.push(existingAccessory);
      } else{
        const PanelOutput = this.Panel.GetOutputs()[Output.OutputNumber];
        const OutputText = PanelOutput.OutputText;
        const accessory = new this.api.platformAccessory(OutputText, uuid);
        this.OutputsArray[Output.OutputNumber] = new HKOutputAccessory(this, accessory, this.Panel, Output.OutputNumber);
        this.CreatedAccessories.push(accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  private DiscoverAreas(){

    for(const Area of this.config.Areas){
      const AreaInScope:number[] = [];
      const PasscodeFollowsScope = Area.PasscodeFollowsScope;

      if(!Area.Active){
        continue;
      }

      if(Area.AreaInScope !== undefined && Area.AreaInScope !== ''){
        const ScopeStringArray = Area.AreaInScope.split(',');
        for(let i = 0 ; i < ScopeStringArray.length ; i ++){
          AreaInScope.push(Number(ScopeStringArray[i]));
        }
      }

      const uuid = this.api.hap.uuid.generate('BGArea' + this.Panel.PanelType + Area.AreaNumber);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.ControlPanelArray.push(new HKSecurityPanel(this, existingAccessory, Area.AreaNumber, AreaInScope, PasscodeFollowsScope));
        this.CreatedAccessories.push(existingAccessory);
      } else{
        const PanelArea = this.Panel.GetAreas()[Area.AreaNumber];
        const AreaText = PanelArea.AreaText;
        const accessory = new this.api.platformAccessory(AreaText, uuid);
        this.ControlPanelArray.push(new HKSecurityPanel(this, accessory, Area.AreaNumber, AreaInScope, PasscodeFollowsScope));
        this.CreatedAccessories.push(accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  private DiscoverPoints(){

    for(const Point of this.config.Points){

      if(!Point.Active){
        continue;
      }

      const PointInPanel = this.Panel.GetPoints()[Point.PointNumber];
      const PointText = PointInPanel.PointText;

      const uuid = this.api.hap.uuid.generate('BGPoint' + this.Panel.PanelType + Point.SensorType + PointInPanel.PointNumber);

      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        existingAccessory.context.SensorType = Point.SensorType;
        existingAccessory.context.PointNumber = Point.PointNumber;
        this.CreateSensor(existingAccessory, PointInPanel);
        this.CreatedAccessories.push(existingAccessory);
      } else{
        const accessory = new this.api.platformAccessory(PointText, uuid);
        accessory.context.SensorType = Point.SensorType;
        accessory.context.PointNumber = Point.PointNumber;
        this.CreateSensor(accessory, PointInPanel);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.CreatedAccessories.push(accessory);
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
      if(this.config.LogPoint){
        this.log.info(message);
      } else{
        this.log.debug(message);
      }

      if(this.PointsArray[Point.PointNumber] !== undefined){
        this.PointsArray[Point.PointNumber].HandleEventDetected(Point.PointStatus);
      }
    });

    this.Panel.on('OutputStateChange', (Output)=>{
      const message = 'Panel: Output' + Output.OutputNumber + '(' + Output.OutputText + '): ' + Output.OutputState;
      if(this.config.LogOutput){
        this.log.info(message);
      } else{
        this.log.debug(message);
      }

      if(this.OutputsArray[Output.OutputNumber] !== undefined){
        this.OutputsArray[Output.OutputNumber].HandleOutputChange(Output.OutputState);
      }
    });

    this.Panel.on('AreaAlarmStateChange', (Area)=>{

      if(Area.GetIsAlarmNominal()){
        const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): AlarmState: Normal';
        if(this.config.LogAreaAlarm){
          this.log.info(message);
        } else{
          this.log.debug(message);
        }
      } else{

        const FireAlarm = Area.GetFireAlarm();
        if(FireAlarm.length > 0){
          for (const Alarm of FireAlarm){
            const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): Fire - ' + BGAlarmPriority[Alarm];
            if(this.config.LogAreaAlarm){
              this.log.info(message);
            } else{
              this.log.debug(message);
            }
          }
        }

        const BurglaryAlarm = Area.GetBurglaryAlarm();
        if(BurglaryAlarm.length > 0){
          for (const Alarm of BurglaryAlarm){
            const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): Burglary - ' + BGAlarmPriority[Alarm];
            if(this.config.LogAreaAlarm){
              this.log.info(message);
            } else{
              this.log.debug(message);
            }
          }
        }

        const GazAlarm = Area.GetGazAlarm();
        if(GazAlarm.length > 0){
          for (const Alarm of GazAlarm){
            const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): Gas - ' + BGAlarmPriority[Alarm];
            if(this.config.LogAreaAlarm){
              this.log.info(message);
            } else{
              this.log.debug(message);
            }
          }
        }

        const PersonnalAlarm = Area.GetPersonnalAlarm();
        if(PersonnalAlarm.length > 0 ){
          for (const Alarm of BurglaryAlarm){
            const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): Personnal - ' + BGAlarmPriority[Alarm];
            if(this.config.LogAreaAlarm){
              this.log.info(message);
            } else{
              this.log.debug(message);
            }
          }
        }
      }
    });

    // Set notification management for Confidence messages sent by panel
    this.Panel.on('ConfidenceMessage', () => {
      const message = 'Panel: Received Confidence Message';
      if(this.config.LogConfidenceMessage){
        this.log.info(message);
      } else{
        this.log.debug(message);
      }
      this.ReceivingPanelNotification = true;
    });

    this.Panel.on('AreaOnOffStateChange', (Area)=>{
      const message = 'Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): ' + BGAreaStatus[Area.AreaStatus];
      if(this.config.LogAreaArmingStatus){
        this.log.info(message);
      } else{
        this.log.debug(message);
      }
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

  private CreateSensor(Accessory: PlatformAccessory, Point:BGPoint){

    switch(Accessory.context.SensorType){

      case BGSensorType.MotionSensor:{
        this.PointsArray[Point.PointNumber] = new HKMotionSensor(this, Accessory, this.Panel, Point.PointNumber);
        break;
      }

      case BGSensorType.ContactSensor:{
        this.PointsArray[Point.PointNumber] =new HKContactSensor(this, Accessory, this.Panel, Point.PointNumber);
        break;
      }

      case BGSensorType.LeakSensor :{
        this.PointsArray[Point.PointNumber] = new HKLeakSensor(this, Accessory, this.Panel, Point.PointNumber);
        break;
      }

      case BGSensorType.SmokeSensor :{
        this.PointsArray[Point.PointNumber] = new HKSmokeSensor(this, Accessory, this.Panel, Point.PointNumber);
        break;
      }

      case BGSensorType.COSensor :{
        this.PointsArray[Point.PointNumber] = new HKCOSensor(this, Accessory, this.Panel, Point.PointNumber);
        break;
      }
    }
  }

  private DumpPanelInfo(){
    this.log.info('-----------------------------------------');
    this.log.info('Bosch Control Panel Information');
    this.log.info('-----------------------------------------');
    this.log.info('Panel Type: ' + BGPanelType[this.Panel.PanelType]);
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

}