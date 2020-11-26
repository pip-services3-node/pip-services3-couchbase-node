"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentifiableCouchbasePersistence = void 0;
/** @module persistence */
/** @hidden */
let _ = require('lodash');
/** @hidden */
let async = require('async');
const pip_services3_commons_node_1 = require("pip-services3-commons-node");
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
 * - bucket:                      (optional) Couchbase bucket name
 * - collection:                  (optional) Couchbase collection name
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
 *   - max_pool_size:             (optional) maximum connection pool size (default: 2)
 *   - keep_alive:                (optional) enable connection keep alive (default: true)
 *   - connect_timeout:           (optional) connection timeout in milliseconds (default: 5 sec)
 *   - auto_reconnect:            (optional) enable auto reconnection (default: true)
 *   - max_page_size:             (optional) maximum page size (default: 100)
 *   - debug:                     (optional) enable debug output (default: false).
 *
 * ### References ###
 *
 * - <code>\*:logger:\*:\*:1.0</code>           (optional) [[https://pip-services3-node.github.io/pip-services3-components-node/interfaces/log.ilogger.html ILogger]] components to pass log messages components to pass log messages
 * - <code>\*:discovery:\*:\*:1.0</code>        (optional) [[https://pip-services3-node.github.io/pip-services3-components-node/interfaces/connect.idiscovery.html IDiscovery]] services
 * - <code>\*:credential-store:\*:\*:1.0</code> (optional) Credential stores to resolve credentials
 *
 * ### Example ###
 *
 *     class MyCouchbasePersistence extends CouchbasePersistence<MyData, string> {
 *
 *     public constructor() {
 *         base("mybucket", "mydata", new MyDataCouchbaseSchema());
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
     * @param bucket    (optional) a bucket name.
     * @param collection    (optional) a collection name.
     */
    constructor(bucket, collection) {
        super(bucket, collection);
        if (bucket == null)
            throw new Error("Bucket name could not be null");
        if (collection == null)
            throw new Error("Collection name could not be null");
        //this._collectionName = collection;
    }
    /**
     * Configures component by passing configuration parameters.
     *
     * @param config    configuration parameters to be set.
     */
    configure(config) {
        super.configure(config);
        this._maxPageSize = config.getAsIntegerWithDefault("options.max_page_size", this._maxPageSize);
        this._collectionName = config.getAsStringWithDefault("collection", this._collectionName);
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
        if (value)
            delete value._c;
        return value;
    }
    /**
     * Convert object value from public to internal format.
     *
     * @param value     an object in public format to convert.
     * @returns converted object in internal format.
     */
    convertFromPublic(value) {
        if (value) {
            value = _.clone(value);
            value._c = this._collectionName;
        }
        return value;
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
     * Generates a list of unique ids for specific collection in the bucket
     * @param value a public unique ids.
     * @returns a unique bucket ids.
     */
    generateBucketIds(value) {
        if (value == null)
            return null;
        return _.map(value, (id) => { return this.generateBucketId(id); });
    }
    /**
     * Gets a list of data items retrieved by given unique ids.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param ids               ids of data items to be retrieved
     * @param callback         callback function that receives a data list or error.
     */
    getListByIds(correlationId, ids, callback) {
        let objectIds = this.generateBucketIds(ids);
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
        let objectId = this.generateBucketId(id);
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
        newItem.id = item.id || pip_services3_commons_node_1.IdGenerator.nextLong();
        super.create(correlationId, newItem, callback);
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
        newItem.id = item.id || pip_services3_commons_node_1.IdGenerator.nextLong();
        let id = newItem.id.toString();
        let objectId = this.generateBucketId(id);
        newItem = this.convertFromPublic(newItem);
        this._bucket.upsert(objectId, newItem, (err, result) => {
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
        let objectId = this.generateBucketId(id);
        this._bucket.replace(objectId, newItem, (err, result) => {
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
        let objectId = this.generateBucketId(id);
        // Todo: repeat until update is successful
        this._bucket.get(objectId, (err, result) => {
            if (err || result == null || result.value == null) {
                callback(err, null);
                return;
            }
            let objectValue = _.assign(result.value, newItem);
            this._bucket.replace(objectId, objectValue, { cas: result.cas }, (err, result) => {
                if (!err)
                    this._logger.trace(correlationId, "Updated partially in %s with id = %s", this._bucketName, id);
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
        let objectId = this.generateBucketId(id);
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
                    this._logger.trace(correlationId, "Deleted from %s with id = %s", this._bucketName, id);
                if (callback) {
                    oldItem = err == null ? oldItem : null;
                    callback(err, oldItem);
                }
            });
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
        let count = 0;
        async.each(ids, (id, callback) => {
            let objectId = this.generateBucketId(id);
            this._bucket.remove(objectId, (err) => {
                // Ignore "Key does not exist on the server" error
                if (err && err.message && err.code == 13)
                    err = null;
                if (err == null)
                    count++;
                callback(err);
            });
        }, (err) => {
            this._logger.trace(correlationId, "Deleted %d items from %s", count, this._bucketName);
            if (callback)
                callback(err);
        });
    }
}
exports.IdentifiableCouchbasePersistence = IdentifiableCouchbasePersistence;
//# sourceMappingURL=IdentifiableCouchbasePersistence.js.map