// import { Repository } from "../repository/Repository";
import { Action } from '../action/Action';
// import { JoiUtils } from '../util/JoiUtils';
import { CommonTools } from '../util/CommonTools';
// import { AsyncConstructor } from '../util/AsyncConstructor';
const schedule = require('node-schedule');
/**
 * Connection is a single database ORM connection to a specific database.
 * Its not required to be a database connection, depend on database type it can create connection pool.
 * You can have multiple connections to multiple databases in your application.
 */
// export class Task extends AsyncConstructor {
export class Task {

    // -------------------------------------------------------------------------
    // Public Readonly Properties
    // -------------------------------------------------------------------------

    name: string;
    type: string;
    status: boolean;

    //instance
    task: any;

    corn: string;

    startDate: string;

    endDate: string;

    // actions[<name>].params and actions[<name>].returns
    context: any;

    // action instance chain 
    actions: Array<any>
    actionNames: Array<string>
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    //todo add _options Type 
    constructor(_options: any) {
        // super(async () => {
        try {
            //todo add check
            // await JoiUtils.checkParams(OptionsParamsSchema, _options);
            this.name = _options.name;
            this.type = _options.type;
            this.corn = _options.corn;
            // this.startDate = _options.startDate;
            // this.endDate = _options.endDate;
            this.status = false;
            this.actions = [];
            this.actionNames = [];
            this.context = {};
            //todo connect to db and generate schema, 
            // use to check globalScope.tablesObj whether in the db or not when Connection Class init
            this.initActions(_options.actions);

        } catch (err) {
            //todo
            console.error("初始化 Task Class 失败!!!", err);
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
    // -------------------------------------------------------------------------

    async initActions(actions: Array<any>): Promise<any> {
        try {
            for (let i = 0; i < actions.length; i++) {
                if (this.actionNames.includes(actions[i].name)) {
                    let err = `${actions[i].name} is already exist! action.name is not allow the same name!`;
                    console.error(err);
                    throw Error(err);
                }
                this.actions.push(new Action(actions[i]));
                this.actionNames.push(actions[i].name);
            }
            console.log(`Task initActions`);
        } catch (err) {
            console.log(`Task initActions error: ${err}`);
        }

    }

    async start(_app): Promise<any> {
        try {
            let taskCount = 1;
            this.task = schedule.scheduleJob(this.corn, async () => {
                console.log(``);
                console.log(``);
                console.log(`-------------------${taskCount} times task begin:--------------------`);
                this.context.actions = {};
                for (let i = 0; i < this.actions.length; i++) {
                    let action = Object.assign({}, this.actions[i]);
                    console.log(`${action.name}:`);
                    console.dir(action);

                    this.context.actions[this.actions[i].name] = {
                        params: {},
                        returns: {},
                    };
                    let tempParams = {};
                    if (!!action.context && !!action.context.params) {
                        let actionCtx = Object.assign({}, action.context);
                        if (!!actionCtx.params.assign && Object.keys(actionCtx.params.assign).length > 0) {
                            tempParams = Object.assign({}, actionCtx.params.assign);
                        }
                        if (!!actionCtx.params.auto && Object.keys(actionCtx.params.auto).length > 0) {
                            let auto = Object.assign({}, actionCtx.params.auto);
                            console.log(`actionCtx.params.auto: `, auto);

                            let temp = {};
                            for (var key in auto) {
                                //todo 
                                if (!(this.actionNames.includes(auto[key].actionName))) {
                                    let err = `${action.name} context.params.auto can't find the params: '${auto[key].actionName}' in 'this.actionNames'`;
                                    console.error(err);
                                    throw Error(err);
                                }
                                if (!(['params', 'returns'].includes(auto[key].type))) {
                                    let err = `${action.name} context.params.auto[${key}]: ${auto[key].type}, type must be 'params' or 'returns'`;
                                    console.error(err);
                                    throw Error(err);
                                }
                                if (CommonTools.getClass(auto[key].key) === 'String') {
                                    if (!!this.context.actions[auto[key].actionName][auto[key].type][auto[key].key]) {
                                        temp[key] = Object.assign({}, this.context.actions[auto[key].actionName][auto[key].type][auto[key].key]);
                                    } else {

                                        let err = `${action.name} context.params.auto can't find the params: '${auto[key].key}' in 'this.context.actions.${auto[key].actionName}.${auto[key].type}'`;
                                        console.error(err);
                                        throw Error(err);
                                        // // the Job is newly scheduled afterwards

                                    }
                                } else if (CommonTools.getClass(auto[key].key) === 'Array' && auto[key].key.length > 0) {
                                    let keys = auto[key].key;
                                    let nested = Object.assign({}, this.context.actions[auto[key].actionName][auto[key].type]);

                                    for (let i = 0; i < keys.length; i++) {
                                        if (!nested[keys[i]]) {
                                            let err = `${action.name} context.params.auto can't find the params: '${keys[i]}' in 'this.context.actions.${auto[key].actionName}.${auto[key].type}'`;
                                            console.error(err);
                                            throw Error(err);
                                        }

                                        nested = nested[keys[i]];
                                    }
                                    temp[key] = nested;
                                }
                                // this.task.cancel(true);
                            }
                            tempParams = Object.assign({}, tempParams, temp);
                        }
                    }
                    console.log(`${action.name} tempParams: `, tempParams);
                    this.context.actions[action.name].params = tempParams;

                    // inject connection to action.context
                    if (this.actions[i].type === 'db') {
                        if (!!this.actions[i].context.connectionName) {
                            this.actions[i].context.connetion = _app.context.connections[this.actions[i].context.connectionName];
                        } else {
                            this.actions[i].context.connetion = _app.context.connection;
                        }
                    }

                    // execute action
                    let result = await this.actions[i].executor(tempParams);

                    this.context.actions[action.name].returns = result;
                    console.log(`${action.name} result keys: `, Object.keys(result));
                    console.log(`${action.name} result: `, new Date().getTime());

                    //check result to break loop
                    if (!!action.context && !!action.context.checkResult) {
                        let checkResult = Object.assign({}, action.context.checkResult);
                        if (CommonTools.getClass(checkResult) !== 'Object') {
                            let err = `${action.name} checkResult must be an object!`;
                            console.error(err);
                            throw Error(err);
                        }

                        let tempCheckStr = '';
                        if (CommonTools.getClass(checkResult.key) === 'String') {
                            if (!Object.keys(result).includes(checkResult.key)) {
                                let err = `${action.name} checkResult can't find the params: '${checkResult.key}' in 'result'`;
                                console.error(err);
                                throw Error(err);
                            }
                            tempCheckStr = `${JSON.stringify(result[checkResult.key])} ${checkResult.opr} ${JSON.stringify(checkResult.value)}`
                        } else if (CommonTools.getClass(checkResult.key) === 'Array' && checkResult.key.length > 0) {
                            let keys = checkResult.key;
                            let nested = Object.assign({}, result);
                            for (let i = 0; i < keys.length; i++) {
                                if (!nested.hasOwnProperty(keys[i])) {
                                    let err = `${action.name} checkResult.key can't find the params: '${keys[i]}' in 'result'`;
                                    console.error(err);
                                    throw Error(err);
                                }
                                nested = nested[keys[i]];
                            }
                            tempCheckStr = `${JSON.stringify(nested)} ${checkResult.opr} ${JSON.stringify(checkResult.value)}`
                        }

                        console.log(`${action.name} checkResult tempCheckStr: `, tempCheckStr);
                        console.log(`${action.name} checkResult Function(tempCheckStr)(): `, Function(`"use strict";return ( ${tempCheckStr} )`)());

                        if (!Function(`"use strict";return ( ${tempCheckStr} )`)()) {
                            if (!checkResult.action || !(['break'].includes(checkResult.action))) {
                                let err = `${action.name} checkResult.action must be 'break' and etc.`;
                                console.error(err);
                                throw Error(err);
                            }
                            // skip this time task, ignore after actions
                            console.log(`-------------------${taskCount} times task break!!!-------------------`);
                            break;

                        };

                    }

                }
                console.log(`-------------------${taskCount} times task end.----------------------`);
                taskCount++;
            });

        } catch (err) {
            console.log(`${this.name} task start error: ${err}`);
        }

    }

    async stop(): Promise<any> {
        try {

            this.task.cancel();

        } catch (err) {
            console.log(`${this.name} task stop error: ${err}`);
        }

    }


}
