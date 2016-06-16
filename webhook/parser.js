'use strict';
const nlp = require('nlp_compromise');

const getObject = (str) => {
  let terms = nlp.text(str).terms();
  return terms[terms.length - 1].root();
};

const isWellFormedQuestion = (str) => {
  return nlp.sentence(str).sentence_type() === 'interrogative';
};

module.exports = {
  getObject: getObject,
  isWellFormedQuestion: isWellFormedQuestion
};