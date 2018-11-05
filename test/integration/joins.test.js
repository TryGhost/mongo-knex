const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug')('test');

const utils = require('../utils');
const knex = utils.db.knex.sqlite();

const convertor = require('../../lib/convertor');

/* eslint-disable no-console*/

const makeQuery = query => convertor(knex('posts'), query, {
    relations: {
        tags: {
            type: 'manyToMany',
            join_table: 'posts_tags',
            join_from: 'post_id',
            join_to: 'tag_id'
        },
        authors: {
            type: 'oneToMany',
            join_from: 'author_id'
        }
    }
});

const flatten = (jsonData) => {
    const ops = [];
    _.each(jsonData, (entries, table) => {
        _.each(entries, (entry) => {
            ops.push({table, entry});
        });
    });

    return ops;
};

// Integration tests build a test database and
// check that we get the exact data we expect from each query
describe.only('Joins', function () {
    before(function () {
        // DB TEST SETUP
        this.testSuiteName = _.kebabCase(_.deburr(this.test.parent.title));
        debug('Running setup for', this.testSuiteName);

        return utils.db.schema.down(knex)
            .then(() => utils.db.schema.up(knex))
            .then(() => {
                try {
                    debug('Loading base fixtures for', this.testSuiteName);
                    const base = require('./fixtures/base');
                    return Promise.each(flatten(base), op => knex(op.table).insert(op.entry));
                } catch (e) {
                    debug('Not loading any base fixtures for', this.testSuiteName);
                }
            });
    });

    after(function () {
        // DB TEST TEARDOWN
        if (_.includes(process.argv, '--skip-teardown')) {
            debug('Skipping teardown for', this.testSuiteName);
            return knex.destroy();
        }

        debug('Running teardown for', this.testSuiteName);
        return utils.db.schema
            .down(knex)
            .then(() => knex.destroy());
    });

    describe('One-to-Many', function () {
        it('can match array in (single value)', function (done) {
            const queryJSON = {'authors.slug': {$in: ['sam']}};

            // Use the queryJSON to build a query
            const query = makeQuery(queryJSON);

            // Check any intermediate values
            console.log(query.toQuery());

            // Perform the query against the DB
            query.select()
                .then((result) => {
                    console.log(result);

                    result.should.be.an.Array().with.lengthOf(2);

                    // Check we get the right data
                    // result.should.do.something;

                    done();
                })
                .catch(done);
        });

        it('can match array in (multiple values)', function (done) {
            const queryJSON = {'authors.name': {$in: ['Sam Smith', 'Pat Taylor']}};

            // Use the queryJSON to build a query
            const query = makeQuery(queryJSON);

            // Check any intermediate values
            console.log('query', query.toQuery());

            // Perform the query against the DB
            query.select()
                .then((result) => {
                    console.log(result);

                    result.should.be.an.Array().with.lengthOf(5);

                    // Check we get the right data
                    // result.should.do.something;

                    done();
                })
                .catch(done);
        });
    });

    describe('Many-to-Many: Simple Cases', function () {
        beforeEach(function () {
            // DB TEST INIT
            // Before each test, we load data specific to this suite of tests
            this.testGroupName = _.kebabCase(_.deburr(this.currentTest.parent.title));

            try {
                let fixturesJSON = require(`./fixtures/${this.testGroupName}.json`);
                this.fixtures = flatten(fixturesJSON);
                debug('Loading fixtures for', this.testGroupName);
                return Promise.each(this.fixtures, op => knex(op.table).insert(op.entry));
            } catch (e) {
                // No fixtures for this test group
                debug('Not loading any fixtures for', this.testGroupName);
            }
        });

        afterEach(function () {
            // DB TEST RESET
            // After each test, we unload any data specific to this suite of tests
            if (this.fixtures) {
                debug('Unloading fixtures for', this.testGroupName);
                return Promise.each(this.fixtures, op => knex(op.table).truncate());
            } else {
                // No fixtures for this test group
                debug('Not unloading any fixtures for', this.testGroupName);
            }
        });

        it('can match array in (single value)', function (done) {
            const queryJSON = {'tags.slug': {$in: ['animal']}};

            // Use the queryJSON to build a query
            const query = makeQuery(queryJSON);

            // Check any intermediate values
            console.log(query.toQuery());

            // Perform the query against the DB
            query.select()
                .then((result) => {
                    console.log(result);

                    result.should.be.an.Array().with.lengthOf(3);

                    // Check we get the right data
                    // result.should.do.something;

                    done();
                })
                .catch(done);
        });

        it('can match array in (multiple values)', function (done) {
            const queryJSON = {'tags.id': {$in: [2, 3]}};

            // Use the queryJSON to build a query
            const query = makeQuery(queryJSON);

            // Check any intermediate values
            console.log('query', query.toQuery());

            // Perform the query against the DB
            query.select()
                .then((result) => {
                    console.log(result);

                    result.should.be.an.Array().with.lengthOf(4);

                    // Check we get the right data
                    // result.should.do.something;

                    done();
                })
                .catch(done);
        });

        it.only('can match array in (multiple values with x, y and xy)', function (done) {
            const queryJSON = {'tags.id': {$in: [1, 2]}};

            // Use the queryJSON to build a query
            const query = makeQuery(queryJSON);

            // Check any intermediate values
            console.log('query', query.toQuery());

            // Perform the query against the DB
            query.select()
                .then((result) => {
                    console.log(result);

                    result.should.be.an.Array().with.lengthOf(5);

                    // Check we get the right data
                    // result.should.do.something;

                    done();
                })
                .catch(done);
        });
    });
});
