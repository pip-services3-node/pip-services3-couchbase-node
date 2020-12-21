var assert = require('chai').assert;
var async = require('async');

import { ConfigParams } from 'pip-services3-commons-node';
import { CouchbaseConnectionResolver } from '../../src/connect/CouchbaseConnectionResolver';

suite('CouchbaseConnectionResolver', ()=> {

    test('Single Connection', (done) => {
        let config = ConfigParams.fromTuples(
            "connection.host", "localhost",
            "connection.port", "8091",
            "connection.database", "test" 
        );

        let resolver = new CouchbaseConnectionResolver();
        resolver.configure(config);
        resolver.resolve(null, (err, connection) => {
            assert.isNotNull(connection);
            assert.equal("couchbase://localhost:8091/test", connection.uri);
            assert.isUndefined(connection.username);
            assert.isUndefined(connection.password);

            done(err);
        });
    });

    test('Multiple Connections', (done) => {
        let config = ConfigParams.fromTuples(
            "connections.1.host", "host1",
            "connections.1.port", "8091",
            "connections.1.database", "test" ,
            "connections.2.host", "host2",
            "connections.2.port", "8091",
            "connections.2.database", "test" 
        );

        let resolver = new CouchbaseConnectionResolver();
        resolver.configure(config);
        resolver.resolve(null, (err, connection) => {
            assert.isNotNull(connection);
            assert.equal("couchbase://host1:8091,host2:8091/test", connection.uri);
            assert.isUndefined(connection.username);
            assert.isUndefined(connection.password);

            done(err);
        });
    });

    test('Connection with Credentials', (done) => {
        let config = ConfigParams.fromTuples(
            "connection.host", "localhost",
            "connection.port", "8091",
            "connection.database", "test",
            "credential.username", "admin",
            "credential.password", "password123"
        );

        let resolver = new CouchbaseConnectionResolver();
        resolver.configure(config);
        resolver.resolve(null, (err, connection) => {
            assert.isNotNull(connection);
            assert.equal("couchbase://localhost:8091/test", connection.uri);
            assert.equal("admin", connection.username);
            assert.equal("password123", connection.password);

            done(err);
        });
    });

});