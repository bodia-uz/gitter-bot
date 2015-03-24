var Gitter = require('node-gitter');
var config = require('./config.json');

var CALC_PATTERN = /^calc ([\(\)\*\/\+\-\d\.\s]+)/;

var chanel = process.argv[2];

if (!config || !config.token) {
    console.log('set token parameter in config.json');
    return
}

if (!chanel) {
    console.log('chanel parameter absent');
    return;
}

var gitter = new Gitter(config.token);

gitter.currentUser()
    .then(function(user) {
        console.log('You are logged in as:', user.username);
    });

gitter.rooms.join(chanel)
    .then(function(room) {
        console.log('Joined room: ', room.name);

        room.listen().on('message', function(message) {
            var match = message.text.match(CALC_PATTERN);
            if (match) {
                console.log('New message:', message.text);

                try {
                    room.send(match[1] + '=' + eval(match[1]));
                } catch(e) {
                    room.send('Invalid calc formula ' + match[1] + '\nTry again!');
                }
            }
        });
    })
    .fail(function(err) {
        console.log('Not possible to join the room: ', err);
    })
