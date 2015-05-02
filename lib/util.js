"use strict";
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

function strToBin (str) {
  var result = 0;
  _.each(str, function (char) {
    if (_.has(crud, char)) {
      result = result | crud[char];
    }
  });
  return result;
}

function binToBool(bin) {
  sails.log.info(bin);
  var result = []; //[C,R,U,D]
  for (var i = 0; i < Object.keys(crud).length; i++) {
    sails.log.info(bin & (1<<i));
    if (bin & (1<<i)) {
      result.unshift(1);
    }
    else{
      result.unshift(0);
    }
  }
  sails.log.info(result);
  return result;
}

/**
 * Transform all string values in a grant to their binary counterpart
 */
function transformGrantToBinary (grant) {
  _.each(Object.keys(grant), function (key) {
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
        grant[key] = transformGrantToBinary(grant[key]);
      }
    }
  });
  return grant;
}

function mergeObjects (first, second) {
  //recursion stop criterion: we get a number as first and an object as second
  if (_.isNumber(first) && _.isObject(second)) {
    _.each(Object.keys(second), function (key) {
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
  if (!_.isEmpty(common)) {
    _.each(common, function (key) {
      var valfirst = first[key],
          valsecond = second[key];

      // if any of the two is a string permission, convert it to binary
      if (_.isString(valfirst)) {
        valfirst = strToBin(valfirst);
      }
      if (_.isString(valsecond)) {
        valsecond = strToBin(valsecond);
      }

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
  }
  if (!_.isEmpty(difference)) {
    //take the not common keys as is
    _.each(difference, function (key) {
      grant[key] = first[key] || second[key];
    });
  }
  return grant;
}

function mergeGrants (permissions, sails) {
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

function isAdmin (grant, sails) {
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

/**
 * Check if a user has this role
 */
function is (req, rolename, sails) {
  if (isAdmin(req.session.permission, sails)) {
    return true;
  }
  return _.contains(req.session.roles, rolename);
}

/**
 * Check if a user has at least the rights of this role
 */
function has(req, rolename, sails) {
  if (isAdmin(req.session.permission, sails)) {
    return true;
  }
  else {
    var role = _.find(sails.config.permissions, {name: rolename});
    var rolegrant = role.grant;
    //log a warning if searching for undefined role name
    if (rolegrant === undefined) {
      sails.log.warn('Searching for undefined role name: ' + rolename);
      return false;
    }
    // take the grant of the role, the user's permissions, and check if the asked
    // rolename's grant is encompassed in the user's permissions
    var usergrant = req.session.permission;

    sails.log.info(rolegrant);
    sails.log.info(usergrant);
    //for all keys in rolegrant, check if the perm is embedded in the user's perm
    return _.all(Object.keys(rolegrant), function (key) {
      if (usergrant[key] === undefined) {
        return false;
      }
      //make bool arrays of both keys
      var rolebool = binToBool(rolegrant[key]);
      var userbool = binToBool(usergrant[key]);
      sails.log.info(key, rolebool, userbool);
      // if the userbool has 1's at least on the positions where the rolebool
      // also has them, the user has at least the same rights
      return userbool >= rolebool;
    });
  }
}

module.exports = {
    is: is,
    has: has,
    actionsMap: actionsMap,
    crud: crud,
    transformObject: transformGrantToBinary,
    mergeGrants: mergeGrants,
    mergeObjects: mergeObjects,
    isAdmin: isAdmin
};
