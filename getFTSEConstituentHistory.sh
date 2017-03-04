#!/bin/sh

rm FTSE_100_Constituent_history.pdf
cd $( dirname $0 )
/usr/bin/wget http://www.ftse.com/products/downloads/FTSE_100_Constituent_history.pdf
/usr/bin/pdftotext FTSE_100_Constituent_history.pdf
grep -v "^$" FTSE_100_Constituent_history.txt 
