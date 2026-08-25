# Abstract

Vredrs is a small virtual machine for a dynamically typed language. Its
garbage collector, LDFC (Lazy Deferred Free via Conservative scanning),
implements the companion paper's False-Root Aging Theory in Rust. LDFC scans
the mutator stack and register context for pointer-shaped values, performs
heap-range and object-table filtering, and combines conservative marks with
explicit roots and heap tracing.

This paper describes the implementation in Vredrs 0.1.5. The collector
advances a global epoch at each safepoint, uses lazy epoch reset instead of an
`O(N)` mark reset, and sweeps the object table in fixed batches. A packed
atomic mark state stores color, conservative-source information, and mark
epoch. A chunked object table gives direct slot-index lookup. A card-table
write barrier marks modified parents, not children, so a stale barrier entry
cannot become an unconditional child root. Reclamation uses a CAS take-away,
epoch-based delay, and a typed destruct queue with backpressure. The sweep
path implements DRD, and a proof-of-concept Tolerant Generational Collection
(TGC) extension adds a young/old split and a piggyback remembered set.

The reported measurements show 9.7 percent write-barrier overhead, a 1.4x
slowdown relative to the no-GC baseline, and p50 pause times between 8.8 and
9.7 microseconds for heaps from 10,000 to 500,000 objects in the reported
configuration. TGC improves the cross-generation workload throughput by 2.1x.
These are implementation measurements for Vredrs 0.1.5, not a general
benchmark or an independent proof of all runtime safety properties.

## Introduction

A dynamically typed virtual machine often cannot rely on compiler-emitted root
maps. Values can move through native frames, interpreter temporaries, and
registers without a precise type description at every safepoint. LDFC chooses
conservative scanning as the root-discovery mechanism: it pauses at a safepoint,
scans values that resemble pointers, and lets the marker trace from candidates.

The benefit is a small integration boundary. The collector does not require a
JIT, a shadow stack, or a compiler plugin. The cost is false roots. A
pointer-shaped integer can keep a dead object marked. If the same value
reappears periodically, an ordinary color-only collector can retain the object
without a per-object lifetime bound.

In this paper, **DRD** denotes **Defensive Re-verification Demotion**, the
two-safepoint confirmation protocol used when conservative-only evidence has
aged past its threshold.

LDFC implements the aging discipline described in the companion theory paper.
It carries the source of a mark, advances a global epoch lazily, counts
conservative-only disappearance cycles, and uses DRD to defer a threshold
decision for a second safepoint. The implementation paper focuses on how those
rules are represented in a real Rust runtime:

1. How the object header packs mark and reclamation state.
2. How the object table supports concurrent allocation and direct lookup.
3. How the conservative scanner filters values and covers the stack and
   register context.
4. How the card table, marker, sweeper, and destruct queue interact.
5. How TGC reuses the existing barrier and aging machinery.
6. What the reported experiments show and what they do not establish.

## System Architecture

The collector is organized into approximately 5,600 lines of Rust across
thirteen modules. The principal responsibilities are:

| Module area | Responsibility |
| --- | --- |
| Handle and allocation | Object headers, `Gc<T>` handles, and typed allocation |
| Shared state | Object table, root scanner, global configuration |
| Mutator state | Per-thread card table, roots, and allocation counters |
| Marker | Local mark stack, synchronous path, background marker |
| Sweeper | Incremental sweep, DRD state machine, reclamation |
| Epoch | Global epoch and packed mark-state operations |
| Barrier | Global mark queue and card-table flushing |
| Generational extension | Young index, remembered set, promotion |
| Runtime facade | Public collector lifecycle and test integration |

A collection cycle has three logical phases:

1. **Safepoint.** The mutator pauses. The collector advances the epoch,
   scans explicit and conservative roots, and flushes card-table entries.
2. **Marking.** The marker traces gray objects to black. This can run
   synchronously on the mutator thread or concurrently on a background thread.
