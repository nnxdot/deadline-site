package main
func change(l []Lot,a []Piece,sign int){for _,p:=range a{l[p.Index].Available+=sign*p.Qty}}
