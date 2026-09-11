# 26_repo_bughunt

Below is the COMPLETE source of a generated project (24 files).
Its entry point is `pkg.main.process(xs)`. Every function carries a
docstring stating exactly what it is intended to do. Exactly ONE
function on the process() call path has a body that does NOT match
its docstring; the observed process() behavior therefore deviates
from intended. 
Intended behavior (input -> output):

    [952, 401, 788, 399, 243, 502]  ->  [655, 72, 645]
    [722, 689, 303, 207, 575, 947, 467]  ->  [332, 333, 583]
    [489, 367, 96, 387, 558, 176]  ->  [632, 315, 865]
    [908, 300, 390, 720, 77]  ->  [466, 310, 694]
    [284, 991, 96, 890, 184, 252]  ->  [632, 900, 453]
    [475, 382, 551, 902, 429]  ->  [565, 353, 836]
    [819, 594, 353, 198, 777, 159]  ->  [982, 607, 510]
    [705, 843, 238, 821]  ->  [484, 669, 74]

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


def f_depi(xs):
    """Remove every 4th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 4 != 0]
    return ys


def f_sata(xs):
    """Add 45 to every value, modulo 997."""
    ys = [(x + 45) % 997 for x in xs]
    return ys
```

### pkg/m02.py
```python
"""Generated pipeline module."""


def f_kagu(xs):
    """Stage 5: Append the sum of all values, modulo 997. Then hand the result on."""
    ys = xs + [sum(xs) % 997]
    from pkg.m05 import f_saka
    return f_saka(ys)


def f_neka(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys


def f_gumi(xs):
    """Remove every 2th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 2 != 0]
    return ys
```

### pkg/m03.py
```python
"""Generated pipeline module."""