3. **Incremental sweeping.** The sweeper processes a fixed batch of object
   table slots, applies DRD and EBR checks, and retires reclaimable objects.

The safepoint work depends on the root state and barrier queue. The sweep step
is deliberately bounded by a configured batch rather than by the total object
table length.

### Synchronous and Concurrent Modes

The synchronous path runs:

`start_cycle -> run_sync -> sweep`

It is used by the simple runtime and by deterministic tests. The concurrent
path runs:

`start_cycle -> run_background -> mutator continues -> wait_for_completion -> sweep`

The background marker owns a local mark stack and traces objects while the
mutator continues. Pointer-field stores are recorded by the write barrier and
are drained at the next safepoint or barrier-queue pass. The implementation
also supports multiple `GcMutatorLocal` instances sharing the object table,
root scanner, and sweeper.

## Object Representation

Every managed allocation begins with a `GcBoxHeader` followed by typed object
data. The header is represented with `#[repr(C)]` so the data pointer has a
stable offset. The reported 64-bit layout contains:

| Field | Purpose |
| --- | --- |
| `id` | Slot index plus one; zero is reserved |
| `last_touched_epoch` | Timestamp used by EBR |
| `mark_state` | Packed color, source bit, and mark epoch |
| `strong_count` | Number of live `Gc<T>` handles |
| `fake_root_age` | Conservative-only disappearance age |
| `generation` | Young or old generation tag |
| `survival_count` | Minor-collection survival count |
| `demotion_pending` | DRD defer flag |
| `trace_fn` | Type-erased child visitor |
| `drop_fn` | Type-erased typed destructor |

The header is reported as 56 bytes on the target 64-bit layout. The central
state field is a 64-bit atomic. Its packed representation contains:

- color bits: white, gray, or black;
- one conservative-source bit;
- the epoch at which the mark was recorded.

Packing the triple into one atomic avoids a torn observation in which a marker
could read the color from one cycle and the epoch from another. The collector
uses acquire and release ordering around mark-state transitions.

### Lazy Epoch Reset

In a conventional mark-sweep collector, every cycle can begin with an `O(N)`
walk that resets every object to white. LDFC advances `GC_EPOCH` at the
safepoint instead. An object whose stored mark epoch is less than the current
epoch is treated as stale, and therefore effectively white:

`effective_color(o) = WHITE when mark_epoch(o) < GC_EPOCH`

Otherwise the stored color is used. The reset cost is reduced to one global
atomic increment and one comparison at each object decision. This does not
remove the work of tracing reachable objects or sweeping object slots; it
removes the full-heap mark-reset pass.

### Chunked Object Table

The object table is a chunked array of atomic header pointers. A reported
configuration uses chunks of 4,096 slots:

```rust
pub struct ConcurrentObjectTable {
    chunks: RwLock<Vec<Arc<[AtomicPtr<GcBoxHeader>; CHUNK_SIZE]>>>,
    len: AtomicUsize,
}
```

Steady-state push takes a read lock on the chunk list and publishes the header
into a distinct slot. Only chunk growth needs the write path. An object ID is
the slot index plus one, so `lookup_header(id)` is a direct array lookup. The
lookup path does not require a hash map or a new allocation.

The table is append-oriented. Reclaimed slots become null but are not reused
without compaction. The long-run experiment therefore distinguishes object
memory reclamation from index-space growth.

## Allocation Path

Allocation is designed to keep the mutator hot path short:

1. Construct a typed `GcBox` with a header initialized to the current epoch,
   white state, one strong handle, and the current touch epoch.
2. Publish the header pointer into the next object-table slot.
3. Set the object ID to the slot index plus one.
4. Wrap the allocation as a `Gc<T>` handle.

The reported operation count is one slot-index `fetch_add`, one atomic pointer
store, two local counter updates, and the underlying Rust allocation. The
type-specific `drop_fn` is installed at allocation time. During reclamation,
the sweeper can reconstruct the typed `Box<GcBox<T>>` from the header pointer
and invoke the correct destructor without knowing `T` dynamically.

