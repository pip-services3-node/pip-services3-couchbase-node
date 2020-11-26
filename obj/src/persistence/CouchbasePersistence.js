"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouchbasePersistence = void 0;
/** @module persistence */
/** @hidden */
let _ = require('lodash');
/** @hidden */
let async = require('async');
const pip_services3_commons_node_1 = require("pip-services3-commons-node");
const pip_services3_commons_node_2 = require("pip-services3-commons-node");
const pip_services3_commons_node_3 = require("pip-services3-commons-node");
const pip_services3_commons_node_4 = require("pip-services3-commons-node");
const pip_services3_components_node_1 = require("pip-services3-components-node");
const pip_services3_commons_node_5 = require("pip-services3-commons-node");
const pip_services3_commons_node_6 = require("pip-services3-commons-node");
const pip_services3_commons_node_7 = require("pip-services3-commons-node");
const CouchbaseConnection_1 = require("./CouchbaseConnection");
/**
 * Abstract persistence component that stores data in Couchbase
 * and is based using Couchbaseose object relational mapping.
 *
 * This is the most basic persistence component that is only
 * able to store data items of any type. Specific CRUD operations
 * over the data items must be implemented in child classes by
 * accessing <code>this._collection</code> or <code>this._model</code> properties.
 *
 * ### Configuration parameters ###
 *
 * - bucket:                      (optional) Couchbase bucket name
 * - connection(s):
 *   - discovery_key:             (optional) a key to retrieve the connection from [[https://pip-services3-node.github.io/pip-services3-components-node/interfaces/connect.idiscovery.html IDiscovery]]
 *   - host:                      host name or IP address
 *   - port:                      port number (default: 27017)
 *   - uri:                       resource URI or connection string with all parameters in it
 * - credential(s):
 *   - store_key:                 (optional) a key to retrieve the credentials from [[https://pip-services3-node.github.io/pip-services3-components-node/interfaces/auth.icredentialstore.html ICredentialStore]]
 *   - username:                  (optional) user name
 *   - password:                  (optional) user password
 * - options:
 *   - auto_create:               (optional) automatically create missing bucket (default: false)
 *   - auto_index:                (optional) automatically create primary index (default: false)
 *   - flush_enabled:             (optional) bucket flush enabled (default: false)
 *   - bucket_type:               (optional) bucket type (default: couchbase)
 *   - ram_quota:                 (optional) RAM quota in MB (default: 100)
 *
 * ### References ###
 *
 * - <code>\*:logger:\*:\*:1.0</code>           (optional) [[https://pip-services3-node.github.io/pip-services3-components-node/interfaces/log.ilogger.html ILogger]] components to pass log messages
 * - <code>\*:discovery:\*:\*:1.0</code>        (optional) [[https://pip-services3-node.github.io/pip-services3-components-node/interfaces/connect.idiscovery.html IDiscovery]] services
 * - <code>\*:credential-store:\*:\*:1.0</code> (optional) Credential stores to resolve credentials
 *
 * ### Example ###
 *
 *     class MyCouchbasePersistence extends CouchbasePersistence<MyData> {
 *
 *       public constructor() {
 *           base("mydata", "mycollection", new MyDataCouchbaseSchema());
 *     }
 *
 *     public getByName(correlationId: string, name: string, callback: (err, item) => void): void {
 *         let criteria = { name: name };
 *         this._model.findOne(criteria, callback);
 *     });
 *
 *     public set(correlatonId: string, item: MyData, callback: (err) => void): void {
 *         let criteria = { name: item.name };
 *         let options = { upsert: true, new: true };
 *         this._model.findOneAndUpdate(criteria, item, options, callback);
 *     }
 *
 *     }
 *
 *     let persistence = new MyCouchbasePersistence();
 *     persistence.configure(ConfigParams.fromTuples(
 *         "host", "localhost",
 *         "port", 27017
 *     ));
 *
 *     persitence.open("123", (err) => {
 *          ...
 *     });
 *
 *     persistence.set("123", { name: "ABC" }, (err) => {
 *         persistence.getByName("123", "ABC", (err, item) => {
 *             console.log(item);                   // Result: { name: "ABC" }
 *         });
 *     });
 */
