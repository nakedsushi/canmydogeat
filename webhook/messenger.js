'use strict';

const axios = require('axios');
const unmarshalJson = require('dynamodb-marshaler').unmarshalJson;
const env = require('node-env-file');
env('./prod.env');
const google = require('google');
google.resultsPerPage = 10;

const facebookUrl =
  `https://graph.facebook.com/v2.6/me/messages?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`;

const textCharLimit = 320;

const sendMessageToFacebook = (payload) => {
  axios.post(facebookUrl, payload)
    .then((response) => {
      return callback(null, response);
    });
};

const checkLength = (str) => {
  let messages = [];
  if (str.length >= textCharLimit) {
    messages = str.match( /[^\.!\?]+[\.!\?]+/g );
  } else {
    messages = [str];
  }
  return messages;
};

const replyAboutFood = (data, senderId) => {
  if (data.Item) {
    let message = null;
    let item = JSON.parse(unmarshalJson(data.Item));
    let answer = 'No!';
    let imageUrl = 'http://67.media.tumblr.com/tumblr_m8s4re8wNP1qhiwsqo1_400.jpg';

    if (item.answer) {
      answer = 'Yes!';
      imageUrl = 'https://c1.staticflickr.com/1/4/4337807_47390a6754_z.jpg';
    }
    let messages = checkLength(`${answer} ${item.body}`);

    messages.forEach((messageBody) => {
      if (item.structured_answer) {
        message = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [{
                title: answer,
                subtitle: messageBody,
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
          message: {text: messageBody}
        });
      }
    });
    return true;
  } else {
    return false;
  }
};

const googleFoodAndMessageUser = (food, senderId) => {
  const query = `can dogs eat ${food}?`;
  let buttons = [];
  let message;
  let maxButtonsInMessage = 3;
  let savedUrl = {};

  google(query, (err, results) => {
    if (err) console.error(err);
    results.links.forEach((link) => {
      if (link.href && link.title) {
        if (!savedUrl[link.href]) {
          buttons.push({
            title: link.title,
            url: link.href,
            type: 'web_url'
          });
          savedUrl[link.href] = true;
        }

        if (buttons.length === maxButtonsInMessage) {
          message = {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'button',
                text: 'I don’t have an answer yet, but I found a couple of pages you should check out:',
                buttons: buttons
              }
            }
          };
          sendMessageToFacebook({
            recipient: {
              id: senderId
            },
            message: message
          });
        }
      }
    });
  });
};

module.exports = {
  sendMessageToFacebook: sendMessageToFacebook,
  replyAboutFood: replyAboutFood,
  googleFoodAndMessageUser: googleFoodAndMessageUser
};