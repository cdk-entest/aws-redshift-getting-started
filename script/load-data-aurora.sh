export host=
export password=
export user=admin
mysql --host=$host --user=$user --password=$password
mysql --host=$host --user=$user --password=$password -f < aurora-tickit-db.sql