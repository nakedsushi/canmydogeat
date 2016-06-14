'use strict';

const axios = require('axios');
const env = require('node-env-file');
env('./prod.env');

const inflection = require('inflection');
const AWS = require('aws-sdk');
const unmarshalJson = require('dynamodb-marshaler').unmarshalJson;
const canMyDogRegex = /can my dog eat (.*)\?/i;
const facebookUrl =
  `https://graph.facebook.com/v2.6/me/messages?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`;


AWS.config.update({
  accessKeyId: process.env.AWS_LAMBDA_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_LAMBDA_SECRET_ACCESS_KEY,
  region: 'us-west-2'
});

const db  = new AWS.DynamoDB();
module.exports.handler = function(event, context, callback) {
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
          let message = 'Hi! To ask if your dog can eat something, ask your question like: ' +
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
                  replyAboutFood(data, messagingItem.sender.id);
                }
              });
            }
          } else {
            sendMessageToFacebook({
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

let sendMessageToFacebook = (payload) => {
  axios.post(facebookUrl, payload)
    .then((response) => {
      return callback(null, response);
    });
  console.log(payload);
};

let replyAboutFood = (data, senderId) => {
  let message = 'Hmm...not sure. I’ve never been asked that before. ' +
    'I’ll do some research and let you know.';
  if (data.Item) {
    let item = JSON.parse(unmarshalJson(data.Item));
    let answer = 'No!';
    if (item.answer) { answer = 'Yes'; }
    message = {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [{
            title: answer,
            subtitle: item.body
          }]
        }
      }
    };
    sendMessageToFacebook({
      recipient: {
        id: senderId
      },
      message: message
    });
  } else {
    sendMessageToFacebook({
      recipient: {
        id: senderId
      },
      message: { text: message }
    });
  }
};