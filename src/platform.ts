import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { BGController, BGPanelType, BGPoint, BGPointStatus, BGUserType, BGAlarmType,
  BGControllerError, BGAreaStatus } from './BGController';
import { BoschSecurityPanel } from './BoschSecurityPanel';
import { BGMotionSensor } from './BGMotionSensor';
import { BGContactSensor } from './BGContactSensor';
import { BGLeakSensor } from './BGLeakSensor';
import { BGSmokeSensor } from './BGSmokeSensor';
import { BGCOSensor } from './BGCOSensor';
import { BGSensor } from './BGSensor';
import { BGOutputAccessory } from './BGOutputAccessory';

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

  private SensorArray:BGSensor[] = [];
  private OutputArray:BGOutputAccessory[] = [];
  private ControlPanelArray: BoschSecurityPanel[] = [];
  public Panel: BGController;

  private PanelHost = '';
  private PanelPort = 14999;
  private PanelPasscode = '';

  private InitialRun = true;
  private ReceivingPanelNotification = false;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.log.debug('Finished initializing platform:', this.config.Name);

    if(!this.CheckConfigPhase1()){
      log.error('Aborting plugin operation - Failed Config Phase 1 (Host, Port or Passcode error)');
      this.Panel = new BGController(this.PanelHost, this.PanelPort, BGUserType.AutomationUser, this.PanelPasscode);
      return;
    }

    this.Panel = new BGController(this.PanelHost, this.PanelPort, BGUserType.AutomationUser, this.PanelPasscode);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
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

    if(Host !== undefined && Host !== ''){
      if(Port !== undefined && !isNaN(Port)){
        if(Passcode !== undefined && Passcode !== ''){
          this.PanelHost = Host;
          this.PanelPort = Port;
          this.PanelPasscode = Passcode;
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

    let NumberOfPointInConfig = 0;
    if(this.config.Points !== undefined){
      NumberOfPointInConfig = this.config.Points.length;
    }

    const TempPoint: number[] = [];

    for(let i = 0 ; i < NumberOfPointInConfig ; i++){
      const PointInConfig = this.config.Points[i];
      const PointInPanel = this.Panel.GetPoint(PointInConfig.PointNumber);

      // Point in config not found in panel;
      if(PointInPanel === null){
        this.log.error('Aborting: Point ' + PointInConfig.PointNumber + ' in config file is not configured on the panel');
        return false;
      }

      //Check for duplicate point
      if(TempPoint.indexOf(PointInConfig.PointNumber) !== -1){
        this.log.error('Aborting: Dupicate Point ' + PointInConfig.PointNumber + ' in config file');
        return false;
      }

      TempPoint.push(PointInConfig.PointNumber);
    }

    let NumberOfAreaInConfig = 0;
    if(this.config.Areas !== undefined){
      NumberOfAreaInConfig = this.config.Areas.length;
    }

    const TempArea: number[] = [];

    for(let i = 0 ; i < NumberOfAreaInConfig ; i++){
      const AreaInConfig = this.config.Areas[i];
      const AreaInPanel = this.Panel.GetAreaFromNumber(AreaInConfig.AreaNumber);

      if(AreaInPanel === null){
        this.log.error('Aborting: Area ' + AreaInConfig.AreaNumber + ' in config file is not configured on the panel');
        return false;
      }

      //Check for duplicate area
      if(TempArea.indexOf(AreaInConfig.AreaNumber) !== -1){
        this.log.error('Aborting: Duplicate Area ' + AreaInConfig.AreaNumber + ' in config file');
        return false;
      }

      TempArea.push(AreaInConfig.AreaNumber);
    }

    // Outputs
    let NumberOfOutputInConfig = 0;
    if(this.config.Outputs !== undefined){
      NumberOfOutputInConfig = this.config.Outputs.length;
    }

    const TempOutput: number[] = [];

    for(let i = 0 ; i < NumberOfOutputInConfig ; i++){
      const OutputInConfig = this.config.Outputs[i];
      const OutputInPanel = this.Panel.GetOutput(OutputInConfig.OutputNumber);

      if(OutputInPanel === null){
        this.log.error('Aborting: Output' + OutputInConfig.OutputNumber + ' in config file is not configured on the panel');
        return false;
      }

      //Check for duplicate output
      if(TempOutput.indexOf(OutputInConfig.OutputNumber) !== -1){
        this.log.error('Aborting: Duplicate Output' + OutputInConfig.OutputNumber + ' in config file');
        return false;
      }

      TempArea.push(OutputInConfig.OutputNumber);
    }
    return true;
  }

  private DiscoverOutputs(){

    if(this.config.Outputs !== undefined){
      for(let i = 0 ; i < this.config.Outputs.length;i++){

        const Output = this.config.Outputs[i];
        const Active = Output.Active;
        const OutputNumber = Output.OutputNumber;
        const PanelOutput = this.Panel.GetOutput(OutputNumber);

        if(!Active){
          // Do not add accessory
          continue;
        }

        if(PanelOutput === null){
          this.log.error('Output' + OutputNumber + ' in the config file is not configured on the panel');
          continue;
        }

        let OutputText = PanelOutput.OutputText;
        if(Output.CustomText !== undefined && Output.CustomText !== ''){
          OutputText = Output.CustomText;
        }

        const uuid = this.api.hap.uuid.generate('BGOutput' + this.Panel.PanelType + Output.OutputNumber);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        if (existingAccessory) {
          existingAccessory.displayName = OutputText;
          this.OutputArray.push(new BGOutputAccessory(this, existingAccessory, this.Panel, OutputNumber));
          this.CreatedAccessories.push(existingAccessory);
          //this.api.updatePlatformAccessories([existingAccessory]);
        } else{
          const accessory = new this.api.platformAccessory(OutputText, uuid);
          this.OutputArray.push(new BGOutputAccessory(this, accessory, this.Panel, OutputNumber));
          this.CreatedAccessories.push(accessory);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    }
  }

  private DiscoverAreas(){
    if(this.config.Areas !== undefined){
      for(let i = 0 ; i < this.config.Areas.length;i++){

        const Area = this.config.Areas[i];
        const Active = Area.Active;
        const AreaNumber = Area.AreaNumber;
        const PanelArea = this.Panel.GetAreaFromNumber(AreaNumber);

        if(PanelArea === null){
          this.log.error('Area ' + AreaNumber + ' in the config file is not configured on the panel');
          continue;
        }

        if(!Active){
          continue;
        }

        let AreaText = PanelArea.AreaText;
        if(Area.CustomText !== undefined && Area.CustomText !== ''){
          AreaText = Area.CustomText;
        }

        const uuid = this.api.hap.uuid.generate('BGArea' + this.Panel.PanelType + Area.AreaNumber);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        if (existingAccessory) {
          existingAccessory.displayName = AreaText;
          this.ControlPanelArray.push(new BoschSecurityPanel(this, existingAccessory, this.Panel, AreaNumber));
          this.CreatedAccessories.push(existingAccessory);
        } else{
          const accessory = new this.api.platformAccessory(AreaText, uuid);
          this.ControlPanelArray.push(new BoschSecurityPanel(this, accessory, this.Panel, AreaNumber));
          this.CreatedAccessories.push(accessory);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    }
  }

  private DiscoverPoints(){

    let NumberOfPointInConfig = 0;
    if(this.config.Points !== undefined){
      NumberOfPointInConfig = this.config.Points.length;
    }

    for(let i = 0 ; i < NumberOfPointInConfig ; i++){
      const PointInConfig = this.config.Points[i];
      const PointInPanel = this.Panel.GetPoint(PointInConfig.PointNumber);
      const Active = PointInConfig.Active;

      if(PointInPanel === null){
        this.log.error('Point ' + PointInConfig.PointNumber + ' in the config file is not configured on the panel');
        continue;
      }

      if(!Active){
        continue;
      }

      let PointText = PointInPanel.PointText;
      if(PointInConfig.CustonText !== '' && PointInConfig.CustomText !== undefined){
        PointText = PointInConfig.CustomText;
      }

      const uuid = this.api.hap.uuid.generate('BGPoint' + this.Panel.PanelType + PointInConfig.SensorType + PointInPanel.PointNumber);

      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        existingAccessory.context.SensorType = PointInConfig.SensorType;
        existingAccessory.context.PointNumber = PointInConfig.PointNumber;
        existingAccessory.displayName = PointText;
        this.CreateSensor(existingAccessory, PointInPanel);
        this.CreatedAccessories.push(existingAccessory);
      } else{
        const accessory = new this.api.platformAccessory(PointText, uuid);
        accessory.context.SensorType = PointInConfig.SensorType;
        accessory.context.PointNumber = PointInConfig.PointNumber;
        this.CreateSensor(accessory, PointInPanel);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.CreatedAccessories.push(accessory);
      }
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
        this.DeviceCacheCleanUp();
        this.InitialRun = false;
      }

      // Start panel event notifications.
      this.log.info('-----------------------------------------');
      this.log.info('Starting Control Panel Operation');
      this.log.info('-----------------------------------------');
      this.Panel.SendMode2SetSubscriptions();
    });

    this.Panel.on('PanelReceivingNotifiation', (PanelReceivingNotification) =>{
      if(!PanelReceivingNotification){
        // fault device
      }
    });

    // Set notification management for sensor status change
    this.Panel.on('PointStatusChange', (Point) => {
      this.log.debug('Panel: Point' + Point.PointNumber + '(' + Point.PointText + '): ' + BGPointStatus[Point.PointStatus]);

      for(let i = 0 ; i < this.SensorArray.length ; i++){
        const Sensor = this.SensorArray[i];
        if(Sensor.PointNumber === Point.PointNumber){
          Sensor.HandleEventDetected(Point.PointStatus);
        }
      }
    });

    this.Panel.on('AreaAlarmStateChange', (Area)=>{

      if(Area.GetIsAlarmNominal()){
        this.log.info('Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): AlarmState: ' + BGAlarmType[Area.FireAlarm] );
      } else{
        if(Area.FireAlarm !== BGAlarmType.Normal){
          this.log.info('Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): FireAlarm: ' + BGAlarmType[Area.FireAlarm] );
        }
        if(Area.BurglaryAlarm !== BGAlarmType.Normal){
          this.log.info('Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): BurglaryAlarm: ' + BGAlarmType[Area.FireAlarm] );
        }
        if(Area.GazAlarm !== BGAlarmType.Normal){
          this.log.info('Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): GazAlarm: ' + BGAlarmType[Area.FireAlarm] );
        }
        if(Area.PersonnalAlarm !== BGAlarmType.Normal){
          this.log.info('Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): PersonnalAlarm: ' + BGAlarmType[Area.FireAlarm] );
        }
      }

      for(let i = 0 ; i < this.ControlPanelArray.length ; i++){
        const Panel = this.ControlPanelArray[i];
        if(Panel.AreaMonitored === Area.AreaNumber){
          Panel.SetAlarmTriggered(Area.GetAlarmDetected());
        }
      }
    });

    // Set notification management for Confidence messages sent by panel
    this.Panel.on('ConfidenceMessage', () => {
      this.log.debug('Panel: Received Confidence Message');
      this.ReceivingPanelNotification = true;
    });

    this.Panel.on('AreaOnOffStateChange', (Area)=>{
      this.log.info('Panel: Area' + Area.AreaNumber + '(' + Area.AreaText + '): ' + BGAreaStatus[Area.AreaStatus]);
      for(let i = 0; i < this.ControlPanelArray.length ; i++){
        if(this.ControlPanelArray[i].AreaMonitored === Area.AreaNumber){
          this.ControlPanelArray[i].UpdateStateFromPanel(Area.AreaStatus);
        }
      }
    });

    this.Panel.on('OutputStateChange', (Output)=>{
      this.log.info('Panel: Output' + Output.OutputNumber + '(' + Output.OutputText + '): ' + Output.OutputState);
      for(let i = 0 ; i < this.OutputArray.length;i ++){
        if(Output.OutputNumber === this.OutputArray[i].OutputNumber){
          this.OutputArray[i].HandleOutputChange(Output.OutputState);
        }
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

  private CreateSensor(Accessory: PlatformAccessory, Point:BGPoint){

    switch(Accessory.context.SensorType){

      case BGSensorType.MotionSensor:{
        this.SensorArray.push(new BGMotionSensor(this, Accessory, this.Panel, Point.PointNumber));
        break;
      }

      case BGSensorType.ContactSensor:{
        this.SensorArray.push(new BGContactSensor(this, Accessory, this.Panel, Point.PointNumber));
        break;
      }

      case BGSensorType.LeakSensor :{
        this.SensorArray.push(new BGLeakSensor(this, Accessory, this.Panel, Point.PointNumber));
        break;
      }

      case BGSensorType.SmokeSensor :{
        this.SensorArray.push(new BGSmokeSensor(this, Accessory, this.Panel, Point.PointNumber));
        break;
      }

      case BGSensorType.COSensor :{
        this.SensorArray.push(new BGCOSensor(this, Accessory, this.Panel, Point.PointNumber));
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
    this.log.info('Intrusion Protocol Version: ' + this.Panel.PanelIntrusionIntegrationProtocolVersion.toSring());
    this.log.info('Execute Protocol Version: ' + this.Panel.PanelExecuteProtocolVersion.toSring());
    this.log.info('Panel Max Areas: ' + this.Panel.MaxAreas);
    this.log.info('Panel Max Points: ' + this.Panel.MaxPoints);
    this.log.info('Panel Max Outputs: ' + this.Panel.MaxOutputs);
    this.log.info('Panel Max Users: ' + this.Panel.MaxUsers);
    this.log.info('Panel Max Keypads: ' + this.Panel.MaxKeypads);
    this.log.info('Panel Max Doors: ' + this.Panel.MaxDoors);

    for(let i = 0 ; i < this.Panel.AreaArray.length ; i++){
      const Area = this.Panel.AreaArray[i];
      this.log.info('Area' + Area.AreaNumber + ': ' + Area.AreaText);

      for(let j = 0 ; j < Area.PointArray.length ; j++){
        const Pointt = Area.PointArray[j];
        this.log.info('  Point' + Pointt.PointNumber + ': ' + Pointt.PointText);
      }
    }

    this.log.info('Outputs:');
    for(let i = 0 ; i < this.Panel.OutputArray.length ; i++){
      const Output = this.Panel.OutputArray[i];
      this.log.info('  Output' + Output.OutputNumber + ': ' + Output.OutputText);
    }
  }
}