class CouchbasePersistence {
    /**
     * Creates a new instance of the persistence component.
     *
     * @param bucket    (optional) a bucket name.
     * @param collection    (optional) a collection name.
     */
    constructor(bucket, collection) {
        this._maxPageSize = 100;
        /**
         * The dependency resolver.
         */
        this._dependencyResolver = new pip_services3_commons_node_5.DependencyResolver(CouchbasePersistence._defaultConfig);
        /**
         * The logger.
         */
        this._logger = new pip_services3_components_node_1.CompositeLogger();
        /**
         * The configuration options.
         */
        this._options = new pip_services3_commons_node_2.ConfigParams();
        this._bucketName = bucket;
        this._collectionName = collection;
    }
    /**
     * Configures component by passing configuration parameters.
     *
     * @param config    configuration parameters to be set.
     */
    configure(config) {
        config = config.setDefaults(CouchbasePersistence._defaultConfig);
        this._config = config;
        this._dependencyResolver.configure(config);
        this._bucketName = config.getAsStringWithDefault('bucket', this._bucketName);
        this._options = this._options.override(config.getSection("options"));
    }
    /**
     * Sets references to dependent components.
     *
     * @param references 	references to locate the component dependencies.
     */
    setReferences(references) {
        this._references = references;
        this._logger.setReferences(references);
        // Get connection
        this._dependencyResolver.setReferences(references);
        this._connection = this._dependencyResolver.getOneOptional('connection');
        // Or create a local one
        if (this._connection == null) {
            this._connection = this.createConnection();
            this._localConnection = true;
        }
        else {
            this._localConnection = false;
        }
    }
    /**
     * Unsets (clears) previously set references to dependent components.
     */
    unsetReferences() {
        this._connection = null;
    }
    createConnection() {
        let connection = new CouchbaseConnection_1.CouchbaseConnection(this._bucketName);
        if (this._config)
            connection.configure(this._config);
        if (this._references)
            connection.setReferences(this._references);
        return connection;
    }
    /**
     * Converts object value from internal to public format.
     *
     * @param value     an object in internal format to convert.
     * @returns converted object in public format.
     */
    convertToPublic(value) {
        if (value && value.toJSON)
            value = value.toJSON();
        return value;
    }
    /**
     * Convert object value from public to internal format.
     *
     * @param value     an object in public format to convert.
     * @returns converted object in internal format.
     */
    convertFromPublic(value) {
        return value;
    }
    /**
     * Checks if the component is opened.
     *
     * @returns true if the component has been opened and false otherwise.
     */
    isOpen() {
        return this._opened;
    }
    /**
     * Opens the component.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    open(correlationId, callback) {
        if (this._opened) {
            callback(null);
            return;
        }
        if (this._connection == null) {
            this._connection = this.createConnection();
            this._localConnection = true;
        }
        let openCurl = (err) => {
            if (err == null && this._connection == null) {
                err = new pip_services3_commons_node_4.InvalidStateException(correlationId, 'NO_CONNECTION', 'Couchbase connection is missing');
            }
            if (err == null && !this._connection.isOpen()) {
                err = new pip_services3_commons_node_3.ConnectionException(correlationId, "CONNECT_FAILED", "Couchbase connection is not opened");
            }
            this._opened = false;
            if (err) {
                if (callback)
                    callback(err);
            }
            else {
                this._cluster = this._connection.getConnection();
                this._bucket = this._connection.getBucket();
                this._bucketName = this._connection.getBucketName();
                let couchbase = require('couchbase');
                this._query = couchbase.N1qlQuery;
                if (callback)
                    callback(null);
            }
        };
        if (this._localConnection) {
            this._connection.open(correlationId, openCurl);
        }
        else {
            openCurl(null);
        }
    }
    /**
     * Closes component and frees used resources.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    close(correlationId, callback) {
        if (!this._opened) {
            callback(null);
            return;
        }
        if (this._connection == null) {
            callback(new pip_services3_commons_node_4.InvalidStateException(correlationId, 'NO_CONNECTION', 'MongoDb connection is missing'));
            return;
        }
        let closeCurl = (err) => {
            this._opened = false;
            this._cluster = null;
            this._bucket = null;
            this._query = null;
            if (callback)
                callback(err);
        };
        if (this._localConnection) {
            this._connection.close(correlationId, closeCurl);
        }
        else {
            closeCurl(null);
        }
    }
    /**
     * Clears component state.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    clear(correlationId, callback) {
        // Return error if collection is not set
        if (this._bucketName == null) {
            if (callback)
                callback(new Error('Bucket name is not defined'));
            return;
        }
        this._bucket.manager().flush((err) => {
            if (err) {
                err = new pip_services3_commons_node_3.ConnectionException(correlationId, "FLUSH_FAILED", "Couchbase bucket flush failed")
                    .withCause(err);
            }
            if (callback)
                callback(err);
        });
    }
    /**
     * Gets a page of data items retrieved by a given filter and sorted according to sort parameters.
     *
     * This method shall be called by a public getPageByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter query string after WHERE clause
     * @param paging            (optional) paging parameters
     * @param sort              (optional) sorting string after ORDER BY clause
     * @param select            (optional) projection string after SELECT clause
     * @param callback          callback function that receives a data page or error.
     */
    getPageByFilter(correlationId, filter, paging, sort, select, callback) {
        select = select && !_.isEmpty(select) ? select : "*";
        let statement = "SELECT " + select + " FROM `" + this._bucketName + "`";
        // Adjust max item count based on configuration
        paging = paging || new pip_services3_commons_node_6.PagingParams();
        let skip = paging.getSkip(-1);
        let take = paging.getTake(this._maxPageSize);
        let pagingEnabled = paging.total;
        let collectionFilter = "_c='" + this._collectionName + "'";
        if (filter && !_.isEmpty(filter))
            filter = collectionFilter + " AND " + filter;
        else
            filter = collectionFilter;
        statement += " WHERE " + filter;
        if (sort && !_.isEmpty(sort))
            statement += " ORDER BY " + sort;
        if (skip >= 0)
            statement += " OFFSET " + skip;
        statement += " LIMIT " + take;
        let query = this._query.fromString(statement);
        // Todo: Make it configurable?
        query.consistency(this._query.Consistency.STATEMENT_PLUS);
        this._bucket.query(query, [], (err, items) => {
            if (err) {
                callback(err, null);
                return;
            }
            if (items != null)
                this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._bucketName);
            items = _.map(items, item => select == "*" ? item[this._bucketName] : item);
            items = _.map(items, this.convertToPublic);
            items = _.filter(items, item => item != null);
            if (pagingEnabled) {
                statement = "SELECT COUNT(*) FROM `" + this._bucketName + "`";
                if (filter && !_.isEmpty(filter))
                    statement += " WHERE " + filter;
                query = this._query.fromString(statement);
                this._bucket.query(query, [], (err, counts) => {
                    if (err) {
                        callback(err, null);
                        return;
                    }
                    let count = counts ? counts[0]['$1'] : 0;
                    let page = new pip_services3_commons_node_7.DataPage(items, count);
                    callback(null, page);
                });
            }
            else {
                let page = new pip_services3_commons_node_7.DataPage(items);
                callback(null, page);
            }
        });
    }
    /**
     * Gets a number of data items retrieved by a given filter.
     *
     * This method shall be called by a public getCountByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter query string after WHERE clause
     * @param callback          callback function that receives a data page or error.
     */
    getCountByFilter(correlationId, filter, callback) {
        let collectionFilter = "_c='" + this._collectionName + "'";
        if (filter && !_.isEmpty(filter))
            filter = collectionFilter + " AND " + filter;
        else
            filter = collectionFilter;
        let statement = "SELECT COUNT(*) FROM `" + this._bucketName + "`";
        if (filter && !_.isEmpty(filter))
            statement += " WHERE " + filter;
        let query = this._query.fromString(statement);
        this._bucket.query(query, [], (err, counts) => {
            if (err) {
                callback(err, null);
                return;
            }
            let count = counts ? counts[0]['$1'] : 0;
            if (count != null)
                this._logger.trace(correlationId, "Counted %d items in %s", count, this._bucketName);
            callback(null, count);
        });
    }
    /**
     * Gets a list of data items retrieved by a given filter and sorted according to sort parameters.
     *
     * This method shall be called by a public getListByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     *
     * @param correlationId    (optional) transaction id to trace execution through call chain.
     * @param filter           (optional) a filter JSON object
     * @param paging           (optional) paging parameters
     * @param sort             (optional) sorting JSON object
     * @param select           (optional) projection JSON object
     * @param callback         callback function that receives a data list or error.
     */
    getListByFilter(correlationId, filter, sort, select, callback) {
        select = select && !_.isEmpty(select) ? select : "*";
        let statement = "SELECT " + select + " FROM `" + this._bucketName + "`";
        // Adjust max item count based on configuration
        if (filter && !_.isEmpty(filter))
            statement += " WHERE " + filter;
        if (sort && !_.isEmpty(sort))
            statement += " ORDER BY " + sort;
        let query = this._query.fromString(statement);
        // Todo: Make it configurable?
        query.consistency(this._query.Consistency.REQUEST_PLUS);
        this._bucket.query(query, [], (err, items) => {
            if (err) {
                callback(err, null);
                return;
            }
            if (items != null)
                this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._bucketName);
            items = _.map(items, item => select == "*" ? item[this._bucketName] : item);
            items = _.map(items, this.convertToPublic);
            items = _.filter(items, item => item != null);
            callback(null, items);
        });
    }
    /**
    * Gets a random item from items that match to a given filter.
    *
    * This method shall be called by a public getOneRandom method from child class that
    * receives FilterParams and converts them into a filter function.
    *
    * @param correlationId     (optional) transaction id to trace execution through call chain.
    * @param filter            (optional) a filter JSON object
    * @param callback          callback function that receives a random item or error.
    */
    getOneRandom(correlationId, filter, callback) {
        let statement = "SELECT COUNT(*) FROM `" + this._bucketName + "`";
        // Adjust max item count based on configuration
        if (filter && !_.isEmpty(filter))
            statement += " WHERE " + filter;
        let query = this._query.fromString(statement);
        // Todo: Make it configurable?
        query.consistency(this._query.Consistency.REQUEST_PLUS);
        this._bucket.query(query, [], (err, counts) => {
            let count = counts != null ? counts[0] : 0;
            if (err || count == 0) {
                callback(err, null);
                return;
            }
            let statement = "SELECT COUNT(*) FROM `" + this._bucketName + "`";
            // Adjust max item count based on configuration
            if (filter && !_.isEmpty(filter))
                statement += " WHERE " + filter;
            let skip = Math.trunc(Math.random() * count);
            statement += " OFFSET " + skip + " LIMIT 1";
            let query = this._query.fromString(statement);
            this._bucket.query(query, [], (err, items) => {
                if (items != null && items.length > 0)
                    this._logger.trace(correlationId, "Retrieved random item from %s", this._bucketName);
                items = _.map(items, this.convertToPublic);
                callback(null, items[0]);
            });
        });
    }
    /**
    * Generates unique id for specific collection in the bucket
    * @param value a public unique id.
    * @returns a unique bucket id.
    */
    generateBucketId(value) {
        if (value == null)
            return null;
        return this._collectionName + value.toString();
    }
    /**
     * Creates a data item.
     *
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              an item to be created.
     * @param callback          (optional) callback function that receives created item or error.
     */
    create(correlationId, item, callback) {
        if (item == null) {
            callback(null, null);
            return;
        }
        // Assign unique id
        let newItem = _.clone(item);
        let id = newItem.id || pip_services3_commons_node_1.IdGenerator.nextLong();
        let objectId = this.generateBucketId(id);
        newItem = this.convertFromPublic(newItem);
        this._bucket.insert(objectId, newItem, (err, result) => {
            if (!err)
                this._logger.trace(correlationId, "Created in %s with id = %s", this._bucketName, id);
            newItem = err == null ? this.convertToPublic(newItem) : null;
            callback(err, newItem);
        });
    }
    /**
    * Deletes data items that match to a given filter.
    *
    * This method shall be called by a public deleteByFilter method from child class that
    * receives FilterParams and converts them into a filter function.
    *
    * @param correlationId     (optional) transaction id to trace execution through call chain.
    * @param filter            (optional) a filter JSON object.
    * @param callback          (optional) callback function that receives error or null for success.
    */
    deleteByFilter(correlationId, filter, callback) {
        let statement = "DELETE FROM `" + this._bucketName + "`";
        // Adjust max item count based on configuration
        if (filter && !_.isEmpty(filter))
            statement += " WHERE " + filter;
        let query = this._query.fromString(statement);
        this._bucket.query(query, [], (err, counts) => {
            if (!err) {
                let count = counts != null ? counts[0] : 0;
                this._logger.trace(correlationId, "Deleted %d items from %s", count, this._bucketName);
            }
            callback(err);
        });
    }
}
exports.CouchbasePersistence = CouchbasePersistence;
CouchbasePersistence._defaultConfig = pip_services3_commons_node_2.ConfigParams.fromTuples("bucket", null, "dependencies.connection", "*:connection:couchbase:*:1.0", 
// connections.*
// credential.*
"options.auto_create", false, "options.auto_index", true, "options.flush_enabled", true, "options.bucket_type", "couchbase", "options.ram_quota", 100);
//# sourceMappingURL=CouchbasePersistence.js.map