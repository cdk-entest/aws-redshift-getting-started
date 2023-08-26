# aws immersionday redshift data 
aws s3 cp 's3://redshift-immersionday-labs/data/supplier/supplier.json' s3://cdk-entest-videos/redshift-immersionday-labs/data/supplier/supplier.json 
aws s3 cp 's3://redshift-immersionday-labs/data/region/region.tbl.lzo' s3://cdk-entest-videos/redshift-immersionday-labs/data/region/region.tbl
aws s3 cp 's3://redshift-immersionday-labs/data/partsupp/' s3://cdk-entest-videos/redshift-immersionday-labs/data/partsupp/  --copy-props none --recursive 
aws s3 cp 's3://redshift-immersionday-labs/data/customer/' s3://cdk-entest-videos/redshift-immersionday-labs/data/customer/ --copy-props none --recursive 
aws s3 cp 's3://redshift-immersionday-labs/data/orders/' s3://cdk-entest-videos/redshift-immersionday-labs/data/orders/ --copy-props none --recursive 
aws s3 cp 's3://redshift-immersionday-labs/data/part/' s3://cdk-entest-videos/redshift-immersionday-labs/data/part/ --copy-props none --recursive 
aws s3 cp 's3://redshift-immersionday-labs/data/lineitem-part/' s3://cdk-entest-videos/redshift-immersionday-labs/data/lineitem-part/ --copy-props none --recursive 
aws s3 sync 's3://redshift-immersionday-labs/data/' s3://cdk-entest-videos/redshift-immersionday-labs/data/ --copy-props none --recursive

# packt-redshift-cookbook data 
aws s3 cp s3://packt-redshift-cookbook/ s3://cdk-entest-videos/packt-redshift-cookbook/  --copy-props none --recursive