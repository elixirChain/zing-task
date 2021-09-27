// import { JoiUtils } from '../util/JoiUtils';
// import { AsyncConstructor } from '../util/AsyncConstructor';
import { post, get } from '../util/request';
const _ = require('lodash');

/**
 * Connection is a single database ORM connection to a specific database.
 * Its not required to be a database connection, depend on database type it can create connection pool.
 * You can have multiple connections to multiple databases in your application.
 */
export class Action {

    // -------------------------------------------------------------------------
    // Public Readonly Properties
    // -------------------------------------------------------------------------

    name: string;
    type: string;
    content: any;
    context: any;
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(_options: any) {
        // super(async () => {
        try {
            // await JoiUtils.checkParams(OptionsParamsSchema, _options);
            this.name = _options.name;
            this.type = _options.type;
            this.content = _options.content;
            this.context = _options.context;
        } catch (err) {
            //todo
            console.error(`action ${this.name} 初始化 Action Class 失败!!!`, err);
        }
        // })
    }

    // -------------------------------------------------------------------------
    // Public Accessors
    // -------------------------------------------------------------------------

    /**
     * Gets the mongodb entity manager that allows to perform mongodb-specific repository operations
     * with any entity in this connection.
     *
     * Available only in mongodb connections.
     */
    // get mongoManager(): MongoEntityManager {
    //     if (!(this.manager instanceof MongoEntityManager))
    //         throw new TypeORMError(`MongoEntityManager is only available for MongoDB databases.`);

    //     return this.manager as MongoEntityManager;
    // }

    // -------------------------------------------------------------------------
    // Public Methods
    // --------------------------------------------------------------------------

    // getRepository<Entity>(target: EntityTarget<Entity>): Repository<Entity> {
    async executor(params): Promise<any> {
        try {
            switch (this.type) {
                case "post":
                    return await this.postExecutor(params);
                case "get":
                    return await this.getExecutor(params);
                case "db":
                    return await this.dbExecutor(params);
                case "func":
                    return await this.funcExecutor(params);
                default:
                    throw new Error(`action ${this.name} ${this.type} executor is not found!`);
            }

        } catch (err) {
            console.log(`action ${this.name} Action executor error: ${err}`);
            throw Error(`action ${this.name} Action executor 失败!!!, 错误: ${err}`);
        }

    }

    async postExecutor(params) {
        try {
            return await post(this.content.path, params, this.content.headers);
        } catch (err) {
            console.error(err);
            //todo add union Error  consturctor
            throw Error(`action ${this.name} Action Class postExecutor 失败!!!, 错误: ${err}`);
        }
    }

    async getExecutor(params) {
        try {
            return await get(this.content.path, params);
        } catch (err) {
            console.error(err);
            //todo add union Error  consturctor
            throw Error(`action ${this.name} Action Class getExecutor 失败!!!, 错误: ${err}`);
        }
    }

    async dbExecutor(params) {
        // "executeSql params: ", sql, binds, options
        //todo check params
        try {
            let tempSql = '';
            let tempParams = {};
            if (!!this.content.knexFunc) {
                tempSql = this.content.knexFunc(params).sql;
                tempParams = this.content.knexFunc(params).bindings;
            } else if (!!this.content.sql) {
                tempSql = this.content.sql;
                tempParams = params;
            }
            return await this.context.connetion.executeSqlRaw({
                sql: tempSql,
                binds: tempParams,
                options: this.content.options
            });
        } catch (err) {
            console.error(err);
            //todo add union Error  consturctor
            throw Error(`action ${this.name} Action Class dbExecutor 失败!!!, 错误: ${err}`);
        }
    }

    async funcExecutor(params) {
        // "executeSql params: ", sql, binds, options
        try {
            let temp = '';
            for (var key in params) {
                // start with @key...@keyN
                temp = _.replace(this.content.funcStr, `@${key}`, `${JSON.stringify(params[key])}`);
            }

            console.log(`action ${this.name} funcExecutor this.content.funcStr: `, this.content.funcStr);

            console.log(`action ${this.name} funcExecutor params.binds: `);
            console.dir(params);

            console.log(`action ${this.name} funcExecutor temp: `, temp);

            let result = Function(temp)();

            console.log(`action ${this.name} funcExecutor result: `, result);

            return result;

            // return await params.func(params.params);
        } catch (err) {
            console.error(err);
            //todo add union Error  consturctor
            throw Error(`action ${this.name} Action Class funcExecutor 失败!!!, 错误: ${err}`);
        }
    }

}
