# Abstract

Conservative garbage collection scans the native stack and register state for
machine words that resemble heap pointers. This avoids compiler-maintained root
maps, but the same approximation admits false roots: integers, stale bit
patterns, or address fragments that happen to resolve to heap objects. A false
root can retain an unreachable object, and a false root that reappears
periodically can renew that retention indefinitely under a memoryless
mark-and-sweep policy.

This paper develops **False-Root Aging Theory**, a temporal discipline for
conservative reclamation. The theory separates trace-confirmed marks from
conservative-speculative marks and gives conservative evidence a finite
survival authority. A lease records the first appearance of a candidate root
without refreshing its timestamp on later sightings. A punitive age counts
cycles in which an object has survived without heap-trace confirmation. A true
root is exempt for the cycle in which the trace reaches it, but that exemption
must be renewed by a later trace. The theory has extrinsic and intrinsic
instantiations, with different storage and address-reuse trade-offs.

The paper also introduces Defensive Re-verification Demotion (DRD), which
replaces a single-shot reclamation decision with a defer-then-confirm protocol
at two independent safepoints. The intrinsic mechanism bounds transient and
oscillating false roots but leaves a persistent false root as a known boundary.
A hybrid lease combines intrinsic age with an address-keyed wall-clock lease
and gives the persistent case a finite bound, subject to the ABA hazard of
address reuse. An implementation in a virtual machine reports the predicted
convergence behavior, bounded incremental pauses, and no observed use-after-free
in the tested configurations. The results are conditional on the stated
assumptions; they do not replace precise root maps or an independent security
audit.

## Introduction

A tracing collector solves two related bookkeeping problems: it must identify
the roots from which live objects are reachable, and it must reclaim objects
outside that reachability closure. A precise collector receives a type-aware
description of pointer-bearing registers and stack slots from a compiler or
runtime. A conservative collector instead scans raw machine state and treats
any value that falls inside the managed heap as a possible pointer.

Conservative collection remains attractive for runtimes that cannot require
compiler cooperation. It can be integrated into legacy native systems, avoids
shadow-stack instrumentation, and does not require a complete type map for
every safepoint. The cost is that the conservative root set is an
over-approximation. A stale integer may look like an object address; an old
register value may survive after its logical reference has disappeared; a
fragment of an address may happen to pass the collector's heap filter.

The usual consequence is retention rather than immediate unsafety. A false
root causes an unreachable object to be treated as live for one or more
cycles. The difficult case is an **oscillating false root**. If a stack slot is
reused by a loop, the same candidate address can reappear after the object has
become white. A collector that only asks whether an object was marked in the
current cycle has no memory of the previous sightings. Every reappearance is
therefore interpreted as a new vote for liveness.

This paper argues that the renewal channel can be closed without eliminating
conservative scanning. The proposal is to remember the source and history of a
mark. A heap trace provides stronger evidence than a raw candidate value. A
candidate that has appeared before should not receive a fresh lease merely
because it appears again. Once conservative-only survival has accumulated
enough suspicion, the object should be demoted and allowed to pass through the
runtime's ordinary deferred-reclamation rule.

The contributions are:

1. A formal model of false-root retention that distinguishes current color from
   the source and history of a mark.
2. A lease mechanism that prevents repeated sightings from resetting a
   candidate's first-seen time.
3. A punitive age mechanism that accumulates disappearance evidence across
   cycles while preserving trace-reachable objects.
4. Extrinsic, intrinsic, and hybrid storage strategies, including their
   portability and address-reuse trade-offs.
5. DRD, a two-safepoint confirmation protocol for reducing the effect of a
   transient scanner miss.
6. Convergence bounds and an implementation-oriented account of the
   assumptions under which those bounds apply.

The central claim is deliberately narrower than "conservative collection is
always safe." The claim is that a conservative collector can provide a finite
retention bound for specified classes of false roots, and can preserve
trace-reachable objects, when it satisfies explicit state-observability,
safepoint, allocation, and epoch assumptions.

## Scope and Model

Let `O` be the set of managed heap objects and `R` the root set. An object is
live when it is reachable from a root through zero or more child-pointer
edges. A tracing collector computes this reachability closure and reclaims
objects outside it after the runtime's deferred-reclamation conditions have
been met.

