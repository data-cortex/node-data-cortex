'use strict';

const dataCortex = require('../index.js');
const path = require('path');

console.log('multiple example');

const apiKey = process.argv[2];
const apiKey2 = process.argv[3];
if (!apiKey || !apiKey2) {
  console.log(
    'Usage: ' + path.basename(process.argv[1]) + ' <api_key> <api_key>'
  );
  process.exit(-1);
}

const dc1 = dataCortex.create();
const opts = {
  apiKey: apiKey,
  orgName: 'test',
  appVer: '1.0.0',
};
dc1.init(opts);

const dc2 = dataCortex.create();
const opts2 = {
  apiKey: apiKey2,
  orgName: 'test',
  appVer: '1.0.1',
};
dc2.init(opts2);

dc1.event({ device_tag: '123', kingdom: 'kingdom', species: 'dc1' });
dc2.event({ device_tag: '123', kingdom: 'kingdom', species: 'dc2' });

console.log('dc1 & dc2 sent event 1');

dc1.event({ device_tag: '123', kingdom: 'another', species: 'dc1' });
dc2.event({ device_tag: '123', kingdom: 'another', species: 'dc2' });

console.log('dc1 & dc2 sent event 2');

dc1.flush();
dc2.flush();
console.log('dc1 & dc2 flushed, waiting');

setTimeout(() => {
  console.log('done done');
}, 1000);
