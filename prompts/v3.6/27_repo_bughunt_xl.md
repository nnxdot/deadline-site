# 27_repo_bughunt_xl

Below is the COMPLETE source of a generated project (42 files).
Its entry point is `pkg.main.process(xs)`. Every function carries a
docstring stating exactly what it is intended to do. Exactly ONE
function on the process() call path has a body that does NOT match
its docstring; the observed process() behavior therefore deviates
from intended. Reachability matters: judge functions by whether the
pipeline actually executes them.

Intended behavior (input -> output):

    [182, 375, 953, 446, 493, 30, 181, 94]  ->  [184, 812, 608, 739, 288, 868, 496]
    [115, 582, 901, 429, 670, 4]  ->  [654, 96, 10, 148, 645, 783]
    [833, 416, 521]  ->  [805, 606, 917, 409]
    [785, 442, 819, 782, 46, 521, 330]  ->  [100, 917, 902, 340, 588, 807]
    [256, 411, 170, 140, 319, 537, 945, 196]  ->  [714, 872, 971, 322, 618, 746, 280]
    [277, 222, 818, 613, 181, 131]  ->  [183, 173, 812, 754, 783, 1]
    [751, 824, 385, 856, 444]  ->  [875, 556, 732, 79, 687]
    [928, 536, 759]  ->  [637, 819, 492, 73]

Find the deviant function and submit a corrected version of its
ENTIRE module file. Your submission MUST begin with exactly:

    # MODULE: pkg/mXX.py

(the path of the module you are fixing) followed by the full fixed
module source. Fixing the wrong module keeps the bug and fails.
One blind attempt, Python 3 standard library only.

---

### pkg/__init__.py
```python
```

### pkg/m01.py
```python
"""Generated pipeline module."""


def f_nene(xs):
    """Stage 1: Swap each adjacent pair: (0,1), (2,3), and so on. Then hand the result on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    from pkg.m11 import f_zolo
    return f_zolo(ys)


def f_tagu(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys


def f_tane(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys
```

### pkg/m02.py
```python
"""Generated pipeline module."""


def f_sawy(xs):
    """Rotate the list left by 21 positions."""
    k = 21 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys


def f_vesa(xs):
    """Rotate the list left by 5 positions."""
    k = 5 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys
```

### pkg/m03.py
```python
"""Generated pipeline module."""


def f_milo(xs):
    """Map every value x to (x * 38 + 30) mod 997."""
    ys = [(x * 38 + 30) % 997 for x in xs]
    return ys


def f_deru(xs):
    """Rotate the list left by 29 positions."""
    k = 29 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys
```

### pkg/m04.py
```python
"""Generated pipeline module."""


def f_deta(xs):
    """Remove every 3th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 3 != 0]
    return ys


def f_delo(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys
```

### pkg/m05.py
```python
"""Generated pipeline module."""


def f_fosa(xs):
    """Remove every 4th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 4 != 0]
    return ys


def f_pimi(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys
```

### pkg/m06.py
```python
"""Generated pipeline module."""


def f_lode(xs):
    """Map every value x to (x * 5 + 7) mod 997."""
    ys = [(x * 5 + 7) % 997 for x in xs]
    return ys


def f_vene(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys
```

### pkg/m07.py
```python
"""Generated pipeline module."""


def f_demi(xs):
    """Stage 6: Multiply every value by 38, modulo 997. Then hand the result on."""
    ys = [(x * 38) % 997 for x in xs]
    from pkg.m30 import f_neta
    return f_neta(ys)


def f_zowy(xs):
    """Stage 11: Multiply every value by 48, modulo 997. Then hand the result on."""
    ys = [(x * 48) % 997 for x in xs]
    from pkg.m10 import f_ruta
    return f_ruta(ys)


def f_mide(xs):
    """Remove every 4th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 4 != 0]
    return ys


def f_fowy(xs):
    """Remove every 4th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 4 != 0]
    return ys
```

### pkg/m08.py
```python
"""Generated pipeline module."""


def f_wypi(xs):
    """Rotate the list left by 53 positions."""
    k = 53 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys


def f_lolo(xs):
    """Add 58 to every value, modulo 997."""
    ys = [(x + 58) % 997 for x in xs]
    return ys
```

### pkg/m09.py
```python
"""Generated pipeline module."""


def f_mita(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys
```

### pkg/m10.py
```python
"""Generated pipeline module."""


def f_ruta(xs):
    """Stage 12: Add 24 to every value, modulo 997. Then hand the result on."""
    ys = [(x + 25) % 997 for x in xs]
    from pkg.m15 import f_desa
    return f_desa(ys)


def f_zoka(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys


def f_kapi(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys
```

