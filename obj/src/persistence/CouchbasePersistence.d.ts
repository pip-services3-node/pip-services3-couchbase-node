import { IReferenceable } from 'pip-services3-commons-node';
import { IUnreferenceable } from 'pip-services3-commons-node';
import { IReferences } from 'pip-services3-commons-node';
import { IConfigurable } from 'pip-services3-commons-node';
import { IOpenable } from 'pip-services3-commons-node';
import { ICleanable } from 'pip-services3-commons-node';
import { ConfigParams } from 'pip-services3-commons-node';
import { CompositeLogger } from 'pip-services3-components-node';
import { DependencyResolver } from 'pip-services3-commons-node';
import { PagingParams } from 'pip-services3-commons-node';
import { DataPage } from 'pip-services3-commons-node';
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
export declare class CouchbasePersistence<T> implements IReferenceable, IUnreferenceable, IConfigurable, IOpenable, ICleanable {
    protected _maxPageSize: number;
    protected _collectionName: string;
    private static _defaultConfig;
    private _config;
    private _references;
    private _opened;
    private _localConnection;
    /**
     * The dependency resolver.
     */
    protected _dependencyResolver: DependencyResolver;
    /**
     * The logger.
     */
    protected _logger: CompositeLogger;
    /**
     * The Couchbase connection component.
     */
    protected _connection: CouchbaseConnection;
    /**
     * The configuration options.
     */
    protected _options: ConfigParams;
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
    constructor(bucket?: string, collection?: string);
    /**
     * Configures component by passing configuration parameters.
     *
     * @param config    configuration parameters to be set.
     */
    configure(config: ConfigParams): void;
    /**
     * Sets references to dependent components.
     *
     * @param references 	references to locate the component dependencies.
     */
    setReferences(references: IReferences): void;
    /**
     * Unsets (clears) previously set references to dependent components.
     */
    unsetReferences(): void;
    private createConnection;
    /**
     * Converts object value from internal to public format.
     *
     * @param value     an object in internal format to convert.
     * @returns converted object in public format.
     */
    protected convertToPublic(value: any): any;
    /**
     * Convert object value from public to internal format.
     *
     * @param value     an object in public format to convert.
     * @returns converted object in internal format.
     */
    protected convertFromPublic(value: any): any;
    /**
     * Checks if the component is opened.
     *
     * @returns true if the component has been opened and false otherwise.
     */
    isOpen(): boolean;
    /**
     * Opens the component.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    open(correlationId: string, callback?: (err: any) => void): void;
    /**
     * Closes component and frees used resources.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    close(correlationId: string, callback?: (err: any) => void): void;
    /**
     * Clears component state.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    clear(correlationId: string, callback?: (err: any) => void): void;
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
    protected getPageByFilter(correlationId: string, filter: any, paging: PagingParams, sort: any, select: any, callback: (err: any, items: DataPage<T>) => void): void;
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
    protected getCountByFilter(correlationId: string, filter: any, callback: (err: any, count: number) => void): void;
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
    protected getListByFilter(correlationId: string, filter: any, sort: any, select: any, callback: (err: any, items: T[]) => void): void;
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
    protected getOneRandom(correlationId: string, filter: any, callback: (err: any, item: T) => void): void;
    /**
    * Generates unique id for specific collection in the bucket
    * @param value a public unique id.
    * @returns a unique bucket id.
    */
    protected generateBucketId(value: any): string;
    /**
     * Creates a data item.
     *
     * @param correlation_id    (optional) transaction id to trace execution through call chain.
     * @param item              an item to be created.
     * @param callback          (optional) callback function that receives created item or error.
     */
    create(correlationId: string, item: T, callback?: (err: any, item: T) => void): void;
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
    deleteByFilter(correlationId: string, filter: any, callback?: (err: any) => void): void;
}
