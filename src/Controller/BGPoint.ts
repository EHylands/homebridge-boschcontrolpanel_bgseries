export enum BGPointStatus {
    Unassigned = 0x00,
    Short = 0x01,
    Open = 0x02,
    Normal = 0x03,
    Missing = 0x04,
    Resistor2 = 0x05,
    Resistor4 = 0x06,
    Unknown = 0xFF
  }

export class BGPoint{
    PointNumber: number;
    AreaNumber: number;
    PointText = '';
    PointStatus = BGPointStatus.Unknown;
    Bypassable = false;
    PointCode = 0;
    PointCondition = 0;

    constructor(PointNumber: number, AreaNumber: number){
      this.PointNumber = PointNumber;
      this.AreaNumber = AreaNumber;
    }

    UpdatePoint(PointStatus: BGPointStatus, Bypassable: boolean, PointCode: number, PointCondition: number){
      this.PointStatus = PointStatus;
      this.Bypassable = Bypassable;
      this.PointCode = PointCode;
      this.PointCondition = PointCondition;
    }
}