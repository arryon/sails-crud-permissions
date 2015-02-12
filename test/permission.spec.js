var assert = require('assert');
var sails = require('./sails');
var _ = require('lodash');
/*global describe, it*/
describe('Load permission service', function () {
  var ps = require('./../lib');

  it('should have an \'authorized\' method', function (done) {
    assert(_.has(ps, 'authorized'), "Permission service has no 'authorized' property");
    return done();
  });
  it('should have a \'validateGrant\' method', function (done) {
    assert(_.has(ps, 'validateGrant'), "Permission service has no 'validateGrant' property");
    return done();
  });
  it('should have a \'findPermissions\' method', function (done) {
    assert(_.has(ps, 'findPermissions'), "Permission service has no 'findPermissions' property");
    return done();
  });
  it('should have a \'permits\' method', function (done) {
    assert(_.has(ps, 'permits'), "Permission service has no 'permits' property");
    return done();
  });
  it('should have a \'getComposite\' method', function (done) {
    assert(_.has(ps, 'getComposite'), "Permission service has no 'getComposite' property");
    return done();
  });
  it('should have an \'isAdmin\' method', function (done) {
    assert(_.has(ps, 'isAdmin'), "Permission service has no 'isAdmin' property");
    return done();
  });
});

describe('Merging grants', function () {
  var ps = require('./../lib');
  var grants = require('./fixtures/grants');


  it('should be able to handle merging empty grants', function (done) {
    assert(_.isEmpty(ps.getComposite([{grant: {}},{grant: {}}], sails)));
    return done();
  });

  it('should be able to merge an admin grant with an empty grant', function (done) {
    assert(ps.getComposite([{grant: grants.admin}, {grant: {}}], sails));
    return done();
  });

  it('should yield an attribute for all models when using the admin grant', function (done) {
    var merged = ps.getComposite([{grant: grants.admin}, {grant: {}}], sails);
    var intersection = _.intersection(_.keys(merged), _.keys(sails.models));
    assert(intersection.length === _.keys(sails.models).length);
    return done();
  });
  it('should have \'*\' on every property when using the admin grant', function (done) {
    var merged = ps.getComposite([{grant: grants.admin}, {grant: {}}], sails);
    assert(_.every(_.keys(merged), function (key) {
      return merged[key] === '*';
    }));
    return done();
  });
});
