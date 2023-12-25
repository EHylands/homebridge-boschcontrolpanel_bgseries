export enum BGPanelType {
    Undefined = 0x00,
    Solution2000 = 0x20,
    Solution3000 = 0x21,
    AMAX2100 = 0x22,
    AMAX3000 = 0x23,
    AMAX4000 = 0x24,
    D7412GV4 = 0x79,
    D9412GV4 = 0x84,
    B4512 = 0xA0,
    B5512 = 0xA4,
    B8512G = 0xA6,
    B9512G = 0xA7,
    B3512 = 0xA8,
    B6512 = 0xA9
}

export enum BGUserType{
    InstallerApp = 0x00, // Do not use
    AutomationUser = 0x01,
    RemoteUser = 0x02
}

export enum BGNegativeAcknowledgement {
    NonSpecificError = 0x00,
    ChecksumFailureUDPConnectionsOnly = 0x01,
    InvalidSizeLength = 0x02,
    InvalidCommand = 0x03,
    InvalidInterfaceState = 0x04,
    DataOutOfRange = 0x05,
    Noauthority = 0x06,
    Unsupportedcommand = 0x07,
    CannotArmPanel = 0x08,
    InvalidRemoteID = 0x09,
    InvalidLicense = 0x0A,
    InvalidMagicNumber = 0x0B,
    ExpiredLicense = 0x0C,
    ExpiredMagicNumber = 0x0D,
    UnsupportedFormatVersion = 0x0E,
    FirmwareUpdateInProgress = 0x11,
    IncompatibleFirmwareVersion = 0x12,
    AllPointsNotConfigured = 0x12,
    ExecutionFunctionNoErrors = 0x20,
    ExecutionFunctionInvalidArea = 0x21,
    ExecutionFunctionInvalidCommand = 0x22,
    ExecutionFunctionNotAuthenticated = 0x23,
    ExecutionFunctionInvalidUser = 0x24,
    ExecutionFunctionParameterIncorrect = 0x40,
    ExecutionFunctionSequenceWrong = 0x41,
    ExecutionFunctionInvalidConfigurationRequest = 0x42,
    ExecutionFunctionInvalidSize = 0x43,
    ExecutionFunctionTimeOut = 0x44,
    RFRequestFailed = 0xDF,
    NoRFdevicewiththatRFID = 0xE0,
    BadRFIDNotProperFormat = 0xE1,
    TooManyRFFevicesForThisPanel = 0xE2,
    DuplicateRFID = 0xE3,
    DuplicateAccessCard = 0xE4,
    BadAccessCardData = 0XE5,
    BadLanguageChoice = 0xE6,
    BadSupervisionModeSelection = 0xE7,
    BadEnableDisableChoice = 0xE8,
    BadMonth = 0xE9,
    BadDay = 0xEA,
    BadHour = 0xEB,
    BadMinute = 0xEC,
    BadTimeEditChoice = 0xED,
    BadRemoteEnable = 0xEF
}

export enum BGAreaStatus{
    Unknown = 0x00,
    AllOn = 0x01,
    PartOnInstant = 0x02,
    PartOnDelay = 0x03,
    Disarmed = 0x04,
    AllOnEntryDelay = 0x05,
    PartOnEntryDelay = 0x06,
    AllOnExitDelay = 0x07,
    PartOnExitDelay = 0x08,
    AllOnInstantArmed = 0x09,
    StayArm1On = 0x0A,
    StayArm2On = 0x0B,
    AwayOn = 0x0C,
    AwayExitDelay = 0x0D,
    AwayEntryDelay = 0x0E
}

export enum BGArmingType{
    Disarm = 0x01,
    MasterInstantArm = 0x02,
    MasterDelayArm = 0x03,
    PerimeterInstantArm = 0x04,
    PerimeterDelayArm = 0x05,
    ForceMasterDelay = 0x06,
    ForceMasterInstantArm = 0x07,
    ForcePerimeterDelayArm = 0x08,
    ForcePerimeterInstantArm = 0x09,
    StayArm1 = 0x0A,
    StayArm2 = 0x0B,
    AwayArm = 0x0C
}

export enum BGAlarmPriority{
    NoPriority = 0,
    BurgTrouble = 1,
    BurgSupervisory = 2,
    GasTrouble = 3,
    GasSupervisory = 4,
    FireTrouble = 5,
    FireSupervisory = 6,
    BurgAlarm = 7,
    PersonalEmergency = 8,
    GasAlarm = 9,
    FireAlarm = 10,
    BurglaryTamper = 11,
    BurglaryFault = 12,
    TechnicalFireAlarm = 13,
    TechnicalFireTamper = 14,
    TechnicalFireFault = 15,
    TechnicalGasAlarm = 16,
    TechnicalGasTamper = 17,
    TechnicalGasFault = 18
}