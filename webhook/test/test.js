'use strict';

const chai = require('chai');
const spies = require('chai-spies');
const expect = chai.expect;
const handler = require('../handler.js').handler;
const messenger = require('../messenger.js');
const parser = require('../parser.js');

const cantMatchEvent = require('./cant-match-event.js');
const canMyDogEatEvent = require('./can-my-dog-eat-event.js');

chai.use(spies);

describe('handler', () => {
  describe('messenger', () => {
    it('should send default message to facebook if message does not match question format', () => {
      let spy = chai.spy.on(messenger, 'sendMessageToFacebook');
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

  describe('parser', () => {
    it('should return a normalized object when a sentence is simple', () => {
      expect(parser.getObject('can my dog eat bananas?')).to.equal('banana');
      expect(parser.getObject('Can my dog eat a banana?')).to.equal('banana');
      expect(parser.getObject('is it ok if my dog eats bananas')).to.equal('banana');
    });
  });
});