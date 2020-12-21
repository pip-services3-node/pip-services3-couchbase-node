import { FilterParams } from 'pip-services3-commons-node';
import { PagingParams } from 'pip-services3-commons-node';
import { DataPage } from 'pip-services3-commons-node';

import { IdentifiableCouchbasePersistence } from '../../src/persistence/IdentifiableCouchbasePersistence';
import { Dummy } from '../fixtures/Dummy';
import { IDummyPersistence } from '../fixtures/IDummyPersistence';

export class DummyCouchbasePersistence 
    extends IdentifiableCouchbasePersistence<Dummy, string> 
    implements IDummyPersistence
{
    public constructor() {
        super('test', 'dummies');
    }

    public getPageByFilter(correlationId: string, filter: FilterParams, paging: PagingParams, 
        callback: (err: any, page: DataPage<Dummy>) => void): void {
        filter = filter || new FilterParams();
        let key = filter.getAsNullableString('key');

        let filterCondition = "";
        let filterParams = [];
        if (key != null) {
            filterCondition += "key='" + key + "'";
        }

        super.getPageByFilter(correlationId, filterCondition, paging, null, null, callback);
    }

    public getCountByFilter(correlationId: string, filter: FilterParams, 
        callback: (err: any, count: number) => void): void {
        filter = filter || new FilterParams();
        let key = filter.getAsNullableString('key');

        let filterCondition = "";
        let filterParams = [];
        if (key != null) {
            filterCondition += "key='" + key + "'";
        }

        super.getCountByFilter(correlationId, filterCondition, callback);
    }

}