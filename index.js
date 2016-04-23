require('dotenv').config();
var sendgrid = require("sendgrid")(process.env.SEND_GRID_API_KEY);
var express = require('express');
var validator = require('validator');
var app = express();
var bodyParser = require('body-parser');
var stringify = require('stringify');
var fetch = require('node-fetch');
var ejs = require('ejs');

//constant ENV Variables
var CONTACT_EMAIL = process.env.CONTACT_EMAIL;
var ADMIN_EMAIL = process.env.ADMIN_EMAIL;
var CLIENT_URL = process.env.CLIENT_URL;
 
stringify.registerWithRequire({
  extensions: ['.txt', '.html'],
  minify: true,
  minifyAppliesTo: {
    includeExtensions: ['.html']
  },
  minifyOptions: {
    // html-minifier options 
  }
});

//middleware
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
// Add headers
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', CLIENT_URL);
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});

//contact-us
app.post('/contact-us', function (req, res) {
  if(req.body.email && req.body.name && req.body.message && validator.isEmail(req.body.email)) {
    sendContactFormSuccessToRecipient(req.body);
    sendContactFormSuccessToAdmin(req.body);
    res.send({success: true});
  } else {
    res.send({error: 'form not completed'})
  }
});

//subscribe
app.post('/subscribe', function (req, res) {
  if(req.body.email && req.body.first_name && req.body.last_name){
    sendGridAddContact(req, function(results){
      sendGridAddContactToList(results.persisted_recipients[0], function(results) {
        if(results === 201) {
          res.send({success: true})
        } else {
          res.send({error: 'Problems adding to Subscriber List!'})
        }
      })
    })
  } else {
    res.send({error: 'All fields Required!'})
  }
});

//Send user info to SendGrid to create contact
function sendGridAddContact(req, callback) {
  fetch('https://api.sendgrid.com/v3/contactdb/recipients', { 
    headers: {
      'Authorization': 'Bearer ' + process.env.SEND_GRID_API_KEY
    },
    method: 'POST',
    body: JSON.stringify([{
      email: req.body.email,
      first_name: req.body.first_name,
      last_name: req.body.last_name
    }])
  })
  .then(function(results){
    return results.json();
  })
  .then(function(json) {
    return callback(json);
  });
}

//Add contact to SendGrid Subscriber List
function sendGridAddContactToList(contact, callback) {
  fetch('https://api.sendgrid.com/v3/contactdb/lists/279392/recipients/' + contact, { 
    headers: {
      'Authorization': 'Bearer ' + process.env.SEND_GRID_API_KEY
    },
    method: 'POST',
    body: ''
  })
  .then(function(results){
    callback(results.status);
  })
}

//Send success email to recipient
function sendContactFormSuccessToRecipient(params) {
  var email = new sendgrid.Email();
  email.addTo(params.email);
  email.setFrom(CONTACT_EMAIL);
  email.setSubject("Thanks for Contacting Us!");
  email.setHtml(ejs.render(require('./contact_templates/recipient.html'), {params: params}));
  sendgrid.send(email);
}

//Send contact form info to admin
function sendContactFormSuccessToAdmin(params) {
  var email = new sendgrid.Email();
  email.addTo(ADMIN_EMAIL);
  email.setFrom(CONTACT_EMAIL);
  email.setSubject(`New Contact Email From ${params.name} (${params.email})`);
  email.setHtml(ejs.render(require('./contact_templates/admin.html'), {params: params}));
  sendgrid.send(email);
}

//listen on port 9999
app.listen(9999, function () {
  console.log('Starting on port 9999');
});




