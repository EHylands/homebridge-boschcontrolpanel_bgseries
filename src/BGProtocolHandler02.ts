import { BGController, BGControllerError } from './BGController';
import { BGPanelType } from './BGConst';


export class BGProtocolHandler02 {

    private Controller:BGController;

    constructor(Controller:BGController){
      this.Controller = Controller;
    }

    async ParseMessage(Data:Buffer){

      // Data length over 2 bytes
      const NotificationLength = (Data[0] << 8) + Data[1];

      if(NotificationLength !== Data.length-2){
        this.Controller.emit('ControllerError', BGControllerError.InvalidNotificationLength, Data.toString());
        return;
      }

      let i = 1 ;
      while(i <= NotificationLength){
        const StatusItemType = Data[++i];
        const EntryNumber = Data[++i];

        // Confidence message
        if(StatusItemType === 0){
          this.Controller.emit('ConfidenceMessage');
          continue;
        }

        for(let j = 0; j < EntryNumber ; j++){

          // Event Summary State Entry
          if(StatusItemType === 1){
            const AlarmPriority = Data[++i];
            const AlarmCount = (Data[++i] << 8) + Data[++i];

            if(AlarmCount === 0){
              for( const AreaNumber in this.Controller.Areas){
                const Area = this.Controller.Areas[AreaNumber];
                if(Area.RemoveAlarm(AlarmPriority)){
                  this.Controller.emit('AreaAlarmStateChange', Area);
                }
              }
            } else{
              await this.Controller.GetAlarmMemoryDetail(AlarmPriority, 0, 0);
            }
            continue;
          }

          // Area On Off Sate
          if(StatusItemType === 4){
            const AreaNumber = (Data[++i] << 8) + Data[++i];
            const AreaStatus = Data[++i];

            const Area = this.Controller.Areas[AreaNumber];
            if(Area !== undefined){
              Area.SetAreaStatus(AreaStatus);
              this.Controller.emit('AreaOnOffStateChange', Area);
            }
            continue;
          }

          // Area ready state
          if(StatusItemType === 5){
            const AreaNumber = (Data[++i] << 8) + Data[++i];
            const AreaReadyState = Data[++i];
            const Fault = (Data[++i] << 8) + Data[++i];

            const Area = this.Controller.Areas[AreaNumber];

            if(Area !== undefined){
              if(AreaReadyState === 0){
                Area.SetAreaReadyState(false, false, Fault);
              }

              if(AreaReadyState === 1){
                Area.SetAreaReadyState(false, true, Fault);
              }

              if(AreaReadyState === 2){
                Area.SetAreaReadyState(true, true, Fault);
              }

              this.Controller.emit('AreaReadyStateChange', Area);
            }
            continue;
          }

          // Output state
          if(StatusItemType === 6){
            const OutputNumber = (Data[++i] << 8) + Data[++i];
            const OutputPatern = Data[++i];

            // Solution panels does not reports proper outputs numbers in
            // notifications.
            // Resort to pooling panel for outputs changes
            if(this.Controller.PanelType === BGPanelType.Solution2000 ||
              this.Controller.PanelType === BGPanelType.Solution3000 ||
              this.Controller.PanelType === BGPanelType.AMAX2100 ||
              this.Controller.PanelType === BGPanelType.AMAX3000 ||
              this.Controller.PanelType === BGPanelType.AMAX4000 ) {

              await this.Controller.GetOutputState();

            } else{
              const Output = this.Controller.Outputs[OutputNumber];
              if(Output !== undefined){
                Output.OutputState = OutputPatern !== 0;
                this.Controller.emit('OutputStateChange', Output);
              }
            }
            continue;
          }

          // Read point status notification
          if(StatusItemType === 7){
            const PointNumber = (Data[++i] << 8) + Data[++i];
            const PointState = Data[++i];

            const Point = this.Controller.Points[PointNumber];
            if(Point !== undefined){
              Point.UpdatePointShort(PointState);
              this.Controller.emit('PointStatusChange', Point);
            }
            continue;
          }

          // Panel System status
          if(StatusItemType === 10){
            let option = Data[i++];
            option = option + 0;
            let PStatus = (Data[++i] << 8) + Data[++i];
            PStatus = PStatus + 0;
            let Event = (Data[++i] << 8) + Data[++i];
            Event = Event + 0;
            continue;
          }

          // Read extended point status notification
          if(StatusItemType === 12){
            const PointNumber = (Data[++i] << 8) + Data[++i];
            const PointStatus = Data[++i];
            let AreaNumber = (Data[++i] << 8) + Data[++i];
            AreaNumber = AreaNumber + 0;
            const Bypassable = Data[++i];
            const PointCode = Data[++i];
            const Condition = (Data[++i] << 16) + (Data[++i] << 8) + Data[++i];
            const Point = this.Controller.Points[PointNumber];

            if(Point !== undefined){
              Point.UpdatePoint(PointStatus, (Bypassable !== 0), PointCode, Condition);
              this.Controller.emit('PointStatusChange', Point);
            }
            continue;
          }
        }
      }
      return;
    }
}