"use strict";

var express = require('express'),
    bodyParser = require('body-parser'),
    processor = require('./modules/processor'),
    handlers = require('./modules/handlers'),
    postbacks = require('./modules/postbacks'),
    quickreplies = require('./modules/quickreplies'),
    uploads = require('./modules/uploads'),
    FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN,
    app = express();

app.set('port', process.env.PORT || 5000);

app.use(bodyParser.json());

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong validation token');
    }
});

app.post('/webhook', (req, res) => {
    let events = req.body.entry[0].messaging;
    for (let i = 0; i < events.length; i++) {
        let event = events[i];
        console.log('event: ', event);
        let sender = event.sender.id;
        if (process.env.MAINTENANCE_MODE && ((event.message && event.message.text) || event.postback)) {
            sendMessage({text: `Sorry I'm taking a break right now.`}, sender);
        } else if(event.message && event.message.quick_reply){
            console.log('inside quickreply');
            let payload = event.message.quick_reply.payload.split(",");
            console.log('payload: ', payload);
            let quickreply = quickreplies[payload[0]];
            console.log('quickreply: ', quickreply);
            if (quickreply && typeof quickreply === "function") {
                quickreply(sender, payload);
            } else {
                console.log("Quickreply " + quickreply + " is not defined");
            }

        } else if (event.message && event.message.text) {
            console.log('message');
            let result = processor.match(event.message.text);
            if (result) {
                let handler = handlers[result.handler];
                if (handler && typeof handler === "function") {
                    handler(sender, result.match);
                } else {
                    console.log("Handler " + result.handlerName + " is not defined");
                }
            }
        } else if (event.postback) {
            console.log('postback');
            let payload = event.postback.payload.split(",");
            let postback = postbacks[payload[0]];
            if (postback && typeof postback === "function") {
                postback(sender, payload);
            } else {
                console.log("Postback " + postback + " is not defined");
            }
        } else if (event.message && event.message.attachments) {
            uploads.processUpload(sender, event.message.attachments);
        }
    }
    res.sendStatus(200);
});

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});