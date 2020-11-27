// let process = require('process');

// import { ConfigParams } from 'pip-services3-commons-node';
// import { References } from 'pip-services3-commons-node';
// import { Descriptor } from 'pip-services3-commons-node';
// import { DummyPersistenceFixture } from '../fixtures/DummyPersistenceFixture';
// import { DummyCouchbasePersistence } from './DummyCouchbasePersistence';
// import { CouchbaseConnection } from '../../src/persistence/CouchbaseConnection';

// suite('DummyCouchbaseConnection', ()=> {
//     let connection: CouchbaseConnection;
//     let persistence: DummyCouchbasePersistence;
//     let fixture: DummyPersistenceFixture;

//     let couchbaseUri = process.env['COUCHBASE_URI'];
//     let couchbaseHost = process.env['COUCHBASE_HOST'] || 'localhost';
//     let couchbasePort = process.env['COUCHBASE_PORT'] || 8091;
//     let couchbaseUser = process.env['COUCHBASE_USER'] || 'Administrator';
//     let couchbasePass = process.env['COUCHBASE_PASS'] || 'password';
//     if (couchbaseUri == null && couchbaseHost == null)
//         return;

//     setup((done) => {
//         let dbConfig = ConfigParams.fromTuples(
//             'bucket', 'test',
//             'options.auto_create', true,
//             'options.auto_index', true,
//             'connection.uri', couchbaseUri,
//             'connection.host', couchbaseHost,
//             'connection.port', couchbasePort,
//             'connection.operation_timeout', 2,
//             // 'connection.durability_interval', 0.0001,
//             // 'connection.durabilty_timeout', 4,
//             'connection.detailed_errcodes', 1,
//             'credential.username', couchbaseUser,
//             'credential.password', couchbasePass
//         );

//         connection = new CouchbaseConnection();
//         connection.configure(dbConfig);

//         persistence = new DummyCouchbasePersistence();
//         persistence.setReferences(References.fromTuples(
//             new Descriptor("pip-services", "connection", "couchbase", "default", "1.0"), connection
//         ));

//         fixture = new DummyPersistenceFixture(persistence);

//         connection.open(null, (err) => {
//             if (err) {
//                 done(err);
//                 return;
//             }
//             persistence.open(null, (err: any) => {
//                 if (err) {
//                     done(err);
//                     return;
//                 }
//                 persistence.clear(null, (err) => {
//                     done(err);
//                 });
//             });    
//         });
//     });

//     teardown((done) => {
//         persistence.close(null, (err) => {
//             connection.close(null, done);
//         });
//     });

//     test('Crud Operations', (done) => {
//         fixture.testCrudOperations(done);
//     });

//     test('Batch Operations', (done) => {
//         fixture.testBatchOperations(done);
//     });

//     test('Paging', (done) => {
//         fixture.testPaging(done);
//     });

// });