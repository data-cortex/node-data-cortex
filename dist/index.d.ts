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
}
interface BaseEventProps {
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
    [key: string]: unknown;
}
type EventProps = BaseEventProps;
type InstallProps = BaseEventProps;
type DauProps = BaseEventProps;
interface MessageSendProps extends BaseEventProps {
    network: string;
    from_tag: string;
    to_list: unknown;
    spend_currency?: string;
    spend_type?: string;
    to_tag?: string;
}
interface MessageClickProps extends BaseEventProps {
    network: string;
    from_tag: string;
    to_tag: string;
    spend_currency?: string;
    spend_type?: string;
    to_list?: unknown;
}
interface EconomyProps extends BaseEventProps {
    spend_currency: string;
    spend_amount: number;
    spend_type?: string;
    network?: string;
    from_tag?: string;
    to_tag?: string;
    to_list?: unknown;
}
interface LogEventProps {
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
    [key: string]: unknown;
}
interface InternalEventProps extends BaseEventProps {
    spend_currency?: string;
    spend_type?: string;
    network?: string;
    from_tag?: string;
    to_tag?: string;
    to_list?: unknown;
    spend_amount?: number;
    type?: string;
    event_index?: number;
    [key: string]: unknown;
}
interface Bundle {
    api_key: string | false;
    app_ver?: string;
    server_ver?: string;
    config_ver?: string;
    user_tag?: string;
    device_tag?: string;
    device_type?: string;
    os?: string;
    os_ver?: string;
    browser?: string;
    browser_ver?: string;
    marketplace?: string;
    country?: string;
    geo_ip_address?: string;
    language?: string;
    group_tag?: string;
    events?: InternalEventProps[];
    [key: string]: unknown;
}
interface LogBundle extends Bundle {
    hostname?: string;
    filename?: string;
    events?: LogEventProps[];
}
declare class DataCortex {
    apiBaseUrl: string;
    isReady: boolean;
    isSending: boolean;
    timeout: NodeJS.Timeout | false;
    apiKey: string | false;
    orgName: string | false;
    appVer: string;
    serverVer: string;
    userTag: boolean;
    eventList: InternalEventProps[];
    nextIndex: number;
    delayCount: number;
    defaultBundle: Partial<Bundle>;
    logList: LogEventProps[];
    logTimeout: NodeJS.Timeout | false;
    isLogSending: boolean;
    logDelayCount: number;
    defaultLogBundle: Partial<LogBundle>;
    hasHupHandler: boolean;
    constructor();
    init(opts: InitOptions, done?: () => void): void;
    setDeviceTag(tag: string): void;
    setUserTag(tag: string): void;
    install(props: InstallProps): void;
    dau(props: DauProps): void;
    event(props: EventProps): void;
    messageSend(props: MessageSendProps): void;
    messageClick(props: MessageClickProps): void;
    economy(props: EconomyProps): void;
    flush(): void;
    _internalEventAdd(input_props: InternalEventProps, type: string): void;
    _sendEventsLater(delay?: number): void;
    _sendEvents(): void;
    _removeEvents(event_list: InternalEventProps[]): void;
    log(...args: unknown[]): LogEventProps;
    logEvent(props: LogEventProps): LogEventProps;
    _removeLogs(events: LogEventProps[]): void;
    _sendLogsLater(delay?: number): void;
    _sendLogs(): void;
}
declare function create(): DataCortex;

interface CreateLoggerParams {
    dataCortex: DataCortex;
    prepareEvent?: (req: ExpressRequest, res: ExpressResponse, event: LogEvent) => void;
    logConsole?: boolean;
}
interface ExpressRequest {
    _startTimestamp?: number;
    ip: string;
    method: string;
    originalUrl: string;
    httpVersionMajor: number;
    httpVersionMinor: number;
    get(header: string): string | undefined;
}
interface ExpressResponse {
    end: (chunk?: unknown, encoding?: BufferEncoding) => ExpressResponse;
    getHeader(name: string): string | number | string[] | undefined;
    statusCode: number;
}
interface ExpressNext {
    (): void;
}
interface LogEvent extends LogEventProps {
    event_datetime: Date;
    response_ms: number;
    response_bytes: number;
    remote_address: string;
    log_level: string;
    log_line: string;
}
declare function createLogger(params: CreateLoggerParams): (req: ExpressRequest, res: ExpressResponse, next: ExpressNext) => void;

declare const defaultObject: DataCortex;
declare const init: (opts: InitOptions, done?: () => void) => void;
declare const setDeviceTag: (tag: string) => void;
declare const setUserTag: (tag: string) => void;
declare const flush: () => void;
declare const install: (props: InstallProps) => void;
declare const dau: (props: DauProps) => void;
declare const event: (props: EventProps) => void;
declare const economy: (props: EconomyProps) => void;
declare const messageSend: (props: MessageSendProps) => void;
declare const messageClick: (props: MessageClickProps) => void;
declare const log: (...args: unknown[]) => LogEventProps;
declare const logEvent: (props: LogEventProps) => LogEventProps;
declare const _default: {
    defaultObject: DataCortex;
    init: (opts: InitOptions, done?: () => void) => void;
    setDeviceTag: (tag: string) => void;
    setUserTag: (tag: string) => void;
    flush: () => void;
    install: (props: InstallProps) => void;
    dau: (props: DauProps) => void;
    event: (props: EventProps) => void;
    economy: (props: EconomyProps) => void;
    messageSend: (props: MessageSendProps) => void;
    messageClick: (props: MessageClickProps) => void;
    log: (...args: unknown[]) => LogEventProps;
    logEvent: (props: LogEventProps) => LogEventProps;
    create: typeof create;
    createLogger: typeof createLogger;
};

export { DataCortex, create, createLogger, dau, _default as default, defaultObject, economy, event, flush, init, install, log, logEvent, messageClick, messageSend, setDeviceTag, setUserTag };
export type { BaseEventProps, CreateLoggerParams, DauProps, EconomyProps, EventProps, ExpressNext, ExpressRequest, ExpressResponse, InitOptions, InstallProps, LogEvent, LogEventProps, MessageClickProps, MessageSendProps };
