const _ = require('lodash');
const print = (...args) => {
    if (!process.env.DEBUG || !/nql/.test(process.env.DEBUG)) {
        return;
    }

    console.log(...args); // eslint-disable-line no-console
};

const logicOps = [
    '$and',
    '$or'
];

const compOps = {
    $eq: '=',
    $ne: '!=',
    $gt: '>',
    $gte: '>=',
    $lt: '<',
    $lte: '<=',
    $in: 'in',
    $nin: 'not in'
};

const isOp = key => key.charAt(0) === '$';
const isLogicOp = key => isOp(key) && _.includes(logicOps, key);
const isCompOp = key => isOp(key) && _.includes(_.keys(compOps), key);

class MongoToKnex {
    constructor(qb, options) {
        this.qb = qb;
        this.tablename = qb._single.table;

        if (options && options.relations) {
            this.relations = options.relations;
        }
        this.joins = [];
    }

    addJoin(table, op) {
        // Only keep track of joins if we have a relation
        if (!this.relations || !this.relations[table]) {
            return;
        }

        // Store the OP because an IN is different
        this.joins.push({table, op});
    }

    processWhereType(mode, op, value) {
        if (value === null) {
            return (mode === '$or' ? 'orWhere' : 'where') + (op === '$ne' ? 'NotNull' : 'Null');
        }

        if (mode === '$or') {
            return 'orWhere';
        }

        return 'andWhere';
    }

    processField(field, op) {
        const fieldParts = field.split('.');

        if (fieldParts[0] === this.tablename) {
            // If we have the right table already, return
            return field;
        } else if (fieldParts.length > 1) {
            // If we have a different table, that should be a join
            this.addJoin(fieldParts[0], op);

            return field;
        }

        return this.tablename + '.' + field;
    }

    buildComparison(qb, mode, field, op, value) {
        let comp = compOps[op] || '=';
        let whereType = this.processWhereType(mode, op, value);
        field = this.processField(field, op);

        print('add compare', whereType, field, op, comp, value);
        qb[whereType](field, comp, value);
    }

    buildWhereClause(qb, mode, field, sub) {
        print('whereClause', mode, field, sub);

        if (!_.isObject(sub)) {
            this.buildComparison(qb, mode, field, '$eq', sub);
        } else {
            _.forIn(sub, (value, op) => {
                if (isCompOp(op)) {
                    this.buildComparison(qb, mode, field, op, value);
                }
            });
        }
    }

    buildWhereGroup(qb, parentMode, mode, sub) {
        let whereType = this.processWhereType(parentMode);
        print('whereGroup', mode, whereType, sub, _.isObject(sub), _.isArray(sub));
        qb[whereType]((_qb) => {
            if (_.isArray(sub)) {
                sub.forEach(statement => this.buildQuery(_qb, mode, statement));
            } else if (_.isObject(sub)) {
                this.buildQuery(_qb, mode, sub);
            }
        });
    }

    buildQuery(qb, mode, sub) {
        print('buildQuery', mode, sub);
        _.forIn(sub, (value, key) => {
            if (isLogicOp(key)) {
                this.buildWhereGroup(qb, mode, key, value);
            } else {
                this.buildWhereClause(qb, mode, key, value);
            }
        });
    }

    buildManyToManyJoin(join, relation) {
        const from = this.tablename;
        const to = join.table;
        const through = relation.join_table;
        print('buildManyToManyJoin', from, through, to);
        // This is an overly simplified version of a many-to-many join for a query
        // It will only work if the query is an 'in' or simple equals
        this.qb
            .leftOuterJoin(through, `${through}.${relation.join_from}`, '=', `${from}.id`)
            .leftOuterJoin(to, `${through}.${relation.join_to}`, '=', `${to}.id`)
            .groupBy(`${from}.id`);
    }

    buildOneToManyJoin(join, relation) {
        const from = this.tablename;
        const to = join.table;
        print('buildOneToManyJoin', from, to);

        this.qb
            .leftOuterJoin(to, `${to}.id`, '=', `${from}.${relation.join_from}`);
    }

    buildJoins() {
        print('buildJoins', this.joins, this.relations);
        _.each(this.joins, (join) => {
            const relation = this.relations[join.table];
            print('joining', join, relation);

            if (relation.type === 'manyToMany') {
                this.buildManyToManyJoin(join, relation);
            } else if (relation.type === 'oneToMany') {
                this.buildOneToManyJoin(join, relation);
            }
        });
    }

    processJSON(queryJSON) {
        // And is the default behaviour
        this.buildQuery(this.qb, 'and', queryJSON);
        this.buildJoins();
    }
}

module.exports = function convertor(qb, mongoJSON, options) {
    const mongoToKnex = new MongoToKnex(qb, options);

    mongoToKnex.processJSON(mongoJSON);

    return qb;
};
