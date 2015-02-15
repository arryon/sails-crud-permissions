var assert = require('assert');
var sails = require('./sails');
var _ = require('lodash');
/*global describe, it*/
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
