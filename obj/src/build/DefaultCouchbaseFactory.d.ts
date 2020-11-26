/** @module build */
import { Factory } from 'pip-services3-components-node';
import { Descriptor } from 'pip-services3-commons-node';
/**
 * Creates Couchbase components by their descriptors.
 *
 * @see [[https://pip-services3-node.github.io/pip-services3-components-node/classes/build.factory.html Factory]]
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
