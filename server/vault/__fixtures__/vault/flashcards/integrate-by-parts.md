---
box: 3
due: 2026-07-21
lapses: 0
created: 2026-06-15
source: spivak-calculus
type: problem
---
Q: Evaluate

$$\int x e^x \, dx$$

A: Integration by parts with $u = x$, $dv = e^x dx$:

$$\int x e^x \, dx = x e^x - \int e^x \, dx = (x - 1)e^x + C$$

Check by differentiating:

```python
import sympy as sp
x = sp.symbols("x")
sp.diff((x - 1) * sp.exp(x), x)  # x*exp(x)
```
