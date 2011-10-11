import csv
import pymongo
import getpass


def db_insert_data(data_bulk, db, collname):
    """Inserts data to db. Data is divided to smaller parts which are then
    uploaded to db.

    Arguments:
    data_bulk -- list of rows to insert to database
    db -- object representing database
    collname -- name of collection that data should be inserted into
    """
    collect = db[collname]
    collect.remove()
    # TODO: check if there is better way to solve the problem
    magic_nr = 10000
    parts_nr = (len(data_bulk) / magic_nr) + 1
    for i in range(parts_nr):
        if i < parts_nr - 1:
            data_bulk_part = data_bulk[i*magic_nr:(i+1)*magic_nr]
        else:
            data_bulk_part = data_bulk[i*magic_nr:]
        collect.insert(data_bulk_part)
    return collect.find().count()


def prepare_data():
    return [
        {'user': 'Jerzy', 'pass': 'demezer', 'rows': []},
        {'user': 'Bartek', 'pass': 'stalewski', 'rows': []},
        {'user': 'trzewiczek', 'pass': 'misia', 'rows': []},
        {'user': 'test', 'pass': 'test', 'rows': []}
    ]


if __name__ == '__main__':
    conn_host = '91.227.40.36'
    conn_port = 8000
    conn_db = 'racoon_db'
    coll_name = 'racoon_users'

    filename = 'podlaskie - rejestr_csv.csv'

    # connect to db
    try:
        connection = pymongo.Connection(conn_host, conn_port)
        db = connection[conn_db]
        print '...connected to the database', db
    except Exception as e:
        print 'Unable to connect to the mongodb database:\n %s\n' % e
        exit()

    data_to_insert = prepare_data()

    print 'Data prepared to insert.'

    print 'Inserted rows: ', db_insert_data(data_to_insert, db, coll_name)

    print 'Success'

