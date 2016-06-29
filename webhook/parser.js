'use strict';
const nlp = require('nlp_compromise');
const dogSpeakRegex = /(woof|bow(-| )?wow)/gi;

const getObject = (str) => {
  let terms = nlp.text(str).terms();
  return terms[terms.length - 1].root();
};

const isWellFormedQuestion = (str) => {
  return nlp.sentence(str).sentence_type() === 'interrogative';
};

const isDogSpeak = (str) => {
  return Boolean(str.match(dogSpeakRegex));
};

module.exports = {
  getObject: getObject,
  isWellFormedQuestion: isWellFormedQuestion,
  isDogSpeak: isDogSpeak
};