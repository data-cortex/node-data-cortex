import { DataCortex } from './data_cortex';

export interface CreateLoggerParams {
  dataCortex: DataCortex;
  prepareEvent?: (req: any, res: any, event: any) => void;
  logConsole?: boolean;
}
export function createLogger(params: CreateLoggerParams) {
  const { dataCortex, prepareEvent, logConsole } = params;
  return function (req: any, res: any, next: any) {
    req._startTimestamp = Date.now();
    const end = res.end;
    res.end = function (chunk: any, encoding: any) {
      const response_ms = Date.now() - req._startTimestamp;
      const response_bytes = res.getHeader('content-length') || 0;

      res.end = end;
      const result = res.end(chunk, encoding);
      const event: any = {
        event_datetime: new Date(),
        response_ms,
        response_bytes,
        remote_address: req.ip,
        log_level: String(res.statusCode),
        log_line: `${req.method} ${req.originalUrl} HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
      };
      const referrer = req.get('referrer');
      if (referrer) {
        event.filename = referrer;
      }
      const ua = req.get('user-agent');
      _fillUserAgent(event, ua);
      if (prepareEvent) {
        prepareEvent(req, res, event);
      }
      dataCortex.logEvent(event);
      if (logConsole) {
        console.log(
          `${event.remote_address} - - [${event.event_datetime.toUTCString()}] "${event.log_line}" ${event.log_level} ${event.response_ms}(ms) "${event.filename ?? ''}" "${ua ?? ''}"`
        );
      }
      return result;
    };
    return next();
  };
}
function _fillUserAgent(event: any, ua: string) {
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
      event.device_family = event.device_type;
    }
  }
}
function _regexGet(haystack: string, regex: RegExp, def: string) {
  let ret = def;
  const matches = haystack.match(regex);
  if (matches && matches.length > 1) {
    ret = matches[1];
  }
  return ret;
}

export default { createLogger };
