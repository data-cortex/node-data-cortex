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
    eventList: any[];
    nextIndex: number;
    delayCount: number;
    defaultBundle: any;
    logList: any[];
    logTimeout: NodeJS.Timeout | false;
    isLogSending: boolean;
    logDelayCount: number;
    defaultLogBundle: any;
    hasHupHandler: boolean;
    constructor();
    init(opts: any, done: () => void): void;
    setDeviceTag(tag: string): void;
    setUserTag(tag: string): void;
    install(props: any): void;
    dau(props: any): void;
    event(props: any): void;
    messageSend(props: any): void;
    messageClick(props: any): void;
    economy(props: any): void;
    flush(): void;
    _internalEventAdd(input_props: any, type: string): void;
    _sendEventsLater(delay?: number): void;
    _sendEvents(): void;
    _removeEvents(event_list: any[]): void;
    log(...args: any[]): void;
    logEvent(props: any): any;
    _removeLogs(events: any[]): void;
    _sendLogsLater(delay?: number): void;
    _sendLogs(): void;
}
declare function create(): DataCortex;

interface CreateLoggerParams {
    dataCortex: DataCortex;
    prepareEvent?: (req: any, res: any, event: any) => void;
    logConsole?: boolean;
}
declare function createLogger(params: CreateLoggerParams): (req: any, res: any, next: any) => any;

declare const defaultObject: DataCortex;
declare const init: (opts: any, done: () => void) => void;
declare const setDeviceTag: (tag: string) => void;
declare const setUserTag: (tag: string) => void;
declare const flush: () => void;
declare const install: (props: any) => void;
declare const dau: (props: any) => void;
declare const event: (props: any) => void;
declare const economy: (props: any) => void;
declare const messageSend: (props: any) => void;
declare const messageClick: (props: any) => void;
declare const log: (...args: any[]) => void;
declare const logEvent: (props: any) => any;
declare const _default: {
    defaultObject: DataCortex;
    init: (opts: any, done: () => void) => void;
    setDeviceTag: (tag: string) => void;
    setUserTag: (tag: string) => void;
    flush: () => void;
    install: (props: any) => void;
    dau: (props: any) => void;
    event: (props: any) => void;
    economy: (props: any) => void;
    messageSend: (props: any) => void;
    messageClick: (props: any) => void;
    log: (...args: any[]) => void;
    logEvent: (props: any) => any;
    create: typeof create;
    createLogger: typeof createLogger;
};

export { dau, _default as default, defaultObject, economy, event, flush, init, install, log, logEvent, messageClick, messageSend, setDeviceTag, setUserTag };
