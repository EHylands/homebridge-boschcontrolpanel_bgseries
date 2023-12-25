export class BGFirmwareVersion{
    Version: number;
    Revision: number;

    constructor(Verison:number, Revision:number){
      this.Version = Verison;
      this.Revision = Revision;
    }

    toSring(){
      return this.Version + '.' + this.Revision ;
    }

    GTE(Firmware:BGFirmwareVersion):boolean{

      if(this.Version > Firmware.Version){
        return true;
      }

      if(this.Version >= Firmware.Version && this.Revision >= Firmware.Revision){
        return true;
      }

      return false;
    }
}