The implementation reports an allocation rate of approximately 1.3 million
objects per second on a single core for the allocation-only path.

## Card-Table Write Barrier

The concurrent marker must learn about pointer fields modified while marking
is in progress. LDFC uses a card-table barrier with one dirty byte per object
table slot. A pointer store marks the **parent** object dirty:

```rust
pub fn write_barrier(
    &self,
    parent_id: GcBoxId,
    child_id: GcBoxId,
) {
    if let Some(header) = self.shared.lookup_header(parent_id) {
        unsafe { (*header).touch(); }
    }
    let parent_idx = (parent_id.0 as usize).saturating_sub(1);
    self.card_table.mark_dirty(parent_idx);
}
```

The child is intentionally not marked as a root. If the barrier marked the
child directly, a child that was once stored by a live parent could become an
unconditional root even after the parent dropped the reference. Marking the
parent instead means that the marker re-traces the child only when the parent
itself is still gray or black in the current cycle.

At a safepoint, dirty indices are converted to object IDs and pushed into a
lock-free global queue. The marker checks the parent state before tracing:

- current epoch and gray or black: re-trace the parent;
- stale or white: skip the entry because the parent is dead;
- null slot: skip the reclaimed entry.

This stale-root check is what prevents a barrier entry from becoming an
unconditional child root.

The reported barrier cost is one object-table lookup, one touch timestamp
store, and one card-byte write on the normal path. The measurement reports a
9.7 percent allocation-path overhead.

## Conservative Root Scanning

At a safepoint, the scanner advances the epoch, marks explicit roots, and
scans the native state for values in the managed heap range. The implementation
describes an x86-64 scan that covers:

- a 128-byte red zone below the current stack pointer;
- a 256 KB window above the current stack pointer;
- the register context captured by the platform's signal or context mechanism.

The heap range is maintained with an `O(1)` minimum and maximum. Values outside
the range are discarded before object lookup. Values inside the range are
resolved through a pointer-to-ID cache or object-header lookup; non-GC
allocations in the same address range are filtered out when they do not map to
a known LDFC object.

The scan is conservative and has no type information. Its correctness
contribution is therefore bounded by the quality and completeness of the
safepoint context capture. DRD adds a second observation to the reclamation
decision but does not turn the scan into a precise root map.

### Mark Transitions

The marker uses a compare-and-swap to transition a stale or current white
object to gray. If the object is already marked in the current cycle, the
operation fails and the object is not pushed a second time. After tracing all
children, gray becomes black while preserving the conservative-source bit.

An explicit or trace-discovered object clears the conservative bit. A
conservative scan sets it. The sweeper uses that bit to distinguish a
trace-confirmed object from one whose current-cycle survival came only from
raw machine state.

## Marking and Reclamation

### Marking

The synchronous marker drains a local stack until all gray objects have been
traced. The concurrent marker moves the same operation to a background thread.
A child visitor resolves child IDs through the shared object table and pushes
each newly gray child.

Mutator stores during concurrent marking are not assumed to be harmless. The
card table records the parent, and the marker re-traces a current-cycle
reachable parent when the queue is drained. A dead parent is ignored, so a
stale barrier record cannot revive its former children.

### Incremental Sweep

The sweeper processes a fixed number of object slots, reported as a batch of
128. For each live slot it runs the DRD state machine and then checks the
ordinary reclamation predicates. The conceptual actions are:

| State | Action |
| --- | --- |
| Strong handle count above zero | Keep |
| Current gray or black, trace-confirmed | Keep |
| Current gray or black, conservative and pending | Hold pending |
| Current gray or black, trace-confirmed and pending | Rescue and clear pending |
| White with age below threshold | Increment age |
| White with age above threshold | Set pending or demote according to DRD |
| White with pending already set | Confirm demotion and reclaim if EBR-safe |

