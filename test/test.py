# haimtran 03 MAR 2023 
# connect to redshift and query 

import redshift_connector
import json

with open("./config.json", "r") as file:
    config = json.load(file)
    # print(config)

conn = redshift_connector.connect(
    host=config['host'], 
    port=config['port'], 
    user=config['user'], 
    password=config['password']
)

cusor = conn.cursor()
cusor.execute("select * from region")
result: tuple = cusor.fetchall()
print(result)