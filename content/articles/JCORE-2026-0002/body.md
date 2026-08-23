# Introduction

This demonstration article proposes a fictional open benchmark protocol for
comparing language models across reproducibility-focused tasks. The authors
are fictional demonstration contributors.

## Protocol

Each benchmark run records the exact model version, prompt template, sampling
parameters, and software environment. The protocol rejects submissions without
this metadata.

![Figure 1: Demonstration benchmark scores across three task groups.](/figures/JCORE-2026-0002/figure-1.svg)

## Results

Table 1 summarizes the fictional scores.

| Task group | Score | Variance |
| --- | ---: | ---: |
| Reasoning | 82.4 | 1.2 |
| Code | 76.9 | 2.0 |
| Knowledge | 88.1 | 0.8 |

## Reproducibility Checklist

```text
[x] Model version recorded
[x] Sampling parameters recorded
[x] Software environment recorded
[x] Raw outputs archived
```

## Conclusion

The protocol provides a credible demonstration of open evaluation practices.

## References

1. Liang, P. et al. Holistic evaluation of language models. *TMLR* (2023).
2. Dodge, J. et al. Documenting large webtext corpora. *Workshop on Web as Corpus* (2021).

[^1]: Demonstration footnote: this benchmark is fictional and not a real evaluation.