The implementation's DRD path defers a threshold crossing for one more
observation. If the next trace reaches the object, the prior white cycle is
treated as a transient miss and the object is rescued. If the next observation
is also white, the object can be demoted.

### CAS Take-Away

Reclamation must have one winner even if more than one path can inspect the
same slot. `take_if_reclaimable` checks the object state and atomically
replaces the slot pointer with null using compare-and-exchange. The winner
receives unique ownership and sends the object to the destruct queue. A
competing sweeper observes the changed slot or loses the CAS and does not
double-free the allocation.

### EBR Delay

An object is reclaimable only when:

1. `strong_count == 0`;
2. its mark epoch is stale relative to the current epoch;
3. at least two epochs have elapsed since its last mutator touch in the
   reported EBR configuration.

The delay gives a mutator that held a stale reference time to reach a
safepoint. It is independent of false-root aging: aging decides whether
conservative evidence may continue to protect an object, while EBR decides
when a white, unreferenced object can actually be freed.

### Destruct Queue

Reclaimed objects are retired to a destruct queue rather than immediately
freed in the sweep loop. The queue invokes the type-erased `drop_fn`, which
reconstructs the typed allocation and runs its destructor. Backpressure is
applied when the queue grows beyond a high-water threshold, blocking
allocation until the queue drains below a lower threshold. This prevents
destructor work from growing without bound under a high-reclamation workload.

## Tolerant Generational Collection

TGC is a proof-of-concept extension layered on LDFC. Each object carries a
generation tag:

- `Young` objects are allocated into the nursery;
- objects surviving two minor collections can be promoted to `Old`.

The existing card-table barrier is reused for cross-generation references.
When an old parent stores a young child, the extension inserts the child into a
fixed-capacity remembered set. Minor collection scans the young index and the
remembered set instead of scanning the entire old generation.

The young index uses a chunked design. The current chunk is appended with a
small lock, and the chunk list is updated only when the current chunk is full.
The reported chunk size is 1,024 allocations. Minor GC is triggered by young
generation bytes, with a reported threshold of approximately 1 MB, rather
than by every allocation count.

The TGC extension also carries an extrinsic lease table for the persistent
false-root case. The reported lease term is five epochs. Once it expires, a
persistent candidate is no longer passed to the marker and the EBR delay can
reclaim the object.

The generational barrier adds lookups for the parent and child and reads their
generation tags. The design goal is to reuse the existing barrier and aging
semantics rather than introduce a second independent safety mechanism.

## Measurements

All measurements reported by the source paper use a single core and a single
mutator unless otherwise noted, to separate collector behavior from
scheduling noise.

### Allocation-Path Overhead

| Mode | Allocations per second |
| --- | ---: |
| No barrier | 1,258,865 |
| With barrier | 1,164,375 |

The difference is reported as a 9.7 percent write-barrier overhead. The
measured path performs a parent lookup, refreshes its touch epoch, and records
one dirty card.

### GC Overhead

| Mode | Allocations per second | Peak live objects | Total time |
| --- | ---: | ---: | ---: |
| No GC | 1,304,679 | 50,000 | 38.3 ms |
| Incremental GC | 904,166 | 2,000 | 55.3 ms |

The incremental collector is reported as 1.4x slower than the no-GC baseline.
The same test reports a much smaller peak live set because unreferenced
objects are reclaimed instead of accumulating.

### Pause Time

| Heap size | p50 | p95 | Maximum |
| ---: | ---: | ---: | ---: |
| 1,000 | 89,129 ns | 389,834 ns | 389,834 ns |
| 10,000 | 8,802 ns | 13,012 ns | 14,507 ns |
| 50,000 | 9,721 ns | 13,716 ns | 17,462 ns |
| 500,000 | 9,721 ns | 13,716 ns | 17,462 ns |

For heaps from 10,000 through 500,000 objects, p50 remains between 8.8 and
9.7 microseconds. The source paper attributes the small-heap outlier to fixed
startup and cache effects. The measurement supports the implementation goal
that sweep work is fixed-batch rather than a full-heap pause.

