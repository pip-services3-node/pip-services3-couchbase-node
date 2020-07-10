/** @module persistence */
/** @hidden */
let _ = require('lodash');
/** @hidden */
let async = require('async');

import { IReferenceable, IdGenerator } from 'pip-services3-commons-node';
import { IUnreferenceable } from 'pip-services3-commons-node';
import { IReferences } from 'pip-services3-commons-node';
import { IConfigurable } from 'pip-services3-commons-node';
import { IOpenable } from 'pip-services3-commons-node';
import { ICleanable } from 'pip-services3-commons-node';
import { ConfigParams } from 'pip-services3-commons-node';
import { ConnectionException } from 'pip-services3-commons-node';
import { InvalidStateException } from 'pip-services3-commons-node';
import { CompositeLogger } from 'pip-services3-components-node';
import { DependencyResolver } from 'pip-services3-commons-node';
import { PagingParams } from 'pip-services3-commons-node';
import { DataPage } from 'pip-services3-commons-node';

import { CouchbaseConnectionResolver } from '../connect/CouchbaseConnectionResolver';
import { CouchbaseConnection } from './CouchbaseConnection';

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
 *   - discovery_key:             (optional) a key to retrieve the connection from [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/connect.idiscovery.html IDiscovery]]
 *   - host:                      host name or IP address
 *   - port:                      port number (default: 27017)
 *   - uri:                       resource URI or connection string with all parameters in it
 * - credential(s):    
 *   - store_key:                 (optional) a key to retrieve the credentials from [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/auth.icredentialstore.html ICredentialStore]]
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
 * - <code>\*:logger:\*:\*:1.0</code>           (optional) [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/log.ilogger.html ILogger]] components to pass log messages
 * - <code>\*:discovery:\*:\*:1.0</code>        (optional) [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/connect.idiscovery.html IDiscovery]] services
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
export class CouchbasePersistence<T> implements IReferenceable, IUnreferenceable, IConfigurable, IOpenable, ICleanable {
    protected _maxPageSize: number = 100;
    protected _collectionName: string;

    private static _defaultConfig: ConfigParams = ConfigParams.fromTuples(
        "bucket", null,
        "dependencies.connection", "*:connection:couchbase:*:1.0",

        // connections.*
        // credential.*

        "options.auto_create", false,
        "options.auto_index", true,
        "options.flush_enabled", true,
        "options.bucket_type", "couchbase",
        "options.ram_quota", 100,
    );

    private _config: ConfigParams;
    private _references: IReferences;
    private _opened: boolean;
    private _localConnection: boolean;

    /**
     * The dependency resolver.
     */
    protected _dependencyResolver: DependencyResolver = new DependencyResolver(CouchbasePersistence._defaultConfig);
    /** 
     * The logger.
     */
    protected _logger: CompositeLogger = new CompositeLogger();
    /**
     * The Couchbase connection component.
     */
    protected _connection: CouchbaseConnection;
    /**
     * The configuration options.
     */
    protected _options: ConfigParams = new ConfigParams();

    /**
     * The Couchbase cluster object.
     */
    protected _cluster: any;
    /**
     * The Couchbase bucket name.
     */
    protected _bucketName: string;
    /**
     * The Couchbase bucket object.
     */
    protected _bucket: any;
    /**
     * The Couchbase N1qlQuery object.
     */
    protected _query: any;

    /**
     * Creates a new instance of the persistence component.
     * 
     * @param bucket    (optional) a bucket name.
     * @param collection    (optional) a collection name.
     */
    public constructor(bucket?: string, collection?:string) {
        this._bucketName = bucket;
        this._collectionName = collection;
    }

