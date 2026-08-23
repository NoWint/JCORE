# Introduction

This demonstration replication study checks whether a compact Transformer
implementation reproduces the attention behavior described in the original
literature. All content in this article is fictional demonstration material.

## Background

Scaled dot-product attention is the central operation in Transformer
architectures. Reproducing it requires care with normalization, masking, and
numerical precision.

## Methods

We implemented the standard attention equation and compared output matrices
against a reference implementation.

### Attention Equation

$$
\text{Attention}(Q, K, V) = \mathrm{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right) V
$$

![Figure 1: Agreement between the reproduction and reference attention outputs.](/figures/JCORE-2026-0001/figure-1.svg)

Table 1 reports the measured agreement metrics.

| Metric | Reproduction | Reference |
| --- | ---: | ---: |
| Max absolute error | 4.2e-7 | 0.0 |
| Mean absolute error | 1.1e-8 | 0.0 |
| Correlation | 1.000 | 1.000 |

## Code

```python
def attention(query, key, value, scale):
    scores = (query @ key.T) * scale
    weights = softmax(scores, axis=-1)
    return weights @ value
```

## Conclusion

The compact implementation reproduces the reference behavior within numerical
tolerance.

## References

1. Vaswani, A. et al. Attention is all you need. *Advances in Neural Information Processing Systems* 30 (2017).
2. Henderson, P. et al. The reproducibility crisis in machine learning. *arXiv* (2018).

[^1]: Demonstration footnote: this article does not represent real peer-reviewed research.
