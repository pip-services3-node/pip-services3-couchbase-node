"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @module persistence */
/** @hidden */
let _ = require('lodash');
/** @hidden */
let async = require('async');
const pip_services3_commons_node_1 = require("pip-services3-commons-node");
const pip_services3_commons_node_2 = require("pip-services3-commons-node");
const pip_services3_commons_node_3 = require("pip-services3-commons-node");
const CouchbasePersistence_1 = require("./CouchbasePersistence");
/**
 * Abstract persistence component that stores data in Couchbase
 * and implements a number of CRUD operations over data items with unique ids.
 * The data items must implement IIdentifiable interface.
 *
 * In basic scenarios child classes shall only override [[getPageByFilter]],
 * [[getListByFilter]] or [[deleteByFilter]] operations with specific filter function.
 * All other operations can be used out of the box.
 *
 * In complex scenarios child classes can implement additional operations by
 * accessing <code>this._collection</code> and <code>this._model</code> properties.

 * ### Configuration parameters ###
 *
 * - collection:                  (optional) Couchbase collection name
 * - connection(s):
 *   - discovery_key:             (optional) a key to retrieve the connection from [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/connect.idiscovery.html IDiscovery]]
 *   - host:                      host name or IP address
 *   - port:                      port number (default: 27017)
 *   - uri:                       resource URI or connection string with all parameters in it
 * - credential(s):
 *   - store_key:                 (optional) a key to retrieve the credentials from [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/auth.icredentialstore.html ICredentialStore]]
 *   - username:                  (optional) user name
 *   - password:                  (optional) user password
 * - options:
 *   - max_pool_size:             (optional) maximum connection pool size (default: 2)
 *   - keep_alive:                (optional) enable connection keep alive (default: true)
 *   - connect_timeout:           (optional) connection timeout in milliseconds (default: 5 sec)
 *   - auto_reconnect:            (optional) enable auto reconnection (default: true)
 *   - max_page_size:             (optional) maximum page size (default: 100)
 *   - debug:                     (optional) enable debug output (default: false).
 *
 * ### References ###
 *
 * - <code>\*:logger:\*:\*:1.0</code>           (optional) [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/log.ilogger.html ILogger]] components to pass log messages components to pass log messages
 * - <code>\*:discovery:\*:\*:1.0</code>        (optional) [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/connect.idiscovery.html IDiscovery]] services
 * - <code>\*:credential-store:\*:\*:1.0</code> (optional) Credential stores to resolve credentials
 *
 * ### Example ###
 *
 *     class MyCouchbasePersistence extends CouchbasePersistence<MyData, string> {
 *
 *     public constructor() {
 *         base("mydata", new MyDataCouchbaseSchema());
 *     }
 *
 *     private composeFilter(filter: FilterParams): any {
 *         filter = filter || new FilterParams();
 *         let criteria = [];
 *         let name = filter.getAsNullableString('name');
 *         if (name != null)
 *             criteria.push({ name: name });
 *         return criteria.length > 0 ? { $and: criteria } : null;
 *     }
 *
 *     public getPageByFilter(correlationId: string, filter: FilterParams, paging: PagingParams,
 *         callback: (err: any, page: DataPage<MyData>) => void): void {
 *         base.getPageByFilter(correlationId, this.composeFilter(filter), paging, null, null, callback);
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
 *         ...
 *     });
 *
 *     persistence.create("123", { id: "1", name: "ABC" }, (err, item) => {
 *         persistence.getPageByFilter(
 *             "123",
 *             FilterParams.fromTuples("name", "ABC"),
 *             null,
 *             (err, page) => {
 *                 console.log(page.data);          // Result: { id: "1", name: "ABC" }
 *
 *                 persistence.deleteById("123", "1", (err, item) => {
 *                    ...
 *                 });
 *             }
 *         )
 *     });
 */
