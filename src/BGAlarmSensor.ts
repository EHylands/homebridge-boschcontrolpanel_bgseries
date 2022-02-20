import { Service, PlatformAccessory } from 'homebridge';
import { HB_BoschControlPanel_BGSeries } from './platform';
import { BGAlarmType, BGController } from './BGController';

export class BGAlarmSensor {
  private service: Service;

  constructor(
    private readonly platform:HB_BoschControlPanel_BGSeries,
    private readonly accessory: PlatformAccessory,
    private readonly Panel: BGController,
    private readonly MonitoringArea: number,
    private readonly MonitoringEvent:string,  // Fire, Burglary, Gaz or Personnal
  ) {

    let AreaString = 'Monitoring Area: ' + MonitoringArea;
    if(MonitoringArea === 0){
      AreaString = 'Monitoring all Panel Areas';
    }

    this.platform.log.info(MonitoringEvent + ' Alarm (' + AreaString + ') - ' + accessory.displayName);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'BG Control Panel')
      .setCharacteristic(this.platform.Characteristic.Model, 'BG Master Alarm')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'BGMaster' + MonitoringEvent + 'Alarm' + MonitoringArea)
      .setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.service = this.accessory.getService(this.platform.Service.ContactSensor)
      || this.accessory.addService(this.platform.Service.ContactSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);


    this.Panel.on('AreaAlarmStateChange', (Area)=>{
      if(Area.AreaNumber === this.MonitoringArea || this.MonitoringArea === 0){

        switch (this.MonitoringEvent) {
          case 'Fire':
            this.UpdateStatus(Area.FireAlarm === BGAlarmType.Alarm);
            break;

          case 'Burglary':
            this.UpdateStatus(Area.BurglaryAlarm === BGAlarmType.Alarm);
            break;

          case 'Personnal':
            this.UpdateStatus(Area.PersonnalAlarm === BGAlarmType.Alarm);
            break;

          case 'Gaz':
            this.UpdateStatus(Area.GazAlarm === BGAlarmType.Alarm);
            break;

          default:
            this.platform.log.error('Master Alarm Sensor: Unknow MonitoringEvent');
            break;
        }
      }
    });
  }

  UpdateStatus(Trigger:boolean){
    if(Trigger){
      this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
        .updateValue(this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
    } else{
      this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
        .updateValue(this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
    }
  }

}