    /**
     * Configures component by passing configuration parameters.
     * 
     * @param config    configuration parameters to be set.
     */
    public configure(config: ConfigParams): void {
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
    public setReferences(references: IReferences): void {
        this._references = references;
        this._logger.setReferences(references);

        // Get connection
        this._dependencyResolver.setReferences(references);
        this._connection = this._dependencyResolver.getOneOptional('connection');
        // Or create a local one
        if (this._connection == null) {
            this._connection = this.createConnection();
            this._localConnection = true;
        } else {
            this._localConnection = false;
        }
    }

    /**
	 * Unsets (clears) previously set references to dependent components. 
     */
    public unsetReferences(): void {
        this._connection = null;
    }

    private createConnection(): CouchbaseConnection {
        let connection = new CouchbaseConnection(this._bucketName);
        
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
    protected convertToPublic(value: any): any {
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
    protected convertFromPublic(value: any): any {
        return value;
    }    

    /**
	 * Checks if the component is opened.
	 * 
	 * @returns true if the component has been opened and false otherwise.
     */
    public isOpen(): boolean {
        return this._opened;
    }

    /**
	 * Opens the component.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    public open(correlationId: string, callback?: (err: any) => void): void {
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
                err = new InvalidStateException(correlationId, 'NO_CONNECTION', 'Couchbase connection is missing');
            }

            if (err == null && !this._connection.isOpen()) {
                err = new ConnectionException(correlationId, "CONNECT_FAILED", "Couchbase connection is not opened");
            }

            this._opened = false;

            if (err) {
                if (callback) callback(err);
            } else {
                this._cluster = this._connection.getConnection();
                this._bucket = this._connection.getBucket();
                this._bucketName = this._connection.getBucketName();
                
                let couchbase = require('couchbase');
                this._query = couchbase.N1qlQuery;

                if (callback) callback(null);
            }
        };

        if (this._localConnection) {
            this._connection.open(correlationId, openCurl);
        } else {
            openCurl(null);
        }
    }

    /**
	 * Closes component and frees used resources.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    public close(correlationId: string, callback?: (err: any) => void): void {
    	if (!this._opened) {
            callback(null);
            return;
        }

        if (this._connection == null) {
            callback(new InvalidStateException(correlationId, 'NO_CONNECTION', 'MongoDb connection is missing'));
            return;
        }
        
        let closeCurl = (err) => {
            this._opened = false;
            this._cluster = null;
            this._bucket = null;
            this._query = null;
    
            if (callback) callback(err);
        }

        if (this._localConnection) {
            this._connection.close(correlationId, closeCurl);
        } else {
            closeCurl(null);
        }
    }

    /**
	 * Clears component state.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    public clear(correlationId: string, callback?: (err: any) => void): void {
        // Return error if collection is not set
        if (this._bucketName == null) {
            if (callback) callback(new Error('Bucket name is not defined'));
            return;
        }

        this._bucket.manager().flush((err) => {
           if (err) {
                err = new ConnectionException(correlationId, "FLUSH_FAILED", "Couchbase bucket flush failed")
                    .withCause(err);
            }
            
            if (callback) callback(err);
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
    protected getPageByFilter(correlationId: string, filter: any, paging: PagingParams, 
        sort: any, select: any, callback: (err: any, items: DataPage<T>) => void): void {

        select = select && !_.isEmpty(select) ? select : "*"
        let statement = "SELECT " + select + " FROM `" + this._bucketName + "`";

        // Adjust max item count based on configuration
        paging = paging || new PagingParams();
        let skip = paging.getSkip(-1);
        let take = paging.getTake(this._maxPageSize);
        let pagingEnabled = paging.total;

        let collectionFilter = "_c='" + this._collectionName + "'"
        if (filter && !_.isEmpty(filter))
            filter = collectionFilter + " AND " + filter;
        else filter = collectionFilter;
        statement += " WHERE " + filter;

        if (sort && !_.isEmpty(sort)) statement += " ORDER BY " + sort;

        if (skip >= 0) statement += " OFFSET " + skip;
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
                if (filter && !_.isEmpty(filter)) statement += " WHERE " + filter;

                query = this._query.fromString(statement);
                this._bucket.query(query, [], (err, counts) => {
                    if (err) {
                        callback(err, null);
                        return;
                    }
                        
                    let count = counts ? counts[0]['$1'] : 0;
                    let page = new DataPage<T>(items, count);
                    callback(null, page);
                });
            } else {
                let page = new DataPage<T>(items);
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
    protected getCountByFilter(correlationId: string, filter: any,
        callback: (err: any, count: number) => void): void {


        let collectionFilter = "_c='" + this._collectionName + "'"
        if (filter && !_.isEmpty(filter))
            filter = collectionFilter + " AND " + filter;
        else filter = collectionFilter;

        let statement = "SELECT COUNT(*) FROM `" + this._bucketName + "`";
        if (filter && !_.isEmpty(filter)) statement += " WHERE " + filter;

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
    protected getListByFilter(correlationId: string, filter: any, sort: any, select: any, 
        callback: (err: any, items: T[]) => void): void {
        
        select = select && !_.isEmpty(select) ? select : "*"
        let statement = "SELECT " + select + " FROM `" + this._bucketName + "`";

        // Adjust max item count based on configuration
        if (filter && !_.isEmpty(filter)) statement += " WHERE " + filter;
        if (sort && !_.isEmpty(sort)) statement += " ORDER BY " + sort;

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
    protected getOneRandom(correlationId: string, filter: any, callback: (err: any, item: T) => void): void {
        let statement = "SELECT COUNT(*) FROM `" + this._bucketName + "`";

        // Adjust max item count based on configuration
        if (filter && !_.isEmpty(filter)) statement += " WHERE " + filter;

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
            if (filter && !_.isEmpty(filter)) statement += " WHERE " + filter;

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
    protected generateBucketId(value: any): string {
        if (value == null) return null;
        return this._collectionName + value.toString();
    }


    /**
     * Creates a data item.
     * 
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              an item to be created.
     * @param callback          (optional) callback function that receives created item or error.
     */
    public create(correlationId: string, item: T, callback?: (err: any, item: T) => void): void {
        if (item == null) {
            callback(null, null);
            return;
        }

        // Assign unique id
        let newItem: any = _.clone(item);
        let id = newItem.id || IdGenerator.nextLong();
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
    public deleteByFilter(correlationId: string, filter: any, callback?: (err: any) => void): void {
        let statement = "DELETE FROM `" + this._bucketName + "`";

        // Adjust max item count based on configuration
        if (filter && !_.isEmpty(filter)) statement += " WHERE " + filter;

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
