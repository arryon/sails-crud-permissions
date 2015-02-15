"use strict";
var _ = require('lodash');

var users = {
  {
    id: '1',
    name: 'Lonely User',
    username:'lonely',
    associations: {
      groups: {},
      roles: {}
    }
  }
};

function find (where) {
  return _.where(users, where);
}

function findOne (where) {
  return _.where(users, where)[0];
}

module.exports = {
  find: find,
  findOne: findOne
};
