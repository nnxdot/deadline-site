package main
func preview(l []Lot,indices []int,qty int)[]Piece{out:=[]Piece{};for _,i:=range indices{take:=min(qty,l[i].Available);if take>0{out=append(out,Piece{i,take});qty-=take};if qty==0{return out}};return nil}
