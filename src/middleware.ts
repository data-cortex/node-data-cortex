import onFinished from 'on-finished';

import type { DataCortex, LogEventProps } from './data_cortex';
import type { Request, Response } from 'express';

export default { createLogger };


export interface MiddlewareLogEvent extends LogEventProps {
  event_datetime: Date;
  response_ms: number;
  response_bytes: number;
  log_level: string;
  log_line: string;
}

export interface CreateLoggerParams {
  dataCortex: DataCortex;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prepareEvent?: (req: any, res: any, event: MiddlewareLogEvent) => void;
  logConsole?: boolean;
}
type CreateLoggerResult = (
  req: unknown,
  res: unknown,
  next: () => void,
) => void;
export function createLogger(params: CreateLoggerParams): CreateLoggerResult {
  const { dataCortex, prepareEvent, logConsole } = params;
  return (req: unknown, res: unknown, next: () => void): void => {
    const expressReq = req as Request;
    const expressRes = res as Response;
    const start_time = Date.now();
    onFinished(expressRes, (_err, res) => {
      const response_ms = Date.now() - start_time;
      const response_bytes = res.getHeader('content-length') || 0;
      const event_datetime = new Date();
      const event: MiddlewareLogEvent = {
        event_datetime,
        response_ms,
        response_bytes: typeof response_bytes === 'number' ? response_bytes : 0,
        log_level: String(res.statusCode),
        log_line: `${expressReq.method} ${expressReq.originalUrl} HTTP/${expressReq.httpVersionMajor}.${
          expressReq.httpVersionMinor
        }`,
      };
      if (expressReq.ip) {
        event.remote_address = expressReq.ip;
      }
      const referrer = expressReq.get('referrer');
      if (referrer) {
        event.filename = referrer;
      }
      const ua = expressReq.get('user-agent');
      _fillUserAgent(event, ua);
      prepareEvent?.(expressReq, expressRes, event);
      dataCortex.logEvent(event as LogEventProps);
      if (logConsole) {
        console.log(
          `${event.remote_address} - - [${event_datetime.toUTCString()}] "${event.log_line}" ${event.log_level} ${event.response_ms}(ms) "${event.filename ?? ''}" "${ua ?? ''}"`,
        );
      }
    });
    next();
  };
}
function _fillUserAgent(event: LogEventProps, ua: string | undefined): void {
  if (ua) {
    if (!event.os) {
      if (ua.includes('Win')) {
        event.os = 'windows';
        event.os_ver = _regexGet(ua, /Windows NT ([^ ;)]*)/, 'unknown');
      } else if (ua.includes('iPhone OS')) {
        event.os = 'ios';
        event.os_ver = _regexGet(ua, /iPhone OS ([^ ;)]*)/, 'unknown');
        event.os_ver = event.os_ver.replace(/_/g, '.');
      } else if (ua.includes('iPad')) {
        event.os = 'ios';
        event.os_ver = _regexGet(ua, /CPU OS ([^ ;)]*)/, 'unknown');
        event.os_ver = event.os_ver.replace(/_/g, '.');
      } else if (ua.includes('Mac OS X')) {
        event.os = 'mac';
        event.os_ver = _regexGet(ua, /Mac OS X ([^ ;)]*)/, 'unknown');
        event.os_ver = event.os_ver.replace(/_/g, '.');
        event.os_ver = event.os_ver.replace(/\.0$/, '');
      } else if (ua.includes('Android')) {
        event.os = 'android';
        event.os_ver = _regexGet(ua, /Android ([^ ;)]*)/, 'unknown');
        event.os_ver = event.os_ver.replace(/_/g, '.');
      } else if (ua.includes('Linux')) {
        event.os = 'linux';
      } else if (ua.includes('X11')) {
        event.os = 'unix';
      }
    }

    if (!event.browser) {
      if (ua.includes('Edge')) {
        event.browser = 'edge';
        event.browser_ver = _regexGet(ua, /Edge\/([^ ;)]*)/, 'unknown');
      } else if (ua.includes('Chrome')) {
        event.browser = 'chrome';
        event.browser_ver = _regexGet(ua, /Chrome\/([^ ;)]*)/, 'unknown');
      } else if (ua.includes('CriOS')) {
        event.browser = 'chrome';
        event.browser_ver = _regexGet(ua, /CriOS\/([^ ;)]*)/, 'unknown');
      } else if (ua.includes('Firefox')) {
        event.browser = 'firefox';
        event.browser_ver = _regexGet(ua, /Firefox\/([^ ;)]*)/, 'unknown');
      } else if (ua.includes('Android')) {
        event.browser = 'android';
        event.browser_ver = _regexGet(ua, /Version\/([^ ;)]*)/, 'unknown');
      } else if (ua.includes('Safari')) {
        event.browser = 'safari';
        event.browser_ver = _regexGet(ua, /Version\/([^ ;)]*)/, 'unknown');
      } else if (ua.includes('Trident')) {
        event.browser = 'ie';
        event.browser_ver = _regexGet(ua, /rv:([^ ;)]*)/, 'unknown');
      } else if (ua.includes('MSIE')) {
        event.browser = 'ie';
        event.browser_ver = _regexGet(ua, /MSIE ([^ ;)]*)/, 'unknown');
      } else if (ua.includes('MessengerForiOS')) {
        event.browser = 'fbmessenger';
        event.browser_ver = _regexGet(ua, /FBAV\/([^ ;)]*)/, 'unknown');
      } else if (ua.includes('FB_IAB/MESSENGER')) {
        event.browser = 'fbmessenger';
        event.browser_ver = _regexGet(ua, /FBAV\/([^ ;)]*)/, 'unknown');
      }
    }

    if (!event.device_type) {
      event.device_type = 'desktop';
      if (ua.includes('iPod')) {
        event.device_type = 'ipod';
      } else if (ua.includes('iPhone')) {
        event.device_type = 'iphone';
      } else if (ua.includes('iPad')) {
        event.device_type = 'ipad';
      } else if (ua.includes('Android')) {
        if (!ua.includes('Mobile')) {
          event.device_type = 'android_tablet';
        } else {
          event.device_type = 'android';
        }
      } else if (ua.includes('Mobile')) {
        event.device_type = 'mobile';
      }
    }
    if (!event['device_family']) {
      event['device_family'] = event.device_type || 'desktop';
    }
  }
}
function _regexGet(haystack: string, regex: RegExp, def: string): string {
  let ret = def;
  const matches = haystack.match(regex);
  if (matches && matches.length > 1 && matches[1] !== undefined) {
    ret = matches[1];
  }
  return ret;
}