### TGC Throughput

| Configuration | Allocations per second |
| --- | ---: |
| LDFC without generations | 443,881 |
| TGC with generations | 944,508 |

The reported cross-generation workload improves by 2.1x with TGC. The result
is workload-specific and should not be interpreted as a general performance
ranking against other generational collectors.

### Long-Run Reclamation

In a twenty-round workload, each round allocated one hundred temporary
objects, traced them, and then made them garbage. The reported live-object
count stabilized at 101: one root and the current round's one hundred
temporaries. The test recorded 1,900 destructor calls, confirming that
nineteen prior rounds were actually freed. The object-table index grew because
the implementation did not compact or reuse reclaimed slots.

## Engineering Trade-offs

The implementation makes several choices that are simple to state but
important to preserve:

1. **Mark the parent in the write barrier.** Marking the child would create a
   stale child root and could produce a permanent exemption leak.
2. **Pack mark state atomically.** Separate color, source, and epoch fields
   could be observed inconsistently during concurrent operations.
3. **Advance epochs lazily.** This removes the full-heap reset but adds a
   comparison to every effective-color decision.
4. **Use direct slot IDs.** Array indexing is fast and allocation-free, but
   reclaimed index space requires a future compaction or reuse strategy.
5. **Defer destruction.** The destruct queue keeps sweep work bounded but
   requires backpressure and a separate drain point.
6. **Keep DRD in the sweep path.** The two-safepoint protocol improves
   transient-miss behavior at the cost of a small retention extension.

These choices are coupled. For example, the parent-marking rule relies on the
marker checking whether the parent is marked in the current epoch. The lazy
epoch state therefore participates in the write-barrier correctness rule, not
only in performance.

## Limitations

LDFC is conservative, not precise. It depends on the runtime capturing the
relevant register and stack state at safepoints. A reference that is
persistently invisible cannot be protected by DRD or by any other policy that
never observes it.

The collector also assumes cooperative safepoints. A native extension that
holds a managed pointer while avoiding the protocol can violate the EBR
timing model. Foreign allocations are outside the object table and therefore
outside the collector's reachability model.

The concurrent path relies on the card-table barrier and the ordering of mark
state operations. The multi-mutator experiment in the source paper uses
parallel allocation followed by a serial GC phase. It does not establish
correctness for every possible concurrent-mark race, nor does it replace model
checking of the atomic state machine.

The extrinsic hybrid lease has the same address-reuse hazard described in the
theory paper. The object table also grows in index space because reclaimed
slots are not reused. TGC is a proof of concept; its remembered set is
fixed-capacity and its throughput result is limited to the reported workload.

The reported benchmark sizes are finite, and the tests do not compare LDFC
against every production collector. Larger heaps, multiple operating systems,
foreign-function workloads, aggressive address reuse, and model-checked
concurrent interleavings remain future work.

## Conclusion

LDFC demonstrates one concrete way to implement conservative false-root aging
inside a small Rust virtual machine. Its core path is a composition of:

- packed atomic mark state;
- lazy epoch reset;
- direct object-table lookup;
- parent-oriented card-table barriers;
- incremental fixed-batch sweeping;
- EBR-delayed CAS reclamation;
- DRD pending and rescue states;
- an optional hybrid lease and generational layer.

The reported measurements show a modest write-barrier cost, bounded
incremental pauses across the larger tested heaps, a 1.4x no-GC slowdown, and
actual destructor activity in a long-run workload. The implementation also
makes the boundary conditions visible: conservative scanning still depends
on observable state and cooperative safepoints, the hybrid lease trades
finite persistent-root retention for address-keyed ABA risk, and the TGC
extension remains a proof of concept.

The practical contribution is therefore an implementation pattern rather than
a claim that imprecision has disappeared. LDFC gives a small runtime a
structured way to record where a mark came from, age unconfirmed evidence,
delay risky reclamation, and measure the resulting costs.
