import { DataCortex } from './data_cortex';
declare function createLogger(params: {
    dataCortex: DataCortex;
    prepareEvent?: (req: any, res: any, event: any) => void;
    logConsole?: boolean;
}): (req: any, res: any, next: any) => any;
export { createLogger };
