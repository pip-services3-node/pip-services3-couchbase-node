/** @module build */
import { Factory } from 'pip-services3-components-node';
import { Descriptor } from 'pip-services3-commons-node';
/**
 * Creates Couchbase components by their descriptors.
 *
 * @see [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/classes/build.factory.html Factory]]
 * @see [[CouchbaseConnection]]
 */
export declare class DefaultCouchbaseFactory extends Factory {
    static readonly Descriptor: Descriptor;
    static readonly CouchbaseConnectionDescriptor: Descriptor;
    /**
     * Create a new instance of the factory.
     */
    constructor();
}
