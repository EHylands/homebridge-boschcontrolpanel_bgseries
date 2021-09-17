import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, uuid } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { BGController, BGPanelType, BGPoint, BGPointStatus, BGUserType, BGAlarmType } from './BGController';
import { BoschSecurityPanel } from './BoschSecurityPanel';
import { BGMotionSensor } from './BGMotionSensor';
import { BGContactSensor } from './BGContactSensor';
import { BGLeakSensor } from './BGLeakSensor';
import { BGSmokeSensor } from './BGSmokeSensor';
import { BGCOSensor } from './BGCOSensor';
import { BGSensor } from './BGSensor';

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
  private ControlPanelArray: BoschSecurityPanel[] = [];
  public Panel: BGController;

  private PanelHost = '';
  private PanelPort = 14999;
  private PanelPasscode = '';

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
  // Check that areas exist whitout any duplicate
  // Checl that points exist whitout any duplicate
  CheckConfigPhase2():boolean{

    let NumberOfPointInConfig = 0;
    if(this.config.Points !== undefined){
      NumberOfPointInConfig = this.config.Points.length;
    }

    const TempPoint: number[] = [];

    for(let i = 0 ; i < NumberOfPointInConfig ; i++){
      const PointInConfig = this.config.Points[i];
      const PointInPanel = this.Panel.GetPoint(PointInConfig.PointNumber);

      //Check for duplicate poit
      if(TempPoint.indexOf(PointInConfig.PointNumber) !== -1){
        this.log.error('Aborting: Dupicatee Point' + PointInConfig.PointNumber + ' in config file');
        return false;
      }

      TempPoint.push(PointInConfig.PointNumber);

      // Point in config not found in panel;
      if(PointInPanel === null){
        this.log.error('Aborting: Point' + PointInConfig.PointNumber + ' in config file is not configured on the panel');
        return false;
      }
    }

    let NumberOfAreaInConfig = 0;
    if(this.config.Areas !== undefined){
      NumberOfAreaInConfig = this.config.Areas.length;
    }

    const TempArea: number[] = [];

    for(let i = 0 ; i < NumberOfAreaInConfig ; i++){
      const AreaInConfig = this.config.Areas[i];
      const AreaInPanel = this.Panel.GetArea(AreaInConfig.Areanumber);

      //Check for duplicate area
      if(TempArea.indexOf(AreaInConfig.Areanumber) !== -1){
        this.log.error('Aborting: Dupicate Area' + AreaInConfig.PointNumber + ' in config file');
        return false;
      }

      TempPoint.push(AreaInConfig.Pointnumber);

      if(AreaInPanel === null){
        this.log.error('Aborting: Area' + AreaInConfig.Areanumber + ' in config file is not configured on the panel');
        return false;
      }
    }

    return true;
  }

  private DiscoverAreas(){
    if(this.config.Areas !== undefined){
      for(let i = 0 ; i < this.config.Areas.length;i++){

        const Area = this.config.Areas[i];
        const Active = Area.Active;
        const AreaNumber = Area.Areanumber;
        const PanelArea = this.Panel.GetArea(AreaNumber);

        if(!Active){
          // Do not add accessory
          continue;
        }

        let AreaText = 'Area ' + AreaNumber;
        if(PanelArea !== null){
          AreaText = PanelArea.AreaText;
        }

        if(Area.CustomText !== undefined && Area.CustomText !== ''){
          AreaText = Area.CustomText;
        }

        const uuid = this.api.hap.uuid.generate('Bosch Control Panel' + BGPanelType[this.Panel.PanelType] + Area.Areanumber);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        if (existingAccessory) {
          this.log.info('Restoring existing accessory from cache:', 'Bosch Panel ' +
          BGPanelType[this.Panel.PanelType] + ', Area: ' + AreaNumber);
          existingAccessory.displayName = AreaText;
          this.ControlPanelArray.push(new BoschSecurityPanel(this, existingAccessory, this.Panel, AreaNumber));
          this.CreatedAccessories.push(existingAccessory);
          this.api.updatePlatformAccessories([existingAccessory]);
        } else{
          this.log.info('Adding accessory from cache:', 'Bosch Panel ' +
          BGPanelType[this.Panel.PanelType] + ', Area: ' + AreaNumber);
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

      if(PointInPanel !== null){
        if(PointInConfig.Active === true){

          let PointText = PointInPanel.PointText;
          if(PointInConfig.CustonText !== '' && PointInConfig.CustomText !== undefined){
            PointText = PointInConfig.CustomText;
          }

          const uuid = this.api.hap.uuid.generate('BGPoint' + + this.Panel.PanelType + PointInConfig.SensorType + PointInPanel.PointNumber);

          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory ) {
            existingAccessory.context.SensorType = PointInConfig.SensorType;
            existingAccessory.context.PointNumber = PointInConfig.PointNumber;
            existingAccessory.displayName = PointText;
            this.CreateSensor(existingAccessory, PointInPanel);
            this.log.info('Updating ' + existingAccessory.context.SensorType + ': ' + existingAccessory.displayName);
            this.api.updatePlatformAccessories([existingAccessory]);
            this.CreatedAccessories.push(existingAccessory);
          } else{
            const accessory = new this.api.platformAccessory(PointText, uuid);
            accessory.context.SensorType = PointInConfig.SensorType;
            accessory.context.PointNumber = PointInConfig.PointNumber;
            this.CreateSensor(accessory, PointInPanel);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            this.log.info('Adding new ' + accessory.context.SensorType + ': ' + accessory.displayName);
            this.CreatedAccessories.push(accessory);
          }
        }
      } else{
        this.log.error('Point' + PointInConfig.PointNumber + ' in the config file is not configured on the panel');
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
    this.Panel.on('PanelReadyForOperation', (PanelReady) => {
      this.log.debug('BG Controller Panel Ready for Operation: ' + PanelReady);

      // Phase 2 config file check
      if(!this.CheckConfigPhase2()){
        this.log.error('Aborting plugin operation - Failed Config Phase 2');
        return;
      }

      this.DiscoverAreas();
      this.DiscoverPoints();
      this.DeviceCacheCleanUp();
      this.DumpPanelInfo();

      // Start panel event notifications.
      this.Panel.SendMode2SetSubscriptions();
    });

    // Set notification management for sensor status change
    this.Panel.on('PointStatusChange', (Point, Area) => {
      for(let i = 0 ; i < this.SensorArray.length ; i++){
        const Sensor = this.SensorArray[i];
        if(Sensor.Point.PointNumber === Point.PointNumber){
          Sensor.HandleEventDetected(Point.PointStatus !== BGPointStatus.Normal);
        }
      }
    });

    this.Panel.on('AreaAlarmStateChange', (Area)=>{
      if(Area.BurglaryAlarm === BGAlarmType.Alarm ||
        Area.FireAlarm === BGAlarmType.Alarm ||
        Area.GazAlarm === BGAlarmType.Alarm ||
        Area.PersonnalAlarm ===BGAlarmType.Alarm){
        // Alarm has been detected in zone

        for(let i = 0 ; i < this.ControlPanelArray.length ; i++){
          const Panel = this.ControlPanelArray[i];
          if(Panel.AreaMonitored === Area.AreaNumber){
            Panel.SetAlarmTriggered(true);
            return;
          }
        }
      }
    });

    // Set notification management for Confidence messages sent by panel
    this.Panel.on('ConfidenceMessage', () => {
      this.log.debug('Received Confidence Message from Panel');
    });

    this.Panel.on('AreaOnOffStateChange', (Area)=>{
      for(let i = 0; i < this.ControlPanelArray.length ; i++){
        if(this.ControlPanelArray[i].AreaMonitored === Area.AreaNumber){
          // foud a match
          this.ControlPanelArray[i].handleSecuritySystemCurrentStateGet();
          this.ControlPanelArray[i].handleSecuritySystemTargetStateGet();
        }
      }
    });

    this.Panel.on('ControllerError', (Error, ErrorString) => {
      this.log.error(Error + ' ' + ErrorString);
    });

    // Start panel discovery
    this.Panel.Connect();
  }

  private CreateSensor(Accessory: PlatformAccessory, Point:BGPoint){

    switch(Accessory.context.SensorType){

      case BGSensorType.MotionSensor:{
        this.SensorArray.push(new BGMotionSensor(this, Accessory, Point));
        break;
      }

      case BGSensorType.ContactSensor:{
        this.SensorArray.push(new BGContactSensor(this, Accessory, Point));
        break;
      }

      case BGSensorType.LeakSensor :{
        this.SensorArray.push(new BGLeakSensor(this, Accessory, Point));
        break;
      }

      case BGSensorType.SmokeSensor :{
        this.SensorArray.push(new BGSmokeSensor(this, Accessory, Point));
        break;
      }

      case BGSensorType.COSensor :{
        this.SensorArray.push(new BGCOSensor(this, Accessory, Point));
        break;
      }
    }
  }

  private DumpPanelInfo(){
    this.log.debug('Panel Information:');
    this.log.debug('Panel Type: ' + BGPanelType[this.Panel.PanelType]);
    this.log.debug('RPS Version: ' + this.Panel.PanelRPSProtocolVersion.toSring());
    this.log.debug('Intrusion Protocol Version: ' + this.Panel.PanelIntrusionIntegrationProtocolVersion.toSring());
    this.log.debug('Execute Protocol Version: ' + this.Panel.PanelExecuteProtocolVersion.toSring());
    this.log.debug('Panel Max Areas: ' + this.Panel.MaxAreas);
    this.log.debug('Panel Max Points: ' + this.Panel.MaxPoints);
    this.log.debug('Panel Max Outputs: ' + this.Panel.MaxOutputs);
    this.log.debug('Panel Max Users: ' + this.Panel.MaxUsers);
    this.log.debug('Panel Max Keypads: ' + this.Panel.MaxKeypads);
    this.log.debug('Panel Max Doors: ' + this.Panel.MaxDoors);

    for(let i = 0 ; i < this.Panel.AreaArray.length ; i++){
      const Area = this.Panel.AreaArray[i];
      this.log.debug('Area ' + Area.AreaNumber + ': ' + Area.AreaText + ' - Enabled');

      for(let j = 0 ; j < Area.PointArray.length ; j++){
        const Pointt = Area.PointArray[j];
        this.log.debug('  Point' + Pointt.PointNumber + ': ' + Pointt.PointText);
      }
    }
  }
}