class IdentifiableCouchbasePersistence extends CouchbasePersistence_1.CouchbasePersistence {
    /**
     * Creates a new instance of the persistence component.
     *
     * @param collection    (optional) a collection name.
     */
    constructor(collection) {
        super(collection);
        //TODO (note for SS): is this needed? It's in CouchbasePersistence as well...
        this._maxPageSize = 100;
        if (collection == null)
            throw new Error("Collection name could not be null");
    }
    /**
     * Configures component by passing configuration parameters.
     *
     * @param config    configuration parameters to be set.
     */
    configure(config) {
        super.configure(config);
        this._maxPageSize = config.getAsIntegerWithDefault("options.max_page_size", this._maxPageSize);
    }
    /**
     * Converts the given object from the public partial format.
     *
     * @param value     the object to convert from the public partial format.
     * @returns the initial object.
     */
    convertFromPublicPartial(value) {
        return this.convertFromPublic(value);
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
        paging = paging || new pip_services3_commons_node_1.PagingParams();
        let skip = paging.getSkip(-1);
        let take = paging.getTake(this._maxPageSize);
        let pagingEnabled = paging.total;
        if (filter && !_.isEmpty(filter))
            statement += " WHERE " + filter;
        if (skip >= 0)
            statement += " OFFSET " + skip;
        statement += " LIMIT " + take;
        if (sort && !_.isEmpty(sort))
            statement += " ORDER BY " + sort;
        let query = this._query.fromString(statement);
        this._bucket.query(query, [], (err, items) => {
            if (err) {
                callback(err, null);
                return;
            }
            if (items != null)
                this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._bucketName);
            items = _.map(items, this.convertToPublic);
            if (pagingEnabled) {
                statement = "SELECT COUNT(*) FROM default";
                if (filter && !_.isEmpty(filter))
                    statement += " WHERE " + filter;
                query = this._query.fromString(statement);
                this._bucket.query(statement, [], (err, counts) => {
                    if (err) {
                        callback(err, null);
                        return;
                    }
                    let count = counts ? counts[0] : 0;
                    let page = new pip_services3_commons_node_2.DataPage(items, count);
                    callback(null, page);
                });
            }
            else {
                let page = new pip_services3_commons_node_2.DataPage(items);
                callback(null, page);
            }
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
        this._bucket.query(query, [], (err, items) => {
            if (err) {
                callback(err, null);
                return;
            }
            if (items != null)
                this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._bucketName);
            items = _.map(items, this.convertToPublic);
            callback(null, items);
        });
    }
    /**
     * Gets a list of data items retrieved by given unique ids.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param ids               ids of data items to be retrieved
     * @param callback         callback function that receives a data list or error.
     */
    getListByIds(correlationId, ids, callback) {
        let objectIds = _.map(ids, id => "" + id);
        this._bucket.getMulti(objectIds, (count, items) => {
            // Convert to array of results
            items = _.values(items);
            // Define the error
            let err = null;
            if (count > 0 && count == objectIds.length) {
                err = items[0].error;
                // Ignore "Key does not exist on the server" error
                if (err && err.message && err.code == 13)
                    err = null;
            }
            if (err) {
                callback(err, null);
                return;
            }
            items = _.map(items, item => item.value);
            items = _.filter(items, (item) => item != null);
            if (items != null)
                this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._bucketName);
            items = _.map(items, this.convertToPublic);
            callback(null, items);
        });
    }
    /**
     * Gets a data item by its unique id.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param id                an id of data item to be retrieved.
     * @param callback          callback function that receives data item or error.
     */
    getOneById(correlationId, id, callback) {
        let objectId = "" + id;
        this._bucket.get(objectId, (err, result) => {
            // Ignore "Key does not exist on the server" error
            if (err && err.message && err.code == 13)
                err = null;
            if (!err)
                this._logger.trace(correlationId, "Retrieved from %s by id = %s", this._bucketName, objectId);
            let item = result ? this.convertToPublic(result.value) : null;
            callback(err, item);
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
        newItem.id = item.id || pip_services3_commons_node_3.IdGenerator.nextLong();
        let id = newItem.id.toString();
        newItem = this.convertFromPublic(newItem);
        this._bucket.insert(id, newItem, (err, result) => {
            if (!err)
                this._logger.trace(correlationId, "Created in %s with id = %s", this._bucketName, id);
            newItem = err == null ? this.convertToPublic(newItem) : null;
            callback(err, newItem);
        });
    }
    /**
     * Sets a data item. If the data item exists it updates it,
     * otherwise it create a new data item.
     *
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              a item to be set.
     * @param callback          (optional) callback function that receives updated item or error.
     */
    set(correlationId, item, callback) {
        if (item == null) {
            if (callback)
                callback(null, null);
            return;
        }
        // Assign unique id
        let newItem = _.clone(item);
        newItem.id = item.id || pip_services3_commons_node_3.IdGenerator.nextLong();
        let id = newItem.id.toString();
        newItem = this.convertFromPublic(newItem);
        this._bucket.upsert(id, newItem, (err, result) => {
            if (!err)
                this._logger.trace(correlationId, "Set in %s with id = %s", this._bucketName, id);
            if (callback) {
                newItem = err == null ? this.convertToPublic(newItem) : null;
                callback(err, newItem);
            }
        });
    }
    /**
     * Updates a data item.
     *
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              an item to be updated.
     * @param callback          (optional) callback function that receives updated item or error.
     */
    update(correlationId, item, callback) {
        if (item == null || item.id == null) {
            if (callback)
                callback(null, null);
            return;
        }
        let newItem = _.clone(item);
        newItem = this.convertFromPublic(newItem);
        let id = newItem.id.toString();
        this._bucket.replace(id, newItem, (err, result) => {
            if (!err)
                this._logger.trace(correlationId, "Updated in %s with id = %s", this._bucketName, id);
            if (callback) {
                newItem = err == null ? this.convertToPublic(newItem) : null;
                callback(err, newItem);
            }
        });
    }
    /**
     * Updates only few selected fields in a data item.
     *
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param id                an id of data item to be updated.
     * @param data              a map with fields to be updated.
     * @param callback          callback function that receives updated item or error.
     */
    updatePartially(correlationId, id, data, callback) {
        if (data == null || id == null) {
            if (callback)
                callback(null, null);
            return;
        }
        let newItem = data.getAsObject();
        newItem = this.convertFromPublicPartial(newItem);
        let objectId = "" + id;
        // Todo: repeat until update is successful
        this._bucket.get(objectId, (err, result) => {
            if (err || result == null || result.value == null) {
                callback(err, null);
                return;
            }
            let objectValue = _.assign(result.value, newItem);
            this._bucket.replace(objectId, objectValue, { cas: result.cas }, (err, result) => {
                if (!err)
                    this._logger.trace(correlationId, "Updated partially in %s with id = %s", this._bucketName, objectId);
                if (callback) {
                    newItem = err == null ? this.convertToPublic(objectValue) : null;
                    callback(err, newItem);
                }
            });
        });
    }
    /**
     * Deleted a data item by it's unique id.
     *
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param id                an id of the item to be deleted
     * @param callback          (optional) callback function that receives deleted item or error.
     */
    deleteById(correlationId, id, callback) {
        let objectId = "" + id;
        this._bucket.get(objectId, (err, result) => {
            if (err || result == null || result.value == null) {
                callback(err, null);
                return;
            }
            let oldItem = this.convertToPublic(result.value);
            this._bucket.remove(objectId, (err, result) => {
                // Ignore "Key does not exist on the server" error
                if (err && err.message && err.code == 13)
                    err = null;
                if (!err)
                    this._logger.trace(correlationId, "Deleted from %s with id = %s", this._bucketName, objectId);
                if (callback) {
                    oldItem = err == null ? oldItem : null;
                    callback(err, oldItem);
                }
            });
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
    /**
     * Deletes multiple data items by their unique ids.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param ids               ids of data items to be deleted.
     * @param callback          (optional) callback function that receives error or null for success.
     */
    deleteByIds(correlationId, ids, callback) {
        async.each(ids, (id, callback) => {
            let objectId = "" + id;
            this._bucket.remove(objectId, (err) => {
                // Ignore "Key does not exist on the server" error
                if (err && err.message && err.code == 13)
                    err = null;
                callback(err);
            });
        }, callback);
    }
}
exports.IdentifiableCouchbasePersistence = IdentifiableCouchbasePersistence;
//# sourceMappingURL=IdentifiableCouchbasePersistence.js.map