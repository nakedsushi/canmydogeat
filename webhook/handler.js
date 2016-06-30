'use strict';

const messenger = require('./messenger.js');
const parser = require('./parser.js');

const env = require('node-env-file');
env('./prod.env');
const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: process.env.AWS_LAMBDA_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_LAMBDA_SECRET_ACCESS_KEY,
  region: 'us-west-2'
});
const db  = new AWS.DynamoDB();

const saveToAddList = (senderId, message) => {
  let params = {TableName: 'foods_to_add', Item: {
    message: {'S': message},
    sender: {'N': senderId}
  }};
  db.putItem(params, function (err, data){
    if (err) console.log(err, err.stack);
    else console.log(data);
  });
};

const queryFood = (food) => {
  let params = {TableName: 'foods_for_dogs', Key: { food: {S: food}}};
  db.getItem(params, (err, data) => {
    if (err) console.log(err, err.stack);
    console.log(data.Item);
  });
};

module.exports.handler = (event, context, callback) => {
  if (event.method === 'GET') {
    if (event.hubVerifyToken === process.env.HUB_VERIFY_TOKEN && event.hubChallenge) {
      return callback(null, parseInt(event.hubChallenge));
    } else {
      return callback('Invalid token');
    }
  }

  if (event.method === 'POST') {
    event.payload.entry.map((entry) => {
      entry.messaging.map((messagingItem) => {
        if (messagingItem.message && messagingItem.message.text) {
          let message = 'Sorry, English isn’t my first language. Can you ask me in a simpler way with a question mark (?) like: ' +
            'Can my dog eat bananas?';
          let food = undefined;
          if (parser.isWellFormedQuestion(messagingItem.message.text)) {
            if (food = parser.getObject(messagingItem.message.text)) {
              let params = {TableName: 'foods_for_dogs', Key: { food: {S: food}}};
              db.getItem(params, (err, data) => {
                if (err) console.log(err, err.stack);
                else {
                  let foundFood = messenger.replyAboutFood(data, messagingItem.sender.id);
                  if (!foundFood) {
                    message = 'I’ve never thought about that before. ' +
                      'Let me do some Googling and let you know if I find anything. Hold on.';
                    messenger.sendMessageToFacebook({
                      recipient: {
                        id: messagingItem.sender.id
                      },
                      message: {text: message}
                    });
                    saveToAddList(messagingItem.sender.id, messagingItem.message.text);
                    messenger.googleFoodAndMessageUser(food, messagingItem.sender.id);
                  }
                }
              });
            }
          } else if (parser.isDogSpeak(messagingItem.message.text)) {
            messenger.sendMessageToFacebook({
              recipient: {
                id: messagingItem.sender.id
              },
              message: {
                attachment: {
                  type: 'template',
                  payload: {
                    template_type: 'generic',
                    elements: [{
                      title: 'woof woof',
                      subtitle: 'arf arf arf arf bow wow arf!',
                      image_url: 'https://upload.wikimedia.org/wikipedia/en/5/5f/Original_Doge_meme.jpg'
                    }]
                  }
                }
              }
          });
          } else {
            messenger.sendMessageToFacebook({
              recipient: {
                id: messagingItem.sender.id
              },
              message: {
                text: message
              }
            });
          }
        }
      });
    });
  }
};
