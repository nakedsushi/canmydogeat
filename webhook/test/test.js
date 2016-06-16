'use strict';

const chai = require('chai');
const spies = require('chai-spies');
const expect = chai.expect;
const handler = require('../handler.js').handler;
const messaging = require('../messaging.js');
const cantMatchEvent = require('./cant-match-event.js');
const canMyDogEatEvent = require('./can-my-dog-eat-event.js');

chai.use(spies);

describe('handler', () => {
  it('should send default message to facebook if message does not match question format', () => {
    let spy = chai.spy.on(messaging, 'sendMessageToFacebook');
    handler(cantMatchEvent, null, null);
    expect(spy).to.have.been.called.once.with({
      recipient: {
        id: cantMatchEvent['payload']['entry'][0]['messaging'][0]['sender']['id']
      },
      message: {
        text: 'Hi! To ask if it’s ok for your dog to eat something, ask it like: ' +
        'Can my dog eat bananas?'
      }
    });
  });
});