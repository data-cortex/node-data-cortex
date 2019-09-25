'use strict';

const dataCortex = require('../index.js');
const path = require('path');

console.log("simple example");

const apiKey = process.argv[2];
if (!apiKey) {
  console.log("Usage: " + path.basename(process.argv[1]) + " <api_key>");
  process.exit(-1);
}

const opts = {
  apiKey: apiKey,
  orgName: 'test',
  appVer: '1.0.1',
  serverVer: '0.0.13',
};
dataCortex.init(opts);

dataCortex.event({ device_tag: '123', kingdom: 'kingdom', species: 'species' });
dataCortex.event({ device_tag: '123', event_datetime: new Date(), kingdom: 'date' });
dataCortex.event({ device_tag: '123', kingdom: '"quotes""middle""' });
dataCortex.event({ device_tag: '123', kingdom: "newline", });

dataCortex.economy({
  device_tag: '123',
  kingdom: 'economy',
  spend_type: 'cash_purchase',
  spend_currency: 'USD',
  spend_amount: 123.45,
});

dataCortex.dau({
  device_tag: '123',
  kingdom: 'dau',
});

dataCortex.install({
  device_tag: '123',
  kingdom: 'organic',
});

dataCortex.messageSend({
  device_tag: '123',
  kingdom: 'message_send',
  network: 'email',
  channel: 'ses',
  from_tag: 'server',
  to_list: ['123'],
});

dataCortex.messageClick({
  device_tag: '123',
  kingdom: 'message_click',
  network: 'facebook',
  from_tag: '456',
  to_tag: '123',
});

dataCortex.log("This is a log line");
dataCortex.log("This is a log line with args",1,"foo",new Date(),new Error());

dataCortex.flush();

console.log("flushed, waiting");
setTimeout(() => {
  console.log("done done");
},1000);
