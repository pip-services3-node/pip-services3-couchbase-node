# <img src="https://uploads-ssl.webflow.com/5ea5d3315186cf5ec60c3ee4/5edf1c94ce4c859f2b188094_logo.svg" alt="Pip.Services Logo" width="200"> <br/> Couchbase components for Node.js

This module is a part of the [Pip.Services](http://pipservices.org) polyglot microservices toolkit. It provides a set of components to implement Couchbase persistence.

The module contains the following packages:
- **Build** - Factory to create Couchbase persistence components.
- **Connect** - Connection component to configure Couchbase connection to database.
- **Persistence** - abstract persistence components to perform basic CRUD operations.

<a name="links"></a> Quick links:

* [Configuration](https://www.pipservices.org/recipies/configuration)
* [API Reference](https://pip-services3-node.github.io/pip-services3-couchbase-node/globals.html)
* [Change Log](CHANGELOG.md)
* [Get Help](https://www.pipservices.org/community/help)
* [Contribute](https://www.pipservices.org/community/contribute)

## Use

As an example, lets create persistence for the following data object.

```typescript
import { IIdentifiable } from 'pip-services3-commons-node';

export class MyObject implements IIdentifiable {
  public id: string;
  public key: string;
  public value: number;
}
```

The persistence component shall implement the following interface with a basic set of CRUD operations.

```typescript
export interface IMyPersistence {
    getPageByFilter(correlationId: string, filter: FilterParams, paging: PagingParams,
      callback: (err: any, page: DataPage<MyObject>) => void): void;
    
    getOneById(correlationId: string, id: string, callback: (err: any, item: MyObject) => void): void;
    
    getOneByKey(correlationId: string, key: string, callback: (err: any, item: MyObject) => void): void;
    
    create(correlationId: string, item: MyObject, callback?: (err: any, item: MyObject) => void): void;
    
    update(correlationId: string, item: MyObject, callback?: (err: any, item: MyObject) => void): void;
    
    deleteById(correlationId: string, id: string, callback?: (err: any, item: MyObject) => void): void;
}
```

To implement couchbase persistence component you shall inherit `IdentifiableCouchbasePersistence`. 
Most CRUD operations will come from the base class. You only need to override `getPageByFilter` method with a custom filter function.
And implement a `getOneByKey` custom persistence method that doesn't exist in the base class.

```typescript
import { IdentifiableCouchbasePersistence } from 'pip-services3-couchbase-node';

export class MyCouchbasePersistence extends IdentifableCouchbasePersistence {
  public constructor() {
    super("app", "myobjects");
    this.ensureIndex({ key: 1 }, { unique: true });
  }

  private composeFilter(filter: FilterParams): any {
    filter = filter || new FilterParams();
    
    let criteria = [];

    let id = filter.getAsNullableString('id');
    if (id != null)
        criteria.push("id='" + this.generateBucketId(id) + "'");

    let tempIds = filter.getAsNullableString("ids");
    if (tempIds != null) {
        let ids = tempIds.split(",");
        ids = _.map(ids, id => this.generateBucketId(id));
        filters.push("id IN ('" + ids.join("','") + "')");
    }

    let key = filter.getAsNullableString("key");
    if (key != null)
        criteria.push("key='" + key + "'");

    return criteria.length > 0 ? criteria.join(" AND ") : null;
  }
  
  public getPageByFilter(correlationId: string, filter: FilterParams, paging: PagingParams,
    callback: (err: any, page: DataPage<MyObject>) => void): void {
    super.getPageByFilter(correlationId, this.composeFilter(filter), paging, "id", null, callback);
  }  
  
  public getOneByKey(correlationId: string, key: string,
    callback: (err: any, item: MyObject) => void): void {
    
    let statement = "SELECT * FROM `" + this._bucketName + "` WHERE "_c='" + this._collectionName + "' AND key='" + key + "'";
    let query = this._query.fromString(statement);
    query.consistency(this._query.Consistency.REQUEST_PLUS);
    this._bucket.query(query, [], (err, items) => {
      err = err || null;

      items = _.map(items, this.convertToPublic);
      let item = item != null ? item[0] : null;

      if (item == null)
        this._logger.trace(correlationId, "Nothing found from %s with key = %s", this._collectionName, key);
      else
        this._logger.trace(correlationId, "Retrieved from %s with key = %s", this._collectionName, key);

      callback(err, item);
    });
  }

}
```

Configuration for your microservice that includes couchbase persistence may look the following way.

```yaml
...
{{#if COUCHBASE_ENABLED}}
- descriptor: pip-services:connection:couchbase:con1:1.0
  connection:
    uri: {{{COUCHBASE_SERVICE_URI}}}
    host: {{{COUCHBASE_SERVICE_HOST}}}{{#unless COUCHBASE_SERVICE_HOST}}localhost{{/unless}}
    port: {{COUCHBASE_SERVICE_PORT}}{{#unless COUCHBASE_SERVICE_PORT}}8091{{/unless}}
    bucket: {{COUCHBASE_BUCKET}}{{#unless COUCHBASE_BUCKET}}app{{/unless}}
  credential:
    username: {{COUCHBASE_USER}}
    password: {{COUCHBASE_PASS}}
    
- descriptor: myservice:persistence:couchbase:default:1.0
  dependencies:
    connection: pip-services:connection:couchbase:con1:1.0
  collection: {{COUCHBASE_COLLECTION}}{{#unless COUCHBASE_COLLECTION}}myobjects{{/unless}}
{{/if}}
...
```

## Develop

For development you shall install the following prerequisites:
* Node.js 8+
* Visual Studio Code or another IDE of your choice
* Docker
* Typescript

Install dependencies:
```bash
npm install
```

Compile the code:
```bash
tsc
```

Run automated tests:
```bash
npm test
```

Generate API documentation:
```bash
./docgen.ps1
```

Before committing changes run dockerized build and test as:
```bash
./build.ps1
./test.ps1
./clear.ps1
```

## Contacts

The library is created and maintained by **Sergey Seroukhov**.

The documentation is written by **Mark Makarychev**.
