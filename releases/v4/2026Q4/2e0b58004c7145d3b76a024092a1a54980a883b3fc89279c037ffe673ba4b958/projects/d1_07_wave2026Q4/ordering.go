package main
import "sort"
func ordered(l []Lot,indices []int)[]int{sort.Slice(indices,func(i,j int)bool{a,b:=l[indices[i]],l[indices[j]];return a.Expires<b.Expires||(a.Expires==b.Expires&&a.Id<b.Id)});return indices}
