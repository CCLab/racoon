import csv
import pymongo
import getpass
import os


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
    magic_nr = 10000
    parts_nr = (len(data_bulk) / magic_nr) + 1
    for i in range(parts_nr):
        if i < parts_nr - 1:
            data_bulk_part = data_bulk[i*magic_nr:(i+1)*magic_nr]
        else:
            data_bulk_part = data_bulk[i*magic_nr:]
        collect.insert(data_bulk_part)
    return collect.find().count()


def prepare_data(csv_file):
    header = []
    prepared_data = []
    for i, row in enumerate(csv_file):
        if i == 0:
            continue
        else:
            prepared_row = {}
            prepared_row = {
                "wojewodztwo": row[0],
                "powiat": row[1],
                "gmina": row[2],
                "miejscowosc": row[3],
                "okr_ob": row[4],
                "okr_zes": row[5],
                "l_ob": row[6],
                "mater": row[7],
                "datowanie_ob": row[8],
                "akt_nr_rej": row[9],
                "ulica": row[10]
            }
        prepared_data.append(prepared_row)
    return prepared_data


if __name__ == '__main__':
    conn_host = '91.227.40.36'
    conn_port = 8000
    # TODO: create db/collection name
    conn_db = 'racoon_db'
    coll_name = 'racoon_data'

    filenames = os.listdir( '.' )

    # connect to db
    try:
        connection = pymongo.Connection(conn_host, conn_port)
        db = connection[conn_db]
        print '...connected to the database', db
    except Exception as e:
        print 'Unable to connect to the mongodb database:\n %s\n' % e
        exit()

    data_to_insert = []
    for filename in filenames:
        if 'tsv' in filename:
            try:
                file = open(filename, 'rb')
            except IOError:
                exit('Unable to open file %s' % filename)

            csv_file = csv.reader(file, delimiter='\t', quotechar='"')
            data_to_insert.extend(prepare_data(csv_file))

    print 'Data prepared to insert.'

    print 'Inserted rows: ', db_insert_data(data_to_insert, db, coll_name)

    print 'Success'