### pkg/m11.py
```python
"""Generated pipeline module."""


def f_zolo(xs):
    """Stage 2: Multiply every value by 40, modulo 997. Then hand the result on."""
    ys = [(x * 40) % 997 for x in xs]
    from pkg.m11 import f_kawy
    return f_kawy(ys)


def f_kawy(xs):
    """Stage 3: Map every value x to (x * 11 + 33) mod 997. Then hand the result on."""
    ys = [(x * 11 + 33) % 997 for x in xs]
    from pkg.m40 import f_guwy
    return f_guwy(ys)


def f_veve(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys


def f_wyka(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m12.py
```python
"""Generated pipeline module."""


def f_fogu(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys


def f_wyru(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys
```

### pkg/m13.py
```python
"""Generated pipeline module."""


def f_saru(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys


def f_neka(xs):
    """Remove every 2th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 2 != 0]
    return ys


def f_negu(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [(sum(xs) + 1) % 997]
    return ys
```

### pkg/m14.py
```python
"""Generated pipeline module."""


def f_gufo(xs):
    """Multiply every value by 47, modulo 997."""
    ys = [(x * 47) % 997 for x in xs]
    return ys


def f_gumi(xs):
    """Multiply every value by 9, modulo 997."""
    ys = [(x * 9) % 997 for x in xs]
    return ys
```

### pkg/m15.py
```python
"""Generated pipeline module."""


def f_desa(xs):
    """Stage 13: Swap each adjacent pair: (0,1), (2,3), and so on. Then hand the result on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    from pkg.m23 import f_talo
    return f_talo(ys)


def f_kasa(xs):
    """Multiply every value by 23, modulo 997."""
    ys = [(x * 23) % 997 for x in xs]
    return ys


def f_rugu(xs):
    """Multiply every value by 46, modulo 997."""
    ys = [(x * 46) % 997 for x in xs]
    return ys
```

### pkg/m16.py
```python
"""Generated pipeline module."""


def f_ruve(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m17.py
```python
"""Generated pipeline module."""


def f_mimi(xs):
    """Map every value x to (x * 19 + 10) mod 997."""
    ys = [(x * 19 + 10) % 997 for x in xs]
    return ys
```

### pkg/m18.py
```python
"""Generated pipeline module."""


def f_salo(xs):
    """Stage 16 (final): Remove every 3th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 3 != 0]
    return ys


def f_pide(xs):
    """Multiply every value by 2, modulo 997."""
    ys = [(x * 2) % 997 for x in xs]
    return ys


def f_fove(xs):
    """Add 20 to every value, modulo 997."""
    ys = [(x + 20) % 997 for x in xs]
    return ys
```

### pkg/m19.py
```python
"""Generated pipeline module."""


def f_logu(xs):
    """Stage 10: Swap each adjacent pair: (0,1), (2,3), and so on. Then hand the result on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    from pkg.m07 import f_zowy
    return f_zowy(ys)


def f_tafo(xs):
    """Map every value x to (x * 36 + 9) mod 997."""
    ys = [(x * 36 + 9) % 997 for x in xs]
    return ys


def f_vegu(xs):
    """Rotate the list left by 31 positions."""
    k = 31 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys
```

### pkg/m20.py
```python
"""Generated pipeline module."""


def f_neru(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m21.py
```python
"""Generated pipeline module."""


def f_migu(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys
```

### pkg/m22.py
```python
"""Generated pipeline module."""


def f_wyzo(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys


def f_nepi(xs):
    """Multiply every value by 51, modulo 997."""
    ys = [(x * 51) % 997 for x in xs]
    return ys
```

### pkg/m23.py
```python
"""Generated pipeline module."""


def f_talo(xs):
    """Stage 14: Map every value x to (x * 39 + 30) mod 997. Then hand the result on."""
    ys = [(x * 39 + 30) % 997 for x in xs]
    from pkg.m23 import f_wyta
    return f_wyta(ys)


def f_wyta(xs):
    """Stage 15: Append the sum of all values, modulo 997. Then hand the result on."""
    ys = xs + [sum(xs) % 997]
    from pkg.m18 import f_salo
    return f_salo(ys)


def f_losa(xs):
    """Multiply every value by 2, modulo 997."""
    ys = [(x * 2) % 997 for x in xs]
    return ys
```

### pkg/m24.py
```python
"""Generated pipeline module."""


def f_kalo(xs):
    """Rotate the list left by 46 positions."""
    k = 46 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys


def f_piwy(xs):
    """Rotate the list left by 24 positions."""
    k = 24 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys
```

### pkg/m25.py
```python
"""Generated pipeline module."""


def f_zode(xs):
    """Remove every 3th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 3 != 0]
    return ys


def f_lofo(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m26.py
```python
"""Generated pipeline module."""


def f_miru(xs):
    """Remove every 4th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 4 != 0]
    return ys
```

### pkg/m27.py
```python
"""Generated pipeline module."""


def f_nesa(xs):
    """Stage 8: Multiply every value by 42, modulo 997. Then hand the result on."""
    ys = [(x * 42) % 997 for x in xs]
    from pkg.m34 import f_pizo
    return f_pizo(ys)


def f_ruwy(xs):
    """Remove every 4th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 4 != 0]
    return ys


def f_newy(xs):
    """Rotate the list left by 8 positions."""
    k = 8 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys
```

### pkg/m28.py
```python
"""Generated pipeline module."""


def f_karu(xs):
    """Multiply every value by 52, modulo 997."""
    ys = [(x * 52) % 997 for x in xs]
    return ys
```

### pkg/m29.py
```python
"""Generated pipeline module."""


def f_mifo(xs):
    """Add 38 to every value, modulo 997."""
    ys = [(x + 38) % 997 for x in xs]
    return ys
```

### pkg/m30.py
```python
"""Generated pipeline module."""


def f_neta(xs):
    """Stage 7: Rotate the list left by 51 positions. Then hand the result on."""
    k = 51 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    from pkg.m27 import f_nesa
    return f_nesa(ys)


def f_guzo(xs):
    """Multiply every value by 34, modulo 997."""
    ys = [(x * 34) % 997 for x in xs]
    return ys
```

### pkg/m31.py
```python
"""Generated pipeline module."""


def f_veru(xs):
    """Multiply every value by 43, modulo 997."""
    ys = [(x * 43) % 997 for x in xs]
    return ys


def f_tazo(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys
```

### pkg/m32.py
```python
"""Generated pipeline module."""


def f_sade(xs):
    """Add 34 to every value, modulo 997."""
    ys = [(x + 34) % 997 for x in xs]
    return ys


def f_zopi(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m33.py
```python
"""Generated pipeline module."""


def f_lone(xs):
    """Map every value x to (x * 4 + 2) mod 997."""
    ys = [(x * 4 + 2) % 997 for x in xs]
    return ys


def f_vewy(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m34.py
```python
"""Generated pipeline module."""


def f_pizo(xs):
    """Stage 9: Add 39 to every value, modulo 997. Then hand the result on."""
    ys = [(x + 39) % 997 for x in xs]
    from pkg.m19 import f_logu
    return f_logu(ys)


def f_tade(xs):
    """Remove every 3th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 3 != 0]
    return ys


def f_ruka(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m35.py
```python
"""Generated pipeline module."""


def f_fone(xs):
    """Add 10 to every value, modulo 997."""
    ys = [(x + 10) % 997 for x in xs]
    return ys
```

### pkg/m36.py
```python
"""Generated pipeline module."""


def f_pilo(xs):
    """Stage 5: Add 48 to every value, modulo 997. Then hand the result on."""
    ys = [(x + 48) % 997 for x in xs]
    from pkg.m07 import f_demi
    return f_demi(ys)


def f_mipi(xs):
    """Multiply every value by 44, modulo 997."""
    ys = [(x * 44) % 997 for x in xs]
    return ys


def f_vezo(xs):
    """Remove every 4th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 4 != 0]
    return ys
```

### pkg/m37.py
```python
"""Generated pipeline module."""


def f_nemi(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys


def f_wygu(xs):
    """Multiply every value by 40, modulo 997."""
    ys = [(x * 40) % 997 for x in xs]
    return ys
```

### pkg/m38.py
```python
"""Generated pipeline module."""


def f_zoru(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys
```

### pkg/m39.py
```python
"""Generated pipeline module."""


def f_gugu(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys
```

### pkg/m40.py
```python
"""Generated pipeline module."""


def f_guwy(xs):
    """Stage 4: Append the sum of all values, modulo 997. Then hand the result on."""
    ys = xs + [sum(xs) % 997]
    from pkg.m36 import f_pilo
    return f_pilo(ys)


def f_saka(xs):
    """Add 4 to every value, modulo 997."""
    ys = [(x + 4) % 997 for x in xs]
    return ys


def f_ruru(xs):
    """Rotate the list left by 2 positions."""
    k = 2 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys
```

### pkg/main.py
```python
"""Entry point."""


def process(xs):
    """Run the full pipeline on a list of ints."""
    from pkg.m01 import f_nene
    return f_nene(list(xs))
```

canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a
