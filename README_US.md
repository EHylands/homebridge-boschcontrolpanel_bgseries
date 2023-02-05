# Bosch B Series, G Series and GV4 Panels configuration
## Panel Settings
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
2. Intrusion Integration Protocol Version >= 5.208 needed for push notifications.0