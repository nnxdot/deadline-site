package main
import "strings"
func normalize(s string)string{return strings.ToUpper(strings.Trim(s," "))}
func literal(s string)string{return s}
