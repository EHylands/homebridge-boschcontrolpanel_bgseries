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
}