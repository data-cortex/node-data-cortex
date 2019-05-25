'use strict';

const dataCortex = require('../index.js');

console.log("delayed example");

const apiKey = process.argv[2];
if (!apiKey) {
  console.log("Usage: " + path.basename(process.argv[1]) + " <api_key>");
  process.exit(-1);
}

const opts = {
  apiKey: apiKey,
  orgName: 'test',
  appVer: '1.0.0',
};
dataCortex.init(opts);

console.log("before delay");
dataCortex.event({ device_tag: '1234', kingdom: 'before delay'});

setTimeout(() => {
  console.log("after delay");
  dataCortex.event({ device_tag: '1234', kingdom: 'after delay'});
},20*1000);

setTimeout(() => {
  console.log("after second delay");
  dataCortex.event({ device_tag: '1234', kingdom: 'after second delay'});
  dataCortex.flush();
},40*1000);

setTimeout(() => {
  console.log("done done");
},45*1000);