The collector uses the usual tri-color vocabulary:

- **White** means that the object has not been reached in the effective current
  cycle and is a reclamation candidate.
- **Gray** means that the object has been discovered but its children have not
  been fully traced.
- **Black** means that the object and its traced children have been processed.

The color is not enough for the present problem. A gray or black object may
have been reached from an explicit root or from a conservative candidate. The
implementation therefore stores a mark-source bit or equivalent state:

- `T`: the heap trace confirmed the object during the current cycle.
- `C`: the object was reached only through conservative evidence during the
  current cycle.
- `none`: the object was not effectively marked during the current cycle.

The source is a per-cycle property. A trace confirmation in cycle `t` does not
grant lifetime immunity. If the trace does not reach the object in cycle
`t + 1`, lazy epoch semantics make the old state stale and the object becomes
subject to ordinary aging and reclamation.

### Conservative Root Set

The conservative root set is modeled as:

`R = R_exact union R_cons`

where `R_exact` contains explicitly registered roots and `R_cons` contains
values discovered by scanning the thread state. The thread state is:

`Sigma = Stack union Registers`

The theory assumes that the scanner observes the complete `Sigma` at a
safepoint. Under this assumption, a pointer held in a register is treated in
the same way as a pointer-shaped word on the stack. The theory does not infer
type information from the value; it only decides whether the value resolves to
a managed object.

A **false root** is a conservative candidate that does not correspond to a
genuine reference path in the heap graph. A false root can still point to a
valid managed object and therefore can pin that object. The distinction is
semantic, not representational: the collector sees only a candidate address.

### Deferred Reclamation

The theory assumes a monotonically increasing epoch clock `Phi`. An object is
reclaimable only after it is unreachable and its last-touch epoch is sufficiently
old for the runtime's deferred-reclamation rule. In the paper's EBR model:

`Reclaimable(o) implies Phi_current - Phi_touch(o) > 1`

The exact off-by-one presentation depends on whether the allocation cycle is
counted as epoch zero or as the first observation. The important invariant is
that reclamation is delayed beyond the cycle in which a stale mutator reference
could still be in flight.

## Why Pure Color Guarding Is Unbounded

Under pure color guarding, the collector decides liveness from the current
cycle's color alone:

`Alive_t(o) iff Marked_t(o) or ReachableFromHeap_t(o)`

The policy has no cross-cycle memory. Consider an object `o` that is never
reachable from the genuine heap graph, but whose address-shaped value appears in
the conservative root set at epochs `t_0, t_1, ...`. At each `t_i`, the marker
colors `o` gray. If the next appearance occurs before deferred reclamation can
complete, the object receives another current-cycle mark. The collector never
observes a stable reclamation state.

This gives the basic unbounded-survival result:

> Under pure color guarding, an oscillating false root can retain its object for
> an unbounded number of collection cycles.

The result does not depend on a particular stack layout. It follows from the
policy's renewal rule: every reappearance is treated as a fresh observation
with the same authority as the first. A bound therefore requires memory that
distinguishes first appearance from later appearance.

Existing mitigations address adjacent problems but do not provide the
per-candidate bound developed here. Blacklisting can avoid repeatedly scanning
addresses after they have caused harm, but it is reactive and does not give a
finite lifetime for every persistent candidate. Stack-slot erasure depends on
compiler or runtime cooperation and cannot remove a value that remains part of
a live computation. Shadow stacks and precise roots eliminate conservative
false positives, but they change the implementation contract. Generational age
rewards survivors; the present problem requires a mechanism that can punish
unconfirmed survival.

## False-Root Aging Theory

### Aging Axioms

The theory is organized around four axioms.

**Axiom 1: source distinction.** The source of a mark, trace-confirmed or
conservative-speculative, is stored independently of the tri-color state.

**Axiom 2: temporal decay.** An object whose survival rests only on
conservative evidence cannot retain the same confidence forever. Its
conservative authority must decay with time or with accumulated disappearance
evidence.

**Axiom 3: per-cycle true-root exemption.** If the heap trace reaches an object
in cycle `t`, its lease is cleared, its punitive age is reset for that cycle, and
it is not reclaimed in that cycle. The exemption is renewed by a later trace;
it is not a permanent historical label.

