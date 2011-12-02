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
    magic_nr = 10000
    parts_nr = (len(data_bulk) / magic_nr) + 1
    for i in range(parts_nr):
        if i < parts_nr - 1:
            data_bulk_part = data_bulk[i*magic_nr:(i+1)*magic_nr]
        else:
            data_bulk_part = data_bulk[i*magic_nr:]
        collect.insert(data_bulk_part)
    return collect.find().count()


def get_all_wojewodztwa(db, coll_name):
    collect = db[coll_name]
    all_rows = collect.find()

    wojewodztwa = {}
    result = []

    for row in all_rows:
        woj_name = row['wojewodztwo']
        if woj_name not in wojewodztwa:
            wojewodztwa[woj_name] = 1
        else:
            wojewodztwa[woj_name] += 1

    result = [(name, count) for name, count in wojewodztwa.iteritems()]

    return result


def get_all_powiaty(db, coll_name, woj_name):
    collect = db[coll_name]
    woj_rows = collect.find({'wojewodztwo': woj_name})

    powiaty = {}
    result = []

    for row in woj_rows:
        pow_name = row['powiat']
        if pow_name not in powiaty:
            powiaty[pow_name] = 1
        else:
            powiaty[pow_name] += 1

    result = [(name, count) for name, count in powiaty.iteritems()]

    return result


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
    conn_host = '91.227.41.101'
    conn_port = 8000
    user = '$$$$'
    password = '$$$$'
    conn_db = 'racoon_db'
    coll_name = 'racoon_data'
    meta_coll_name = 'racoon_meta'

    # connect to db
    try:
        connection = pymongo.Connection(conn_host, conn_port)
        db = connection[conn_db]
        print '...connected to the database', db
    except Exception as e:
        print 'Unable to connect to the mongodb database:\n %s\n' % e
        exit()
        
    if db.authenticate(user, password) != 1:
        exit('Not authenticated!')
        
    meta_data = []
    wojewodztwa = get_all_wojewodztwa(db, coll_name)
    for wojewodztwo_pair in wojewodztwa:
        woj_name, woj_count = wojewodztwo_pair
        woj_obj = {
            'name': woj_name,
            'count': woj_count,
            'edited': 0,
            'powiats': []
        }
        powiaty = get_all_powiaty(db, coll_name, woj_name)
        for powiat_pair in powiaty:
            pow_name, pow_count = powiat_pair
            pow_obj = {
                'name': pow_name,
                'count': pow_count,
                'edited': 0
            }
            woj_obj['powiats'].append(pow_obj)

        meta_data.append(woj_obj)

    db_insert_data(meta_data, db, meta_coll_name)

    print 'Success'

