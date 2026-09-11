package main
type Lot struct {Id,Sku string;Available,Expires,Price int}
type Piece struct {Index,Qty int}
type Order struct {Status string;Allocation []Piece;Expires,Amount int}
func catalog(rows []any)[]Lot{out:=[]Lot{};for _,row:=range rows{r:=row.([]any);out=append(out,Lot{r[0].(string),r[1].(string),int(r[2].(float64)),int(r[3].(float64)),int(r[4].(float64))})};return out}