**Axiom 4: state completeness.** At each safepoint, the scanner observes the
full thread state `Sigma = Stack union Registers`. This axiom is what lets the
formal model treat a register-resident candidate and a stack-resident candidate
uniformly.

The first three axioms determine the aging behavior. The fourth determines the
scope of the safety argument. If a runtime cannot observe a live reference at
all, no conservative mechanism can protect it using that reference alone.

### Lease Semantics

For a candidate root `r`, define:

`Lease(r) in {ACTIVE, EXPIRED, none}`

When `r` appears for the first time, the collector records a first-seen epoch
`Phi_first(r)`. A later appearance does not update that epoch. The candidate is
accepted while:

`Phi_current - Phi_first(r) <= L`

After the lease term `L` expires, the candidate is ignored by the conservative
marker. If the heap trace reaches the object, the candidate's lease is cleared
because the object has stronger evidence of liveness.

The non-renewal rule is the key step. An oscillating root can reappear, but it
cannot turn each reappearance into a new first sighting. The lease therefore
closes a time-based renewal channel.

### Extrinsic Lease

An extrinsic lease stores the first-seen epoch in a table indexed by candidate
address:

`Lambda_E : Address -> Epoch or none`

This design is attractive for legacy runtimes because it does not alter the
object header. A scan hook can insert a candidate into the table, check its
elapsed time, and suppress it after expiry. A small fixed-capacity table is
often sufficient for the number of candidate roots observed at one safepoint.

