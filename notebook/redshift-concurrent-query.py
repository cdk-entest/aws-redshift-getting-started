# haimtran 28/07/2023
# send many queries to Redshift

import os
import redshift_connector
import pandas as pd
from multiprocessing import Process

def run_query():
    """
    """
    # create a connection
    conn = redshift_connector.connect(
     host='hello.392194582387.ap-southeast-1.redshift-serverless.amazonaws.com',
     database='dev',
     port=5439,
     user='admin',
     password='Admin2023')
    # create cursor
    cursor = conn.cursor()
    # query
    query= """
    select c_name, sum(o_totalprice) as total_purchase from (
    select c_name, o_totalprice from customer, orders
    where customer.c_custkey = orders.o_custkey
    ) group by c_name order by total_purchase desc limit 10;
    """
    # set cache result off
    cursor.execute("""
    SET enable_result_cache_for_session TO off;
    """)
    # run query
    cursor.execute(query)
    # return data frame
    df: pd.DataFrame = cursor.fetch_dataframe()
    # print result
    print("thread {} \n".format(os.getpid()))
    print(df.head())

if __name__=="__main__":
  for k in range(100):
     Process(target=run_query).start()