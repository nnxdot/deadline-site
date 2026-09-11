package main
func eligible(l Lot,s string,n int)bool{return l.Sku==s&&l.Expires>n&&l.Available>0}
func inclusive(l Lot,s string,n int)bool{return l.Sku==s&&l.Expires>=n&&l.Available>0}
