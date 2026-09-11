package main
func remember(c map[string][]any,k string,r []any){c[k]=append([]any{},r...)}
func recalled(c map[string][]any,k string)[]any{return append([]any{},c[k]...)}
