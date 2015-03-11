"use strict";
/*global User, Group, Role*/
var _ = require('lodash');
var util = require('./util');


function permits (req, compositeGrant) {
  var model = req.options.model,
      flag = util.actionsMap[req.options.action];

  //invalid if the action from the request is unknown (internal safeguard)
  if (flag === undefined) {
    throw new Error('Undefined action: ' + req.options.action);
  }
  // also invalid if the model is not in our permissions
  else if (!(model in compositeGrant)) {
    throw new Error('No permissions on model ' + model);
  }
  // if we don't have permission on any of the model attributes in the request, also invalid
  // TODO: make this work
  /*else if (_.isObject(compositeGrant[model])) {

  }*/
  // also invalid if the action is not in our permission flags
  else if (_.isNumber(compositeGrant[model]) && !(compositeGrant[model] & flag)){
    throw new Error('No permission to perform action on model ' + model);
  }
  else {
    return Promise.resolve(compositeGrant);
  }
}

function authorized (req, permissions) {
  if (permissions.length === 0) {
    throw new Error('No permissions');
  }
  /**
   * Merge the grants of all permissions to create a 'super grant', a composite
   * made out of the merged grants of our permissions
   */
  var compositeGrant = util.mergeGrants(permissions);
  if (permits(req, compositeGrant)) {
    return compositeGrant;
  }
}

function findPermissions (userId) {
  return User.findOne({id: userId})
  .populateAll()
  .then(function (user) {
    //fetch two arrays of id's, both belonging to roles, from the user's roles
    //and the user's group's roles
    return Promise.all([
      Promise.resolve(_.pluck(user.associations.roles.value, 'id')),
      Group.find({id: _.pluck(user.associations.groups.value, 'id')})
      .populateAll()
      .then(function (groups) {
        return _.flatten(_.map(groups, function (group) {
          return _.pluck(group.associations.roles.value, 'id');
        }));
      })
    ]);
  })
  //we retrieve two lists of role id's, flatten them, and look up the Permissions
  .then(function (id_lists) {
    var roleIds = _.flatten(id_lists);
    return Role.find({id: roleIds}).populate('permissions');
  })
  .then(function (roles) {
    var permissions = _.flatten(_.map(roles, function (role) {
      return role.associations.permissions.value;
    }));
    return permissions;
  });
}

function validateGrant (grant, sails) {
  /**
   * For a grant to be valid it needs to have at least one key and be an object
   */
  if (!_.isObject(grant)) {
    throw new Error('Grant must be an object with model names as keys or a wildcard key');
  }
  if (Object.keys(grant).length === 0) {
    throw new Error('Grant has no keys');
  }
  /**
   * Process each key of the grant, if an error is thrown the process is canceled
   * and the grant is invalid
   */
  _.each(Object.keys(grant), function (key) {
    // non-wildcard keys or keys not in sails.models are invalid
    if (!(key in sails.models) && key !== '*') {
      throw new Error('Model doesn\'t exist and is not wildcard');
    }
    // key value must be string or object
    if (!_.isString(grant[key]) && !_.isObject(grant[key])) {
      throw new Error('Grant object must be string literal or object with model attributes as keys');
    }
    // in the case of wildcard, the value can only be a string
    if (key === '*' && !_.isString(grant[key])) {
      throw new Error('Wildcard grant can have only a string as value');
    }
    // if grant is string, must a wildcard or be one of CRUD combinations
    if (_.isString(grant[key]) && grant[key] !== '*') {
      var flags = _.map(grant[key].split(''), function (char){ return util.crud[char]; });
      if (flags.length !== grant[key].length) {
        throw new Error('Value of grant key ' + key + ' is neither wildcard nor variant of CRUD');
      }
    }
    /**
     * Attributes not in the model definition are invalid
     * This is done by checking the intersection of model attributes and object values from grant[key].
     * If the object values are all in the model attributes, the intersection will contain
     * as many keys as there are attributes in grant[key]
     */
    else if (
        _.isObject(grant[key]) &&
        (_.intersection(Object.keys(sails.models[key].definition), Object.keys(grant[key])).length < Object.keys(grant[key]).length)
    ) {
      throw new Error('Not all attributes from ' + key + ' in grant are known');
    }

    //valid at this point
    return key;
  });

  // at this point all keys are valid
  // we transform the CRUD values into bit flags
  grant = util.transformObject(grant);
  return grant;
}

module.exports = {
  authorized: authorized,
  validateGrant: validateGrant,
  findPermissions: findPermissions,
  permits: permits,
  getComposite: util.mergeGrants,
  isAdmin: util.isAdmin,
  transformObject: util.transformObject
};
