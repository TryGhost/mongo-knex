const _ = require('lodash');
const Promise = require('bluebird');

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
describe.only('Integration', function () {
    before(function () {
        return utils.db.schema.down(knex)
            .then(() => utils.db.schema.up(knex))
            .then(() => {
                const base = require('./fixtures/base');
                return Promise.each(flatten(base), op => knex(op.table).insert(op.entry));
            });
    });

    after(function () {
        if (_.includes(process.argv, '--skip-teardown')) {
            return knex.destroy();
        }

        return utils.db.schema
            .down(knex)
            .then(() => knex.destroy());
    });

    describe('One-to-Many Joins', function () {
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

    describe('Many-to-Many Joins: Simple Cases', function () {
        beforeEach(function () {
            console.log('this', _.kebabCase(_.deburr(this.currentTest.parent.title)));
            // Before each test, we load data specific to this suite of tests
            const localData = {
                posts_tags: [
                    {post_id: 1, tag_id: 1},
                    {post_id: 2, tag_id: 2},
                    {post_id: 3, tag_id: 3},
                    {post_id: 4, tag_id: 1},
                    {post_id: 4, tag_id: 2},
                    {post_id: 5, tag_id: 1},
                    {post_id: 6, tag_id: 1},
                    {post_id: 6, tag_id: 2}
                ]
            };

            return Promise.each(flatten(localData), op => knex(op.table).insert(op.entry));
        });

        afterEach(function () {
            // After each test, we unload any data specific to this suite of tests
            //return knex('posts_tags').truncate();
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
