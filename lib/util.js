"use strict";
/*global sails*/
var _ = require('lodash');

var crud = {
  'R': 1,
  'U': 2,
  'C': 4,
  'D': 8
};

var actionsMap = {
  find: crud.R,
  findOne: crud.R,
  create: crud.C,
  update: crud.U,
  upload: crud.C,
  destroy: crud.D,
  populate: crud.R,
  add: crud.U,
  remove: crud.D
};
function transformObject (grant) {
  _(Object.keys(grant)).each(function (key) {
    if (grant[key] === '*') {
      grant[key] = crud.R + crud.C + crud.U + crud.D;
      return;
    }
    else {
      if (_.isString(grant[key])) {
        grant[key] = _.reduce(_.rest(grant[key].split('')), function (sum, char) {
          return sum + crud[char];
        }, crud[grant[key][0]]);
      }
      else {
        grant[key] = transformObject(grant[key]);
      }
    }
  });
  return grant;
}

function mergeObjects (first, second) {
  //recursion stop criterion: we get a number as first and an object as second
  if (_.isNumber(first) && _.isObject(second)) {
    _(Object.keys(second)).each(function (key) {
      second[key] = first | second[key];
    });
    return second;
  }
  //recursion step
  var firstkeys = Object.keys(first),
      secondkeys = Object.keys(second),
      common = _.intersection(firstkeys, secondkeys),
      difference = _.union(_.difference(firstkeys, secondkeys), _.difference(secondkeys, firstkeys)),
      grant = {};

  //merge the common keys based on CRUD
  _(common).each(function (key) {
    var valfirst = first[key],
        valsecond = second[key];

    // if both values are binary permissions, we can bitwise-or them
    if (_.isNumber(valfirst) && _.isNumber(valsecond)) {
      grant[key] = valfirst | valsecond;
    }
    // if one is a binary permission and the other an object,
    // we bitwise-or every object key
    else if (_.isNumber(valfirst) && _.isObject(valsecond)) {
      grant[key] = mergeObjects(valfirst, valsecond);
    }
    else if (_.isObject(valfirst) && _.isNumber(valsecond)) {
      grant[key] = mergeObjects(valsecond, valfirst);
    }

    // if both are objects, call own function recursively
    else if (_.isObject(valfirst) && _.isObject(valsecond)) {
      grant[key] = mergeObjects(valfirst, valsecond);
    }
  });
  //take the not common keys as is
  _(difference).each(function (key) {
    grant[key] = first[key] || second[key];
  });

  return grant;
}

function mergeGrants (permissions) {
  sails.log.debug(permissions);
  var grant = {};
  //before the merging, replace wildcard key with all models
  _.each(permissions, function (permission) {
    if (permission.grant && '*' in permission.grant) {
      _.each(Object.keys(sails.models), function (model) {
        permission.grant[model] = permission.grant['*'];
      });
      delete permission.grant['*'];
    }
  });

  if (permissions.length === 1) {
    return permissions[0].grant;
  }
  var merged;
  //iterate over entries
  for (var idx = 0; idx < permissions.length; idx += 2) {
    var first = permissions[idx];

    // there is a next permission in the array
    if (idx < permissions.length - 1) {
        var second = permissions[idx + 1];
        merged = mergeObjects(first.grant, second.grant);
    }
    else {
        merged = first.grant;
    }
    //second, merge the merged with the existing grant
    grant = mergeObjects(grant, merged);
  }
  //now here we should have a composite grant
  return grant;
}

function isAdmin (grant) {
  var grantkeys = Object.keys(grant),
      sailskeys = Object.keys(sails.models),
      samelength = _.intersection(grantkeys, sailskeys).length === Object.keys(sails.models).length,
      allCRUD = _.filter(grantkeys, function (key) {
        return grant[key] === crud.R + crud.C + crud.U + crud.D;
      }).length === Object.keys(grant).length;

  if (samelength && allCRUD) {
    return true;
  }
  else {
    return false;
  }
}

module.exports = {
    actionsMap: actionsMap,
    crud: crud,
    transformObject: transformObject,
    mergeGrants: mergeGrants,
    mergeObjects: mergeObjects,
    isAdmin: isAdmin
};
