'use strict';

const chai = require('chai');
const spies = require('chai-spies');
const expect = chai.expect;
const axios = require('axios');
const handler = require('../handler.js').handler;
const messenger = require('../messenger.js');
const parser = require('../parser.js');

const cantMatchEvent = require('./not-a-question-event.js');

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
          text: 'Sorry, English isn’t my first language. Can you ask me in a simpler way like: ' +
          'Can my dog eat bananas?'
        }
      });
    });

    it('should send one message to facebook if answer is short', () => {
      let spy = chai.spy.on(axios, 'post');
      let text = 'here is a short message.';
      let senderId = '123';
      let data = { Item:
        { food: { S: 'cheese' },
          body: { S: text },
          answer: { BOOL: true },
          structured_answer: { BOOL: false } }
      };
      messenger.replyAboutFood(data, senderId);
      expect(spy).to.have.been.called.once.with({
        recipient: {
          id: senderId
        },
        message: {
          text: `Yes! ${text}`
        }
      });
    });

    it('should split into two messages to facebook if answer is long', () => {
      let spy = chai.spy.on(axios, 'post');
      let text = 'In small to moderate quantities. As long as your dog isn’t lactose intolerant, ' +
        'which is rare but still possible in canines, cheese can be a great treat. Many cheeses can be ' +
        'high in fat, so go for low-fat varieties like cottage cheese or mozzarella. in small to ' +
        'moderate quantities. As long as your dog isn’t lactose intolerant, which is rare but still ' +
        'possible in canines, cheese can be a great treat.';
      let senderId = '123';
      let data = { Item:
      { food: { S: 'cheese' },
        body: { S: text },
        answer: { BOOL: true },
        structured_answer: { BOOL: false } }
      };
      messenger.replyAboutFood(data, senderId);
      expect(spy).to.have.been.called.exactly(6);
    });
  });

  describe('parser', () => {
    describe('getObject', () => {
      it('should return a normalized object when a string is simple', () => {
        expect(parser.getObject('can my dog eat bananas?')).to.equal('banana');
        expect(parser.getObject('Can my dog eat a banana?')).to.equal('banana');
        expect(parser.getObject('is it ok if my dog eats bananas')).to.equal('banana');
      });
    });
    describe('isWellFormedQuestion', () => {
      it('should return true when string is a question', () => {
        expect(parser.isWellFormedQuestion('can my dog eat bananas?')).to.be.true;
      });
      it('should return false when string is not a question', () => {
        expect(parser.isWellFormedQuestion('hello!')).to.be.false;
      });
    })
  });
});