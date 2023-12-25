export class BGProtocolVersion{
    ProtocolVersionMajor: number;
    ProtocolVersionMinor: number;
    ProtocolVersionMicro: number;

    constructor(Major:number, Minor:number, Micro: number){
      this.ProtocolVersionMajor = Major;
      this.ProtocolVersionMinor = Minor;
      this.ProtocolVersionMicro = Micro;
    }

    toSring(){
      return this.ProtocolVersionMajor + '.' + this.ProtocolVersionMinor + '.' + this.ProtocolVersionMicro;
    }

    GTE(Protocol:BGProtocolVersion):boolean{

      if(this.ProtocolVersionMajor > Protocol.ProtocolVersionMajor){
        return true;
      }

      if(this.ProtocolVersionMajor >= Protocol.ProtocolVersionMajor && this.ProtocolVersionMinor > Protocol.ProtocolVersionMinor){
        return true;
      }

      if(this.ProtocolVersionMajor >= Protocol.ProtocolVersionMajor &&
        this.ProtocolVersionMinor >= Protocol.ProtocolVersionMinor &&
        this.ProtocolVersionMicro >= Protocol.ProtocolVersionMicro){
        return true;
      }

      return false;
    }
}