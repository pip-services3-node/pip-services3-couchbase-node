let process = require('process');

import { ConfigParams } from 'pip-services3-commons-node';
import { DummyPersistenceFixture } from '../fixtures/DummyPersistenceFixture';
import { DummyCouchbasePersistence } from './DummyCouchbasePersistence';

suite('DummyCouchbasePersistence', ()=> {
    let persistence: DummyCouchbasePersistence;
    let fixture: DummyPersistenceFixture;

    let couchbaseUri = process.env['COUCHBASE_URI'];
    let couchbaseHost = process.env['COUCHBASE_HOST'] || 'localhost';
    let couchbasePort = process.env['COUCHBASE_PORT'] || 8091;
    let couchbaseUser = process.env['COUCHBASE_USER'] || 'Administrator';
    let couchbasePass = process.env['COUCHBASE_PASS'] || 'password';
    if (couchbaseUri == null && couchbaseHost == null)
        return;

    setup((done) => {
        let dbConfig = ConfigParams.fromTuples(
            'options.auto_create', true,
            'connection.uri', couchbaseUri,
            'connection.host', couchbaseHost,
            'connection.port', couchbasePort,
            'connection.operation_timeout', 2,
            // 'connection.durability_interval', 0.0001,
            // 'connection.durabilty_timeout', 4,
            'connection.detailed_errcodes', 1,
            'credential.username', couchbaseUser,
            'credential.password', couchbasePass
        );

        persistence = new DummyCouchbasePersistence();
        persistence.configure(dbConfig);

        fixture = new DummyPersistenceFixture(persistence);

        persistence.open(null, (err: any) => {
            if (err) {
                done(err);
                return;
            }
            persistence.clear(null, (err) => {
                done(err);
            });
        });
    });

    teardown((done) => {
        persistence.close(null, done);
    });

    test('Crud Operations', (done) => {
        fixture.testCrudOperations(done);
    });

    test('Batch Operations', (done) => {
        fixture.testBatchOperations(done);
    });
});