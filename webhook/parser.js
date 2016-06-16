'use strict';
const nlp = require('nlp_compromise');

const getObject = (str) => {
  let terms = nlp.text(str).terms();
  return terms[terms.length - 1].root();
};

module.exports = {
  getObject: getObject
};