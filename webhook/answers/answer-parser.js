'use strict';
let env = require('node-env-file');
env('../prod.env');
let AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: process.env.AWS_LAMBDA_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_LAMBDA_SECRET_ACCESS_KEY,
  region: 'us-west-2'
});
let db  = new AWS.DynamoDB();

let nlp = require('nlp_compromise');
let fs = require('fs');
let filePath = process.argv[2];
let array = fs.readFileSync(filePath).toString().split('\n');
let parserRegex = /^(.+?) – (Yes\.|No\.)\s(.*)+/;

array.forEach((line) => {
  let matches = undefined;
  if (matches = line.match(parserRegex)) {
    let food = nlp.noun(matches[1]).singularize();
    let answer = !!matches[2].match(/yes/i);
    let body = matches[3];

    let params = {TableName: 'foods_for_dogs', Item: {
      food: {'S': food},
      answer: {'BOOL': answer},
      structured_answer: {'BOOL': false},
      body: {'S': body}
      //url: {'S': 'http://www.akc.org/learn/dog-health/what-to-do-if-your-dog-ate-chocolate/'}
    }};
    db.putItem(params, function (err, data){
      if (err) console.log(err, err.stack);
      else console.log(data);
    });
  }
});
