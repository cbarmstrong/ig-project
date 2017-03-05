#!/bin/sh

rm index.html\?indexdetails\=UKX
cd $( dirname $0 )
/usr/bin/wget http://www.ftse.com/analytics/factsheets/Home/DownloadConstituentsWeights/\?indexdetails\=UKX
/usr/bin/pdftotext index.html\?indexdetails\=UKX
grep -v "^$" index.html\?indexdetails\=UKX.txt | grep -v UNITED | grep -v KINGDOM | grep -v \(\%\) | grep -v "Index weight" | grep -v "Country" > FTSE100.list.3

top=$( grep -n Constituent FTSE100.list.3 | head -1 | cut -d: -f1 )
length=$( wc -l FTSE100.list.3 | cut -d" " -f1 )
tail -$( expr $length - $top ) FTSE100.list.3 > FTSE100.list.2 && rm FTSE100.list.3
grep -v "Constituent" FTSE100.list.2 | grep -v "Source: "  > FTSE100.list.1 && rm FTSE100.list.2
base=$( grep -n Explanation FTSE100.list.1 | head -1 | cut -d: -f1 )
head -$( expr $base - 3 ) FTSE100.list.1 | sort > FTSE100.list && rm FTSE100.list.1
sed -i "s/Worldpay Group/Worldpay Limited/g" FTSE100.list
sed -i "s/TUI Travel/TUI AG/g" FTSE100.list
sed -i "s/HSBC Hldgs/HSBC Holdings/g" FTSE100.list
sed -i "s/Eurasian Natural Resources Corporation/Eurasia Mining/g" FTSE100.list
sed -i "s/Kazakhmys/KAZ Minerals/g" FTSE100.list

