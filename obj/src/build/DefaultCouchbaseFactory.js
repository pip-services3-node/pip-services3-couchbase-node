"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultCouchbaseFactory = void 0;
/** @module build */
const pip_services3_components_node_1 = require("pip-services3-components-node");
const pip_services3_commons_node_1 = require("pip-services3-commons-node");
const CouchbaseConnection_1 = require("../persistence/CouchbaseConnection");
/**
 * Creates Couchbase components by their descriptors.
 *
 * @see [[https://pip-services3-node.github.io/pip-services3-components-node/classes/build.factory.html Factory]]
 * @see [[CouchbaseConnection]]
 */
class DefaultCouchbaseFactory extends pip_services3_components_node_1.Factory {
    /**
     * Create a new instance of the factory.
     */
    constructor() {
        super();
        this.registerAsType(DefaultCouchbaseFactory.CouchbaseConnectionDescriptor, CouchbaseConnection_1.CouchbaseConnection);
    }
}
exports.DefaultCouchbaseFactory = DefaultCouchbaseFactory;
DefaultCouchbaseFactory.Descriptor = new pip_services3_commons_node_1.Descriptor("pip-services", "factory", "rpc", "default", "1.0");
DefaultCouchbaseFactory.CouchbaseConnectionDescriptor = new pip_services3_commons_node_1.Descriptor("pip-services", "connection", "couchbase", "*", "1.0");
//# sourceMappingURL=DefaultCouchbaseFactory.js.map