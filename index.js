var Bot = require('./bot.js');
var config = require('./config.json');

var gitterToken = process.env.TOKEN || config.token;
var roomName = process.argv[2];

if (!gitterToken || !roomName) {
  console.log('==========================================');
  console.log('You need to provide a ' + (!gitterToken ? 'valid OAuth token:' : 'room name:'));
  console.log('$ TOKEN=<your_token> npm start <user/room>');
  console.log('==========================================\n');
  process.exit(1);
}

var bot = new Bot(gitterToken, config);

bot.joinRoom(roomName);


