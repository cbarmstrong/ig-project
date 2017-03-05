#!/bin/sh

rm FTSE_100_Constituent_history.pdf
cd $( dirname $0 )
/usr/bin/wget http://www.ftse.com/products/downloads/FTSE_100_Constituent_history.pdf
/usr/bin/pdftotext FTSE_100_Constituent_history.pdf
grep -v "^$" FTSE_100_Constituent_history.txt 
sed -i "s/Worldpay Group/Worldpay Limited/g" FTSE_100_Constituent_history.txt
sed -i "s/TUI Travel/TUI AG/g" FTSE_100_Constituent_history.txt
sed -i "s/HSBC Hldgs/HSBC Holdings/g" FTSE_100_Constituent_history.txt 
echo "Search for Eurasian Natural Resources and concatenate Corp on the end..."
read x
vi FTSE_100_Constituent_history.txt
sed -i "s/Eurasian Natural Resources Corporation/Eurasia Mining/g" FTSE_100_Constituent_history.txt 
sed -i "s/Kazakhmys/KAZ Minerals/g" FTSE_100_Constituent_history.txt 
echo "Execute curl -X DELETE localhost:54321/index/do_history and curl localhost:54321/index/do_history"
echo "Then restart ig_app"
