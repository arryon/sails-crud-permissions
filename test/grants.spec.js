var assert = require('assert');
var Sails = require('sails').Sails;
var _ = require('lodash');
var ps = require('./../lib');
var grants = require('./helpers/grants');
var fs = require('fs');
var path = require('path');

/*global describe, it, before, after*/
describe('Merging grants ::', function () {
  //app wrapper
  var sails;
  before(function (done) {
    //10 sec timeout
    this.timeout(10000);
    //link node modules to the app dir
    try {
      fs.symlinkSync(path.join(__dirname, '../node_modules'), path.join(__dirname, 'helpers/sampleApp/node_modules'), 'file');
    } catch (e1) {
      if (e1.code !== 'EEXIST') {
        throw e1;
      }
    }

    //Try to lift
    new Sails().load({
      appPath: path.join(__dirname, 'helpers/sampleApp'),
      hooks: {
        'grunt': false,
        'views': false,
      },
      log: {
        level: 'info'
      },
      connections: {
        test: {
          adapter: 'sails-mongo',
          host:'localhost',
          port: 27017,
          database: 'sails-crud-permissions-testdb'
        },
      },
      models: {
        connection: 'test',
        migrate: 'drop'
      }
    }, function (err, _sails) {
      if (err) { return done(err); }
      sails = _sails;
      return done();
    });
  });

  after(function (done) {
    //unlink the node_modules symlink
    try {
      fs.unlinkSync(path.join(__dirname, 'helpers/sampleApp/node_modules'));
    } catch (e0) {
      if (e0.code !== 'EEXIST') {
        throw e0;
      }
    }
    if (sails) {
      return sails.lower(done);
    }
    //otherwise, just done
    return done();
  });


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

  it('should yield the editor grant when mergin editor with user', function () {
    var user = {grant: ps.transformObject(grants.user)};
    var editor = {grant: ps.transformObject(grants.editor)};
    ps.getComposite([user, editor]).should.eql(editor.grant);
  });
});
