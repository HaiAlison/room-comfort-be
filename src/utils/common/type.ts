export enum EAlertSeverity {
    INFO = "info",
    WARNING = "warning",
    CRITICAL = "critical"
}

export enum EAlertStatus {
    ACTIVE = "active",
    RESOLVED = "resolved"
}

export enum EDeviceType {
    FAN = "FAN",
    SENSOR = "SENSOR",
    BUZZER = "BUZZER",
}

export enum EDeviceStatus {
    ONLINE = "ONLINE",
    OFFLINE = "OFFLINE",
    ERROR = "ERROR",
}

export enum EActionSource {
    MANUAL = "MANUAL",
    AUTO = "AUTO",
    SYSTEM = "SYSTEM",
}

export enum EActionResult {
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    TIMEOUT = "TIMEOUT",
}
export type FanReason = "Temperature exceeded threshold" | "Temperature normalized" | "Manual override";

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface Session {
    token: string;
    user: User;
}

export interface TemperatureReading {
    id: string;
    timestamp: string;
    temperature: number;
    humidity: number;
}

export interface Threshold {
    min: number;
    max: number;
}

export interface FanState {
    on: boolean;
    reason: FanReason;
    mode: "auto" | "manual";
    updatedAt: string;
}

export interface DeviceStatus {
    id: string;
    name: string;
    room: string;
    online: boolean;
    lastSeen: string;
    firmware: string;
    battery: number;
}

export interface AlertItem {
    id: string;
    timestamp: string;
    severity: EAlertSeverity;
    message: string;
    status: EAlertStatus;
}

export interface ActivityLog {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    result: "success" | "failed";
}

export interface HistoryQuery {
    range?: "24h" | "7d" | "custom" | undefined;
    from?: string | undefined;
    to?: string | undefined;
}

export type ReadingStatus = "low" | "normal" | "high";
