import { DataCortex, LogEventProps } from './data_cortex';
import type { Request, Response, NextFunction } from 'express';
import onFinished from 'on-finished';

export default { createLogger };

export interface CreateLoggerParams {
  dataCortex: DataCortex;
  prepareEvent?: (req: unknown, res: unknown, event: LogEventProps) => void;
  logConsole?: boolean;
}
type CreateLoggerResult = (
  req: unknown,
  res: unknown,
  next: () => void
) => void;
export function createLogger(params: CreateLoggerParams): CreateLoggerResult {
  const { dataCortex, prepareEvent, logConsole } = params;
  return function (req: Request, res: Response, next: NextFunction) {
    const start_time = Date.now();
    onFinished(res, function (err, res) {
      const response_ms = Date.now() - start_time;
      const response_bytes = res.getHeader('content-length') || 0;
      const event_datetime = new Date();
      const event: LogEventProps = {
        event_datetime,
        response_ms,
        response_bytes: typeof response_bytes === 'number' ? response_bytes : 0,
        log_level: String(res.statusCode),
        log_line: `${req.method} ${req.originalUrl} HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
      };
      if (req.ip) {
        event.remote_address = req.ip;
      }
      const referrer = req.get('referrer');
      if (referrer) {
        event.filename = referrer;
      }
      const ua = req.get('user-agent');
      _fillUserAgent(event, ua);
      prepareEvent?.(req, res, event);
      dataCortex.logEvent(event);
      if (logConsole) {
        console.log(
          `${event.remote_address} - - [${event_datetime.toUTCString()}] "${event.log_line}" ${event.log_level} ${event.response_ms}(ms) "${event.filename ?? ''}" "${ua ?? ''}"`
        );
      }
    });
    next();
  } as CreateLoggerResult;
}
function _fillUserAgent(event: LogEventProps, ua: string | undefined): void {
  if (ua) {
    if (!event.os) {
      if (ua.indexOf('Win') !== -1) {
        event.os = 'windows';
        event.os_ver = _regexGet(ua, /Windows NT ([^ ;)]*)/, 'unknown');
      } else if (ua.indexOf('iPhone OS') !== -1) {
        event.os = 'ios';
        event.os_ver = _regexGet(ua, /iPhone OS ([^ ;)]*)/, 'unknown');
        event.os_ver = event.os_ver.replace(/_/g, '.');
      } else if (ua.indexOf('iPad') !== -1) {
        event.os = 'ios';
        event.os_ver = _regexGet(ua, /CPU OS ([^ ;)]*)/, 'unknown');
        event.os_ver = event.os_ver.replace(/_/g, '.');
      } else if (ua.indexOf('Mac OS X') !== -1) {
        event.os = 'mac';
        event.os_ver = _regexGet(ua, /Mac OS X ([^ ;)]*)/, 'unknown');
        event.os_ver = event.os_ver.replace(/_/g, '.');
        event.os_ver = event.os_ver.replace(/\.0$/, '');
      } else if (ua.indexOf('Android') !== -1) {
        event.os = 'android';
        event.os_ver = _regexGet(ua, /Android ([^ ;)]*)/, 'unknown');
        event.os_ver = event.os_ver.replace(/_/g, '.');
      } else if (ua.indexOf('Linux') !== -1) {
        event.os = 'linux';
      } else if (ua.indexOf('X11') !== -1) {
        event.os = 'unix';
      }
    }

    if (!event.browser) {
      if (ua.indexOf('Edge') !== -1) {
        event.browser = 'edge';
        event.browser_ver = _regexGet(ua, /Edge\/([^ ;)]*)/, 'unknown');
      } else if (ua.indexOf('Chrome') !== -1) {
        event.browser = 'chrome';
        event.browser_ver = _regexGet(ua, /Chrome\/([^ ;)]*)/, 'unknown');
      } else if (ua.indexOf('CriOS') !== -1) {
        event.browser = 'chrome';
        event.browser_ver = _regexGet(ua, /CriOS\/([^ ;)]*)/, 'unknown');
      } else if (ua.indexOf('Firefox') !== -1) {
        event.browser = 'firefox';
        event.browser_ver = _regexGet(ua, /Firefox\/([^ ;)]*)/, 'unknown');
      } else if (ua.indexOf('Android') !== -1) {
        event.browser = 'android';
        event.browser_ver = _regexGet(ua, /Version\/([^ ;)]*)/, 'unknown');
      } else if (ua.indexOf('Safari') !== -1) {
        event.browser = 'safari';
        event.browser_ver = _regexGet(ua, /Version\/([^ ;)]*)/, 'unknown');
      } else if (ua.indexOf('Trident') !== -1) {
        event.browser = 'ie';
        event.browser_ver = _regexGet(ua, /rv:([^ ;)]*)/, 'unknown');
      } else if (ua.indexOf('MSIE') !== -1) {
        event.browser = 'ie';
        event.browser_ver = _regexGet(ua, /MSIE ([^ ;)]*)/, 'unknown');
      } else if (ua.indexOf('MessengerForiOS') !== -1) {
        event.browser = 'fbmessenger';
        event.browser_ver = _regexGet(ua, /FBAV\/([^ ;)]*)/, 'unknown');
      } else if (ua.indexOf('FB_IAB/MESSENGER') !== -1) {
        event.browser = 'fbmessenger';
        event.browser_ver = _regexGet(ua, /FBAV\/([^ ;)]*)/, 'unknown');
      }
    }

    if (!event.device_type) {
      event.device_type = 'desktop';
      if (ua.indexOf('iPod') !== -1) {
        event.device_type = 'ipod';
      } else if (ua.indexOf('iPhone') !== -1) {
        event.device_type = 'iphone';
      } else if (ua.indexOf('iPad') !== -1) {
        event.device_type = 'ipad';
      } else if (ua.indexOf('Android') !== -1) {
        if (ua.indexOf('Mobile') === -1) {
          event.device_type = 'android_tablet';
        } else {
          event.device_type = 'android';
        }
      } else if (ua.indexOf('Mobile') !== -1) {
        event.device_type = 'mobile';
      }
    }
    if (!event.device_family) {
      event.device_family = event.device_type || 'desktop';
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
