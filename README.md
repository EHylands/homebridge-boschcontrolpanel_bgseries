
# Homebridge Plugin for Bosch B and G Control Panels
[![npm downloads](https://badgen.net/npm/dt/homebridge-boschcontrolpanel_bgseries)](https://www.npmjs.com/package/homebridge-boschcontrolpanel_bgseries)

This Homebridge plugin allows interactions with your Bosch Control Panel

* Set Control Panel Area arming mode (Arm, Disarm, Part on instant, Part on delay)
* Set Control Panel Outputs state (On, Off)
* Use Control Panel Points state for home automation purposes (Motion, Contact, Smoke, Leak and Carbon Monoxide)
* Get Panel Wide notifiations for Fire, Burglary, Gaz and Personnal events. 

![Screenshot](BCP0401.jpg)
![Screenshot](BCP0402.jpg)

## Supported Bosch Control Panels

* [Bosch B Series Control Panels](https://resources-boschsecurity-cdn.azureedge.net/public/documents/B_Series_Quick_Selec_Commercial_Brochure_enUS_23341998603.pdf)
* [Bosch G Series Control Panels](https://resources-boschsecurity-cdn.azureedge.net/public/documents/Bosch_G_Series_Quick_Commercial_Brochure_enUS_23390517387.pdf)

## Bosch Control Panel Configuration

### RPS Software installation
* Connect to your Bosch Control Panel with [RPS Software](https://www2.boschsecurity.us/bseriesinstall/programming).
* Initial connection to your Bosch Control Panel with RPS through network requires an RPS passcode. RPS passcode should be provided with your hardware. If RPS Passcode is not avaiblable, a connection to your panel can be established with a direct USB cable. 

### Required Control Panel RPS configurations options
* Connect your Bosch Control Panel to your home network through the on boad ethernet adapter. Note your Control Panel IP Address on your router or network logs. 
* In AUTOMATION - REMOTE APP menu, set "Automation Device" to "Mode 2" 
* In AUTOMATION - REMOTE APP menu, set an "Automation passcode" 
* In PANEL WIDE PARAMETERS - ON BOARD ETHERNET COMMUNICATOR menu, note TCP/UDP PORT NUMBER (defaults to 7700) 
* Your Bosch Control Panel needs to be update to a recent firmware with RPS Software 
1. Needed for a secure connection using TLS > 1.0 with Homebridge
2. Intrusion Integration Protocol Version >= 5.208 needed for push notifications (plugin doesn't support pooling the Control Panel)

## Homebride pluging configuration file
### General parameters
* `Name` : Plugin name
* `Host`:  Bosch Control Panel IP address
* `Port`:  Bosch Control Panel Port number (defaults to 7700)
* `Automation passcode`: Value as configured on your Bosch Control Panel
### Areas (Only add areas to be monitored by Homebridge)
* `Number`: Area number on the Control Panel to be monitored by the plugin
* `"Area(s) in Scope`: Comma separated list of other Areas on your Control Panel to be monitored by this accessory. If an alarm is triggered in one of those Area, your accessory will trigger (Default value: Empty string)
* `Passcode Follows Scope`: If selected, Arming and Disarming your accessory will also Arm or Disarm all other Areas in Scope (Default value: not selected)
* `Show Accessory in Home App`: Show Security System Accessory in Home App
### Points - Control Panel Sensors (Only add points to be monitored by Homebridge)
* `Number`: Point (Sensor) number on the Control Panel to be monitored by the pluggin
* `Sensor Type`: Motion Sensor, Contact Sensor, Leak Sensor, CO Sensor or Smoke Sensor
* `Show Accessory in Home App`: Show Sensor Accessory in Home App 
### Outputs (Only add outputs to be monitored by Homebridge)
* `Number`: Output number on the Control Panel to be monitored by the pluggin
* `Show Accessory in Home App`: Show Output Accessory in Home App
### Master Alarms Sensors
If selected, Contact Sensors will be added in Home App and report panel wide Fire, Gaz, Burglary or Personnal alarms.
* `MasterFireAlarm`: Report panel wide Fire alarms
* `MasterGazAlarm`: Report panel wide Gaz alarms
* `MasterBurglaryAlarm`: Report panel wide Burglary alarms
* `MasterPersonnalAlarm`: Report panel wide Personnal alarms
### Log File Configuration
* `Panel Confidence Message Notifications`: Show control panel keep alive notifications in log file
* `Points Notifications`: Show sensors state changes in log file
* `Output Notifications`: Show outputs state changes in log file
* `Area Alarm Notifications`: Show Areas Alarms in log file
* `Area Arming Status Notifications`: Show Areas Arming status in log file

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
## 0.4.0
* Adding support for Security System accessory `Area(s) in Scope` and `Passcode Follows Scope` options
* Adding Log File configuration options
* General code maintenance

# Disclaimer
This is Beta software. Not to be relied upon for life or mission critical applications.