The cost is an address-reuse hazard. Suppose object `o` at address `a` is
reclaimed, and a new object `o'` is later allocated at the same address. If the
old lease entry remains, the table may apply `o`'s age to `o'`. The new object
could be ignored before it has received a fair trial. This is the classic ABA
problem: address equality does not imply object identity across reclamation.

### Intrinsic Lease

An intrinsic lease stores the conservative mark state in the object header. The
header carries a mark epoch and a conservative-source bit. A conservative mark
sets the epoch to the current epoch and the bit to `1`. A trace mark sets the
epoch to the current epoch and clears the bit.

The lease is then bound to object identity. When an object is reclaimed, its
lease state disappears with it; a new object at the same address starts with
fresh state. The trade-off is a header bit, an age field, or equivalent header
storage, and the runtime must be able to change the object representation.

### Punitive Age

The lease determines whether a candidate reaches the marker. Punitive age
determines how long an object can survive without trace confirmation. Let
`Age(o)` be initialized to zero. At each collection cycle, the age behaves
conceptually as follows:

- If the trace confirms `o`, set `Age(o) = 0` and exempt `o` for the cycle.
- If `o` is marked only by conservative evidence, freeze the accumulated age.
- If `o` is white, has no strong handle, and is not trace-confirmed, increment
  `Age(o)`.
- If `Age(o) > Theta`, schedule forced demotion or a DRD pending state.

The freeze-on-mark rule is intentional. A conservative appearance does not
erase the suspicion accumulated during previous disappearance cycles. The age
therefore grows across the gaps in an oscillating pattern even though it is
unchanged during the appearance cycles.

This is the opposite of generational age. Generational age rewards survival by
promoting an object. Punitive age treats repeated unconfirmed disappearance as
evidence that the object should be reclaimed.

### True-Root Exemption

The safety rule is per-cycle:

`Source_t(o) = T implies Age_t(o) = 0 and not Reclaimable_t(o)`

The trace must reach the object again in cycle `t + 1` to renew the exemption.
If the object becomes unreachable, its prior mark epoch becomes stale under
lazy epoch advancement. It then becomes white, its age can advance, and it can
be reclaimed after the ordinary deferred-reclamation delay.

This temporal interpretation avoids a permanent-exemption leak. A node that was
once in a live list is not protected forever merely because it was traced in an
earlier cycle. Only current reachability receives the strong exemption.

## Convergence Bounds

Let `Theta` be the punitive-age threshold and `P` be the period of an
oscillating false root, where `P >= 2` means that at least one disappearance
cycle occurs between appearances.

Under the intrinsic mechanism, a transient false root appears once and then
disappears. Its age grows on later white cycles. Depending on whether the
allocation and EBR delay cycles are included in the count, the paper reports
the base bound as `Theta + 1` or `Theta + 2` cycles from the first observation
to reclamation. The implementation experiment with `Theta = 3` reclaimed
transient objects at cycle four because the EBR condition became sufficient
before the forced-demotion threshold was needed.

For an oscillating false root, the cumulative disappearance count grows even
though reappearance freezes the age. The reported intrinsic bound is:

`L(o) <= P * (Theta + 1)`

with the same convention-dependent constant adjustment at the reclamation
edge. The important property is finiteness for every `P >= 2`. A slower
oscillation takes longer in wall-clock cycles, but it cannot reset the
accumulated disappearance count.

The persistent case is different. If `P = 1`, the candidate appears at every
cycle. The object is always marked conservatively, its punitive age freezes at
zero, and the intrinsic mechanism alone cannot distinguish it from a genuine
root:

`L(o) = infinity for the intrinsic-only persistent case`

The extrinsic lease has a different bound because it expires by elapsed epoch,
not by disappearance count:

`L(o) <= L + 1`

where the exact total can become `L + 2` when the final EBR delay cycle is
counted separately.

The two mechanisms are therefore complementary. Intrinsic age is tied to
object identity and handles transient or oscillating patterns without an
external table. Extrinsic lease is portable and closes the persistent case, but
it carries address-reuse risk.

## Defensive Re-verification Demotion

### Motivation

The base theory assumes that a safepoint scan is complete. Real systems can
have transient imperfections: a signal context may fail to expose a register
for one observation, or a concurrent marker may race with a pointer-field
update. If a live object happens to cross the age threshold during that missed
cycle, a single-shot demotion could reclaim it too aggressively.

DRD replaces that single-shot decision with a two-safepoint consensus. When the
age threshold is crossed, the collector sets:

`Pending(o) = 1`

It does not demote immediately.

### State Machine

At the next independent safepoint:

- If `o` is still white, the collector confirms two consecutive invisible
  observations, demotes it, and allows reclamation.
- If `o` is marked and the heap trace reaches it, the collector treats the
  previous white cycle as a transient miss, clears `Pending(o)`, resets its
  age, and rescues it.
- If `o` is marked only by conservative evidence, the collector holds the
  pending flag. The object survives, but conservative evidence does not reset
  its accumulated suspicion.

DRD thus changes the failure mode from "one missed observation is fatal" to
"two consecutive independent misses are required." It does not provide
perfect register maps. A reference that remains persistently invisible to every
scan remains outside the mechanism's observational model.

### DRD Bounds

The reported DRD bounds add a small confirmation window:

- Transient false root: `Theta + 3` cycles in the paper's convention.
- Oscillating false root with period `P`: `P * (Theta + 1) + 2`.
- Persistent false root under intrinsic-only age: still unbounded.
- Extrinsic lease: unchanged in its wall-clock form.

For `Theta = 3` and `P = 2`, the predicted oscillating bound is ten cycles.
The extra two cycles are the defer and confirmation window.

## Hybrid Lease

The hybrid design combines intrinsic punitive age with an extrinsic
address-keyed lease. The intrinsic component handles disappearance patterns;
the extrinsic component prevents a persistent candidate from being marked
forever.

For a persistent false root, the address is anchored at first appearance. The
lease is not refreshed by later appearances. After `L` elapsed epochs, the
candidate is ignored, becomes white, and is reclaimed after the deferred
reclamation condition is satisfied. The resulting bound is reported as:

`L(o) <= L + 2`

The hybrid construction therefore removes the `infinity` category from the
false-root table, but it does not remove the ABA hazard. A production
implementation must decide whether a generation tag, an allocation identity,
lease-table cleanup, or another form of versioning is needed to prevent an old
address entry from affecting a new object.

## Relation to Precise and Existing Collection

Precise collection remains the strongest choice when the compiler can provide
correct root maps. The aging theory is not intended to make an imprecise scan
more informative than a correct type map. Its value is in runtimes where precise
metadata is unavailable, incomplete, or too expensive to add to a legacy
execution model.

The proposal also differs from aggregate space bounds. An aggregate bound
limits the total amount of memory retained by conservative scanning; the
present theory targets the lifetime of an individual false-root-pinned object.
The two ideas can coexist: aggregate accounting can provide a heap-level
backstop while aging provides a per-candidate temporal policy.

The intrinsic and extrinsic forms expose a systems trade-off:

| Dimension | Extrinsic lease | Intrinsic lease |
| --- | --- | --- |
| State location | Address-keyed external table | Object header |
| Legacy-runtime portability | High | Lower |
| Address-reuse hazard | Present | Avoided by object identity |
| Main bound | `L + 1` or `L + 2` | `Theta` and oscillation period |
| Header change | None | One or more state fields |
| Persistent false root | Bounded | Unbounded without hybrid lease |

## Experimental Validation

### Setup

The reported implementation is a virtual machine with a mark-sweep collector,
epoch-based reclamation, a concurrent background marker, and an intrinsic lease.
The main configuration uses `Theta = 3`. The experiments include controlled
false-root schedules, pause-time measurements, write-barrier measurements,
real allocation patterns, and a four-mutator stress test.

The experiments are validation of the specified implementation and its test
workloads. They are not a cross-runtime benchmark, a proof of absence of all
use-after-free bugs, or an independent audit of the theory.

### Controlled Convergence

For a transient false root, sixteen objects were conservatively marked for one
cycle and then left unmarked. With aging enabled, all sixteen objects were
reclaimed by the fourth reported cycle. With aging disabled, all sixteen
objects remained alive through the observed cycles.

For an oscillating root with `P = 2`, objects were conservatively marked on
alternating cycles. With DRD enabled, all sixteen objects were reclaimed at
cycle ten. The pending flag was set when the fourth cumulative disappearance
was reached, held across the next conservative appearance, and confirmed on
the following white cycle. Without aging, the same pattern remained
unbounded in the experiment.

The persistent intrinsic-only test intentionally demonstrates the boundary:
objects marked on every cycle were not reclaimed. The hybrid lease test
reclaimed the candidates after lease expiry plus deferred reclamation.

### Pause Time

The collector advances a fixed sweep batch per safepoint. The reported
measurements show approximately constant p50 pause time for heaps from 10,000
to 500,000 objects:

| Heap size | p50 | p95 | Maximum |
| ---: | ---: | ---: | ---: |
| 1,000 | 44,936 ns | 269,321 ns | 269,321 ns |
| 10,000 | 8,802 ns | 12,113 ns | 16,144 ns |
| 50,000 | 9,997 ns | 13,992 ns | 22,830 ns |
| 500,000 | 9,843 ns | 14,192 ns | 17,402 ns |

The small-heap outlier is attributed to fixed initialization and cold-cache
costs. The larger-heap measurements support the implementation claim that
the per-safepoint sweep work is bounded by the configured batch rather than by
the total heap size.

### Allocation and Collection Cost

The reported write-barrier comparison measured 1,246,834 allocations per
second without the barrier and 1,126,493 allocations per second with it,
approximately a 9.7 percent overhead on that allocation path.

The no-GC baseline allocated 50,000 objects at 1,289,610 allocations per
second. The incremental-GC configuration allocated at 907,000 allocations per
second, a reported 1.4x slowdown, while peak live objects fell from 50,000 to
approximately 2,000. The measurements therefore show a throughput cost
paired with a bounded working footprint in the tested workload.

### Real Workload and Multi-Mutator Test

A recursive binary-tree workload allocated 2,047 nodes, traversed the tree
before and after a collection, and then dropped the root. The two checksums
matched, no use-after-free was observed, and the tree was reclaimed after the
root was removed.

A four-mutator test allocated 6,000 objects in 2,000 three-node chains. All
objects remained available while roots were registered, the traversal checksum
matched, and the objects were reclaimed after root unregistration. The
reported test uses a serial GC phase after parallel mutation; it does not
claim that fully concurrent marking is solved for every mutator interleaving.

### Long-Run Reclamation

The long-run test repeatedly linked and unlinked one hundred temporary nodes
for twenty rounds. The reported live-object count remained stable at 101,
while 1,900 drop operations confirmed actual reclamation of prior-round
objects. The object-table index space grew because reclaimed slots were not
compacted; this is an index-space property rather than evidence that object
memory was retained.

## Multi-Mutator Extension

For multiple mutators, each thread scans its own state and may maintain its own
extrinsic lease table. The intrinsic object state and global epoch remain
shared. A coordinated safepoint is required so that all mutators are paused
before the marker advances the global epoch.

The convergence argument counts collection cycles rather than discoveries.
If every mutator reaches the coordinated safepoint, the age transition remains
per object and per epoch. A false root found by one thread cannot refresh the
first-seen time maintained for the object by another thread in an intrinsic
implementation. The total extrinsic table capacity scales with the number of
mutators, approximately `C * T` for per-thread capacity `C` and thread count
`T`.

The multi-mutator argument is conditional on coordinated safepoints and a
single coherent epoch boundary. It does not by itself prove safety for
uncooperative foreign threads or arbitrary concurrent mutation without the
barriers and ordering needed by the collector implementation.

## Applicability and Limitations

The theory's conclusions require four operational conditions.

1. **State observability.** The scanner must observe the relevant stack and
   register state at each safepoint. DRD reduces the effect of transient misses
   but cannot protect a pointer that is persistently invisible.
2. **Cooperative safepoints.** Mutator threads and native extensions that hold
   managed pointers must participate in the safepoint protocol. A foreign
   thread that never stops can invalidate the timing model.
3. **GC-aware allocation.** Managed objects must be allocated through a path
   known to the collector. Foreign allocator objects are outside the managed
   heap model.
4. **Monotonic epochs.** The epoch clock must advance monotonically and its
   wraparound must be handled before it can invalidate EBR comparisons.

The paper does not claim hard real-time guarantees. A finite retention bound
does not mean zero pause time. It does not remove the need for auditing C
extensions, signal-context behavior, or concurrent-mark ordering. It also does
not prove that every live pointer is seen when the state-completeness axiom is
violated.

The hybrid lease introduces a further operational decision. Address-keyed
state is portable, but address reuse can create an ABA hazard. A production
collector should pair the table with a generation or allocation identity when
the workload can reuse addresses while stale entries remain.

Finally, the reported experiments use finite heaps and selected schedules.
Model checking of the state machine, larger heaps, comparisons with production
collectors, adaptive age thresholds, and stronger evidence for multi-threaded
concurrent marking remain open engineering tasks.

## Conclusion

False roots are stale observations, not evidence that must remain authoritative
forever. The central design move in False-Root Aging Theory is to preserve the
history of that observation. A lease records when a candidate first appeared
and refuses to renew that timestamp. Punitive age records how much
disappearance evidence has accumulated without trace confirmation. Together
they turn repeated conservative sightings from an unbounded renewal channel
into a bounded reclamation process for transient and oscillating patterns.

The intrinsic lease binds state to object identity and avoids the ABA hazard,
but the persistent false-root case remains indistinguishable from a true root
when it appears every cycle. The extrinsic lease bounds that case by elapsed
time and is easier to retrofit, but it requires address-keyed state. The hybrid
design combines the two and closes the persistent boundary with an explicit
trade-off.

DRD adds a second observation before demotion. It does not make conservative
scanning precise, but it narrows the consequence of a transient observation
miss and provides a rescue window for an object that the heap trace confirms at
the verification safepoint.

The implementation results support the stated convergence and performance
claims for the reported workloads. The broader lesson is conditional:
conservative collection can be given a mathematical retention bound without
compiler-maintained precise roots, but the guarantee must be stated together
with the observational and synchronization assumptions that make it true.

## References

1. H.-J. Boehm. Space efficient conservative garbage collection. In
   *Proceedings of PLDI*, 1993.
2. H.-J. Boehm. Bounding space usage of conservative garbage collectors. In
   *Proceedings of POPL*, 2002.
3. H. G. Baker. The tethered garbage collection problem. OOPSLA Addendum,
   1992.
4. B. Goldberg. *Tag-Free Garbage Collection*. PhD thesis, Stanford
   University, 1991.
5. D. Ungar. Generation scavenging: A non-disruptive high performance storage
   reclamation algorithm. In *Proceedings of SDE*, 1984.
