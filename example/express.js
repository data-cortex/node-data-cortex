const express = require('express');
const http = require('node:http');
const path = require('node:path');

const dataCortex = require('../dist/index.js');

console.log('express example');

const apiKey = process.argv[2];
if (!apiKey) {
  console.log('Usage: ' + path.basename(process.argv[1]) + ' <api_key>');
  process.exit(-1);
}

const opts = {
  apiKey: apiKey,
  orgName: 'test',
  appVer: '0.0.13',
  serverVer: '0.0.13',
};
dataCortex.init(opts);

const app = express();

app.enable('trust proxy');
app.set('port', process.env.PORT || 3000);

app.all('/before', function (req, res) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send('before logging');
});

const log_opts = {
  dataCortex,
  prepareEvent: _prepareEvent,
  logConsole: true,
};
const logger = dataCortex.createLogger(log_opts);
app.use(logger);

app.all('/after', function (req, res) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send('after logging');
});
app.all('/device', function (req, res) {
  req.device_tag = req.query?.device_tag ?? req.body?.device_tag;
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send({ query: req.query, device: req.device_tag ?? null });
});
app.all('/user', function (req, res) {
  req.user_tag = req.query?.user_tag ?? req.body?.user_tag;
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send({ query: req.query, user: req.user_tag ?? null });
});

const router = new express.Router();
const router2 = new express.Router();
router.all('/another', function (req, res) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send('another');
});
router2.all('/another2', function (req, res) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send('another2');
});
router.use('/sub2', router2);
app.use('/sub', router);

const http_server = http.createServer(app);
http_server.listen(app.get('port'), () => {
  console.log('listening on port', app.get('port'));
});
function _prepareEvent(req, res, event) {
  if (req.device_tag) {
    event.device_tag = req.device_tag;
  }
  if (req.user_tag) {
    event.user_tag = req.user_tag;
  }
  event.log_line = event.log_line.replace(/(secret)=[^&]*/, '$1=[REDACTED]');
}
