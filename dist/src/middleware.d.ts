import { DataCortex } from './data_cortex';
interface CreateLoggerParams {
    dataCortex: DataCortex;
    prepareEvent?: (req: any, res: any, event: any) => void;
    logConsole?: boolean;
}
declare function createLogger(params: CreateLoggerParams): (req: any, res: any, next: any) => any;
export { createLogger };
