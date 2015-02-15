var assert = require('assert');
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
