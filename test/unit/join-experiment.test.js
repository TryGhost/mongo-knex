require('../utils');
const knex = require('knex')({client: 'mysql'});
const convertor = require('../../lib/convertor');

/* eslint-disable no-console*/

const makeQuery = query => convertor(knex('posts'), query);

describe.skip('Joins', function () {
    describe('IN with array of objects', function () {
        it('can match array in (single value)', function () {
            const query = makeQuery({'tags.slug': {$in: ['video']}});

            console.log(query);

            //.should.eql('select * from `posts` where `tags`.`slug` in (\'video\')');
        });

        // it('can match array in (multiple values)', function () {
        //     runQuery({'tags.slug': {$in: ['video', 'audio']}})
        //         .should.eql('select * from `posts` where `tags`.`slug` in (\'video\', \'audio\')');
        // });
        //
        // it('can match array NOT in (single value)', function () {
        //     runQuery({'tags.slug': {$nin: ['video']}})
        //         .should.eql('select * from `posts` where `tags`.`slug` not in (\'video\')');
        // });
        //
        // it('can match array NOT in (multiple values)', function () {
        //     runQuery({'tags.slug': {$nin: ['video', 'audio']}})
        //         .should.eql('select * from `posts` where `tags`.`slug` not in (\'video\', \'audio\')');
        // });
    });
});

describe.skip('testing concepts', function () {
    it('hmmmm', function () {
        const knexQB = knex('users').join('posts', 'users.id', 'posts.author_id');
        const query = convertor(knexQB, {id: 3});
        console.log(query);

        console.log(query.toQuery());
    });
});
