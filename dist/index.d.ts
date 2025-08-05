interface InitOptions {
    apiKey: string;
    orgName: string;
    appVer?: string;
    serverVer?: string;
    baseUrl?: string;
    deviceType?: string;
    os?: string;
    osVer?: string;
    language?: string;
    deviceTag?: string;
    userTag?: string;
    country?: string;
    hostname?: string;
    filename?: string;
    noHupHandler?: boolean;
    errorLog?: (...args: unknown[]) => void;
}
interface BaseEventProps {
    [key: string]: unknown;
    kingdom?: string;
    phylum?: string;
    class?: string;
    order?: string;
    family?: string;
    genus?: string;
    species?: string;
    channel?: string;
    float1?: number;
    float2?: number;
    float3?: number;
    float4?: number;
    event_datetime?: string | Date;
    device_tag?: string;
    user_tag?: string;
}
type EventProps = BaseEventProps;
type InstallProps = BaseEventProps;
type DauProps = BaseEventProps;
interface MessageSendProps extends BaseEventProps {
    network: string;
    from_tag: string;
    to_list: string[];
}
interface MessageClickProps extends BaseEventProps {
    network: string;
    from_tag: string;
    to_tag: string;
}
interface EconomyProps extends BaseEventProps {
    spend_currency: string;
    spend_amount: number;
    spend_type?: string;
}
interface LogEventProps {
    [key: string]: unknown;
    event_datetime?: string | Date;
    response_bytes?: number;
    response_ms?: number;
    hostname?: string;
    filename?: string;
    log_level?: string;
    device_tag?: string;
    user_tag?: string;
    remote_address?: string;
    log_line?: string;
    device_type?: string;
    os?: string;
    os_ver?: string;
    browser?: string;
    browser_ver?: string;
    country?: string;
    language?: string;
}
declare class DataCortex {
    private apiBaseUrl;
    private isReady;
    private isSending;
    private timeout;
    private apiKey;
    private orgName;
    private appVer;
    private eventList;
    private nextIndex;
    private delayCount;
    private defaultBundle;
    private logList;
    private logTimeout;
    private isLogSending;
    private logDelayCount;
    private defaultLogBundle;
    private hasHupHandler;
    private errorLog;
    constructor();
    init(opts: InitOptions): void;
    setDeviceTag(tag: string): void;
    setUserTag(tag: string): void;
    install(props: InstallProps): void;
    dau(props: DauProps): void;
    event(props: EventProps): void;
    messageSend(props: MessageSendProps): void;
    messageClick(props: MessageClickProps): void;
    economy(props: EconomyProps): void;
    flush(): void;
    log(...args: unknown[]): void;
    logEvent(props: LogEventProps): void;
    private _internalEventAdd;
    private _sendEventsLater;
    private _sendEvents;
    private _removeEvents;
    private _removeLogs;
    private _sendLogsLater;
    private _sendLogs;
}
declare function create(): DataCortex;

interface MiddlewareLogEvent extends LogEventProps {
    event_datetime: Date;
    response_ms: number;
    response_bytes: number;
    log_level: string;
    log_line: string;
}
interface CreateLoggerParams {
    dataCortex: DataCortex;
    prepareEvent?: (req: any, res: any, event: MiddlewareLogEvent) => void;
    logConsole?: boolean;
}
type CreateLoggerResult = (req: unknown, res: unknown, next: () => void) => void;
declare function createLogger(params: CreateLoggerParams): CreateLoggerResult;

declare const defaultObject: DataCortex;
declare const init: (opts: InitOptions) => void;
declare const setDeviceTag: (tag: string) => void;
declare const setUserTag: (tag: string) => void;
declare const flush: () => void;
declare const install: (props: InstallProps) => void;
declare const dau: (props: DauProps) => void;
declare const event: (props: EventProps) => void;
declare const economy: (props: EconomyProps) => void;
declare const messageSend: (props: MessageSendProps) => void;
declare const messageClick: (props: MessageClickProps) => void;
declare const log: (...args: unknown[]) => void;
declare const logEvent: (props: LogEventProps) => void;
declare const _default: {
    defaultObject: DataCortex;
    init: (opts: InitOptions) => void;
    setDeviceTag: (tag: string) => void;
    setUserTag: (tag: string) => void;
    flush: () => void;
    install: (props: InstallProps) => void;
    dau: (props: DauProps) => void;
    event: (props: EventProps) => void;
    economy: (props: EconomyProps) => void;
    messageSend: (props: MessageSendProps) => void;
    messageClick: (props: MessageClickProps) => void;
    log: (...args: unknown[]) => void;
    logEvent: (props: LogEventProps) => void;
    create: typeof create;
    createLogger: typeof createLogger;
};

export { DataCortex, create, createLogger, dau, _default as default, defaultObject, economy, event, flush, init, install, log, logEvent, messageClick, messageSend, setDeviceTag, setUserTag };
export type { BaseEventProps, CreateLoggerParams, DauProps, EconomyProps, EventProps, InitOptions, InstallProps, LogEventProps, MessageClickProps, MessageSendProps, MiddlewareLogEvent };