def f_vede(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys


def f_mive(xs):
    """Map every value x to (x * 23 + 33) mod 997."""
    ys = [(x * 23 + 33) % 997 for x in xs]
    return ys
```

### pkg/m04.py
```python
"""Generated pipeline module."""


def f_nene(xs):
    """Multiply every value by 58, modulo 997."""
    ys = [(x * 58) % 997 for x in xs]
    return ys


def f_pide(xs):
    """Add 21 to every value, modulo 997."""
    ys = [(x + 21) % 997 for x in xs]
    return ys
```

### pkg/m05.py
```python
"""Generated pipeline module."""


def f_mika(xs):
    """Stage 1: Append the sum of all values, modulo 997. Then hand the result on."""
    ys = xs + [sum(xs) % 997]
    from pkg.m12 import f_fone
    return f_fone(ys)


def f_saka(xs):
    """Stage 6: Add 23 to every value, modulo 997. Then hand the result on."""
    ys = [(x + 23) % 997 for x in xs]
    from pkg.m11 import f_miwy
    return f_miwy(ys)


def f_deve(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys
```

### pkg/m06.py
```python
"""Generated pipeline module."""


def f_fofo(xs):
    """Map every value x to (x * 21 + 15) mod 997."""
    ys = [(x * 21 + 15) % 997 for x in xs]
    return ys


def f_zogu(xs):
    """Remove every 2th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 2 != 0]
    return ys
```

### pkg/m07.py
```python
"""Generated pipeline module."""


def f_pifo(xs):
    """Stage 4: Swap each adjacent pair: (0,1), (2,3), and so on. Then hand the result on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    from pkg.m02 import f_kagu
    return f_kagu(ys)


def f_fode(xs):
    """Stage 10: Append the sum of all values, modulo 997. Then hand the result on."""
    ys = xs + [sum(xs) % 997]
    from pkg.m20 import f_ruve
    return f_ruve(ys)


def f_mifo(xs):
    """Map every value x to (x * 16 + 10) mod 997."""
    ys = [(x * 16 + 10) % 997 for x in xs]
    return ys
```

### pkg/m08.py
```python
"""Generated pipeline module."""


def f_migu(xs):
    """Rotate the list left by 7 positions."""
    k = 7 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys


def f_veta(xs):
    """Remove every 4th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 4 != 0]
    return ys
```

### pkg/m09.py
```python
"""Generated pipeline module."""


def f_desa(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys


def f_rugu(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys
```

### pkg/m10.py
```python
"""Generated pipeline module."""


def f_ruwy(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m11.py
```python
"""Generated pipeline module."""


def f_miwy(xs):
    """Stage 7: Remove every 3th element (1-based). Then hand the result on."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 3 != 0]
    from pkg.m16 import f_zosa
    return f_zosa(ys)


def f_lopi(xs):
    """Remove every 4th element (1-based)."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 4 != 0]
    return ys


def f_mimi(xs):
    """Map every value x to (x * 39 + 9) mod 997."""
    ys = [(x * 39 + 9) % 997 for x in xs]
    return ys
```

### pkg/m12.py
```python
"""Generated pipeline module."""


def f_fone(xs):
    """Stage 2: Remove every 2th element (1-based). Then hand the result on."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 2 != 0]
    from pkg.m15 import f_nelo
    return f_nelo(ys)


def f_lone(xs):
    """Stage 12 (final): Add 46 to every value, modulo 997."""
    ys = [(x + 46) % 997 for x in xs]
    return ys


def f_zopi(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m13.py
```python
"""Generated pipeline module."""


def f_pisa(xs):
    """Multiply every value by 53, modulo 997."""
    ys = [(x * 53) % 997 for x in xs]
    return ys


def f_veka(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys
```

### pkg/m14.py
```python
"""Generated pipeline module."""


def f_wyfo(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m15.py
```python
"""Generated pipeline module."""


def f_nelo(xs):
    """Stage 3: Swap each adjacent pair: (0,1), (2,3), and so on. Then hand the result on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    from pkg.m07 import f_pifo
    return f_pifo(ys)


def f_fota(xs):
    """Rotate the list left by 37 positions."""
    k = 37 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys


def f_kade(xs):
    """Map every value x to (x * 8 + 3) mod 997."""
    ys = [(x * 8 + 3) % 997 for x in xs]
    return ys
```

### pkg/m16.py
```python
"""Generated pipeline module."""


def f_zosa(xs):
    """Stage 8: Swap each adjacent pair: (0,1), (2,3), and so on. Then hand the result on."""
    ys = list(xs)
    for i in range(1, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    from pkg.m19 import f_kane
    return f_kane(ys)


def f_tawy(xs):
    """Rotate the list left by 50 positions."""
    k = 50 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys
```

### pkg/m17.py
```python
"""Generated pipeline module."""


def f_wyta(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys


def f_dezo(xs):
    """Map every value x to (x * 20 + 2) mod 997."""
    ys = [(x * 20 + 2) % 997 for x in xs]
    return ys
```

### pkg/m18.py
```python
"""Generated pipeline module."""


def f_negu(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys


def f_degu(xs):
    """Multiply every value by 49, modulo 997."""
    ys = [(x * 49) % 997 for x in xs]
    return ys
```

### pkg/m19.py
```python
"""Generated pipeline module."""


def f_kane(xs):
    """Stage 9: Remove every 2th element (1-based). Then hand the result on."""
    ys = [x for i, x in enumerate(xs) if (i + 1) % 2 != 0]
    from pkg.m07 import f_fode
    return f_fode(ys)


def f_nepi(xs):
    """Add 56 to every value, modulo 997."""
    ys = [(x + 56) % 997 for x in xs]
    return ys


def f_mide(xs):
    """Add 24 to every value, modulo 997."""
    ys = [(x + 24) % 997 for x in xs]
    return ys
```

### pkg/m20.py
```python
"""Generated pipeline module."""


def f_ruve(xs):
    """Stage 11: Map every value x to (x * 13 + 36) mod 997. Then hand the result on."""
    ys = [(x * 13 + 36) % 997 for x in xs]
    from pkg.m12 import f_lone
    return f_lone(ys)


def f_sasa(xs):
    """Map every value x to (x * 25 + 14) mod 997."""
    ys = [(x * 25 + 14) % 997 for x in xs]
    return ys


def f_wygu(xs):
    """Reverse the list."""
    ys = xs[::-1]
    return ys
```

### pkg/m21.py
```python
"""Generated pipeline module."""


def f_tami(xs):
    """Swap each adjacent pair: (0,1), (2,3), and so on."""
    ys = list(xs)
    for i in range(0, len(ys) - 1, 2):
        ys[i], ys[i + 1] = ys[i + 1], ys[i]
    return ys
```

### pkg/m22.py
```python
"""Generated pipeline module."""


def f_tata(xs):
    """Rotate the list left by 7 positions."""
    k = 7 % len(xs) if xs else 0
    ys = xs[k:] + xs[:k]
    return ys


def f_zofo(xs):
    """Append the sum of all values, modulo 997."""
    ys = xs + [sum(xs) % 997]
    return ys
```

### pkg/main.py
```python
"""Entry point."""


def process(xs):
    """Run the full pipeline on a list of ints."""
    from pkg.m05 import f_mika
    return f_mika(list(xs))
```

canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a
