'use strict';

const axios = require('axios');
const unmarshalJson = require('dynamodb-marshaler').unmarshalJson;
const env = require('node-env-file');
env('./prod.env');
const facebookUrl =
  `https://graph.facebook.com/v2.6/me/messages?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`;

const sendMessageToFacebook = (payload) => {
  axios.post(facebookUrl, payload)
    .then((response) => {
      return callback(null, response);
    });
};

const replyAboutFood = (data, senderId) => {
  if (data.Item) {
    let message = null;
    let item = JSON.parse(unmarshalJson(data.Item));
    let answer = 'No!';
    let imageUrl = 'http://67.media.tumblr.com/tumblr_m8s4re8wNP1qhiwsqo1_400.jpg';

    if (item.answer) {
      answer = 'Yes';
      imageUrl = 'https://c1.staticflickr.com/1/4/4337807_47390a6754_z.jpg';
    }
    if (item.structured_answer) {
      message = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: answer,
              subtitle: item.body,
              image_url: imageUrl,
              buttons: [
                {
                  type: 'web_url',
                  url: item.url,
                  title: 'More Info'
                }
              ]
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
        message: {text: `${answer} ${item.body}`}
      });
    }
    return true;
  } else {
    return false;
  }
};

module.exports = {
  sendMessageToFacebook: sendMessageToFacebook,
  replyAboutFood: replyAboutFood
};