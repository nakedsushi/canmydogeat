'use strict';

const env = require('node-env-file');
env('./prod.env');

const inflection = require('inflection');
const canMyDogRegex = /can my dog eat (.*)\?/i;
const messenger = require('./messenger.js');
const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: process.env.AWS_LAMBDA_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_LAMBDA_SECRET_ACCESS_KEY,
  region: 'us-west-2'
});
const db  = new AWS.DynamoDB();

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
          let message = 'Hi! To ask if it’s ok for your dog to eat something, ask it like: ' +
            'Can my dog eat bananas?';
          let matched = undefined;
          if (matched = messagingItem.message.text.match(canMyDogRegex)) {
            let food = matched[1];
            if (food) {
              food = inflection.singularize(food);
              let params = {TableName: 'foods_for_dogs', Key: { food: {S: food}}};
              db.getItem(params, (err, data) => {
                if (err) console.log(err, err.stack);
                else {
                  messenger.replyAboutFood(data, messagingItem.sender.id);
                }
              });
            }
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
