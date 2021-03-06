
# Homebridge Plugin for Bosch B and G Control Panels
[![npm downloads](https://badgen.net/npm/dt/homebridge-boschcontrolpanel_bgseries)](https://www.npmjs.com/package/homebridge-boschcontrolpanel_bgseries)

This Homebridge plugin allows interactions with your Bosch Control Panel

* Set Control Panel Area arming mode (Arm, Disarm, Part on instant, Part on delay)
* Set Control Panel Outputs states (On, Off)
* Use Control Panel Points states for home automation purposes (Motion, Contact, Smoke, Leak and Carbon Monoxide)
* Get Control Panel Master Alarm notifications for Fire, Burglary, Gaz and Personnal events. 

![Screenshot](BCP01.jpg)
![Screenshot](BCP02.jpg)

## Supported Bosch Control Panels

* [Bosch B Series Control Panels](https://resources-boschsecurity-cdn.azureedge.net/public/documents/B_Series_Quick_Selec_Commercial_Brochure_enUS_23341998603.pdf)
* [Bosch G Series Control Panels](https://resources-boschsecurity-cdn.azureedge.net/public/documents/Bosch_G_Series_Quick_Commercial_Brochure_enUS_23390517387.pdf)

## Bosch Control Panel Configuration

### Easy method
Contact your Bosch Control Panel installer. The following required configuration options can be remotely applied to your panel.

### Hard method
* Connect to your Bosch Control Panel with [RPS Software](https://www2.boschsecurity.us/bseriesinstall/programming).
* Initial connection to your Bosch Control Panel with RPS through network requires a RPS passcode. RPS passcode should be provided with your hardware. If RPS Passcode is not avaiblable, connection to the panel can be established with a direct USB cable. 

### Required Control Panel RPS configurations options
* Control Panel needs to be connected to your home network through on board ethernet adapter. Note Control Panel IP address on your router or network logs. 
* In AUTOMATION - REMOTE APP menu, set "Automation Device" to "Mode 2" 
* In AUTOMATION - REMOTE APP menu, set an "Automation passcode" 
* In PANEL WIDE PARAMETERS - ON BOARD ETHERNET COMMUNICATOR menu, note TCP/UDP PORT NUMBER (defaults to 7700) 
* USE RPS to install the latest Control Panel firmware update. Older firmware may be limited to TLS 1.0 wich prevent Homebridge from establishing a secure connection.
* This plugin supports Intrusion Integration Protocol Version 5.208 and newer (to get event driven notifications) 

## Homebride pluging configuration file
Please see sample config file [config.sample.json](config.sample.json)
### General parameters
* `Name` : Plugin name
* `Host`:  Bosch Control Panel IP address
* `Port`:  Bosch Control Panel Port number (defaults to 7700)
* `Automation passcode`: Value as configured on your Bosch Control Panel (See required configurations options)
### Areas (Only add areas to be monitored by Homebridge in config file)
* `Number`: Area number on the Control Panel to be monitored by the plugin
* `Show Accessory in Home App`: Show Security System Accessory in Home App to change this area arming mode
* `Custom Area Text`: Any value entered here will override the Area text configured on your Control Panel. Custom text is only applied to Homebridge and Home App. This plugin doesn't modify any data directly on the Control Panel.
### Points - Control Panel Sensors (Only add points to be monitored by Homebridge in config file)
* `Number`: Point (Sensor) number on the Control Panel to be monitored by the pluggin. When first run in debug mode, the plugin will list all sensors available for configuration.
* `Show Accessory in Home App`: Show Sensor Accessory in Home App for automation purposes. 
* `Custom Point Text`: Any value entered here will override the Point text configured on your Control Panel. Custom text is only applied to Homebridge and Homme App. This plugin doesn't modify any data directly on the Control Panel.
* `Sensor Type`: Motion Sensor, Contact Sensor, Leak Sensor, CO Sensor or Smoke Sensor
### Outputs (Only add outputs to be monitored by Homebridge in config file)
* `Number`: Output number on the Control Panel to be monitored by the pluggin. When first run in debug mode, the plugin will list all outputs available for configuration.
* `Show Accessory in Home App`: Show Output Accessory in Home App. 
* `Custom Output Text`: Any value entered here will override the Output text configured on your Control Panel. Custom text is only applied to Homebridge and Homme App. This plugin doesn't modify any data directly on the Control Panel.
### Master Alarms Sensors
If selected, Contact Sensors will be added in Home App to monitor Fire, Gaz, Burglary or Personnal Alarms. Each sensor will trigger only if an alarm state for the event it is monitoring is detected on any Area configured on the Bosch Control Panel:
* `MasterFireAlarm`: Monitor Fire Alarm for any Area configured on the Control Panel
* `MasterGazAlarm`: Monitor Gaz Alarm for any Area configured on the Control Panel
* `MasterBurglaryAlarm`: Monitor Burglary Alarm for any Area configured on the Control Panel
* `MasterPersonnalAlarm`: Monitor Personnal Alarm for any Area configured on the Control Panel

## Accessory Custom Text additional information: 
### Prefered way of changing accessories names in Home App
* Change accessory name directly in its Home App settings page. New name will persist in Home App even after Homebdrige being restarted. This won't change this accessory name in Homebridge UI web page.  
### Legacy mode
* Accessories Custom Text option was present in first plugin release as a misunderstanding of how Homebridge would interract with HomeKit to set accessories names. It is kept for legacy purpose.  
* Once an accessory has been added to Homekit, Homebridge cannot change it display name. The following procedure should be followed to change an accessory custom name:
* Change accessory Custom Text in config file
* Uncheck accessory "Show Accessory in Home App"
* Restart Homebridge
* Check accessory "Show Accessory in Home App"
* Restart Homebridge, change should be present at that point in Home App.

## Operation
### Security System Accessory:
The following conversions are applied between Homekit Area Arming state and Bosch Control Panel Area Arming state: 

| Homekit Area Arming State | Bosch Area Arming State|
| ------ | ------ | 
| Off | Disarmed
| Away | All On Delay
| Night | Part On Instant
| Home | Part On Delay

# Releases
## 0.3.0
* Adding Master Fire Alarm Sensor, Master Gaz Alarm Sensor, Master Burglary Alarm Sensor and Master Personnal Alarm Sensor: If selected, Contact Sensors will be added in Home App to monitor Fire, Gaz, Burglary or Personnal Alarms. Each sensor will trigger only if an alarm state for the event it is monitoring is detected on any Area configured on the Bosch Control Panel

## 0.2.1
* No changes in configuration file. 
* Commands sent to controller are now queued. This prevents a race condition where 2 commands would not be executed properly if called simultaneously.
* More usefull information when run in Debug mode (-D)
* Fix on Triggered Alarm management and return to normal state once alarm is cleared

## 0.1.0
* Accessories universally unique identifier had to be changed. Some accessory automation may have to be reconfigured after upgrading plugin to version 0.1.0
* Adding panel output support to plugin.
* Adding plugin automatic reconnection to control panel in case of connection timeout or connection lost. 
* Adding Homekit unique serial number for accessory. Issue was causing errors in some 3rd party Homekit app. 

# Disclaimer
This is Beta software. Not to be relied upon for life or mission critical applications.

