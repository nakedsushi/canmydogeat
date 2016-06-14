'use strict';

const axios = require('axios');
const env = require('node-env-file');
const inflection = require('inflection');
const AWS = require('aws-sdk');
const unmarshalJson = require('dynamodb-marshaler').unmarshalJson;

const canMyDogRegex = /can my dog eat (.*)\?/i;

env('./prod.env');

AWS.config.update({
  accessKeyId: process.env.AWS_LAMBDA_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_LAMBDA_SECRET_ACCESS_KEY,
  region: 'us-west-2'
});

const db  = new AWS.DynamoDB();

module.exports.handler = function(event, context, callback) {
  let accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (event.method === 'GET') {
    // facebook app verification
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
                  if (data.Item) {
                    let item = JSON.parse(unmarshalJson(data.Item));
                    let answer = 'No!';
                    if (item.answer) { answer = 'Yes, don’t worry.'; }
                    message = `${answer} ${item.body}`;
                  } else {
                    message = 'Hmm...not sure. I’ve never been asked that before. ' +
                      'I’ll do some research and let you know.';
                  }

                  let payload = {
                    recipient: {
                      id: messagingItem.sender.id
                    },
                    message: {
                      text: message
                    }
                  };

                  let url = `https://graph.facebook.com/v2.6/me/messages?access_token=${accessToken}`;
                  axios.post(url, payload)
                    .then((response) => {
                      return callback(null, response);
                    });

                }
              });
            }
          } else {
            let payload = {
              recipient: {
                id: messagingItem.sender.id
              },
              message: {
                text: message
              }
            };

            let url = `https://graph.facebook.com/v2.6/me/messages?access_token=${accessToken}`;

            axios.post(url, payload)
              .then((response) => {
                return callback(null, response);
              });
          }
        }
      });
    });
  }
};