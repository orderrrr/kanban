# pg.zig as the Postgres client for the board backend

Researched 03/11/2026 from the GitHub repository, its commits, issues and pull requests, read on the web only. Nothing was cloned or built.

## Verdict and recommendation

pg.zig is the only mature native Postgres client for Zig, and it is a sound choice to vendor, with three conditions. It is MIT licensed, its master branch was ported to Zig 0.17 on 04/10/2026 and fixed again for 0.17.0 on 10/10/2026, it covers everything the app needs (SCRAM-SHA-256, a pool, parameterised queries, transactions, uuid, timestamptz, jsonb, arrays, SQLSTATE on errors), and it is actively maintained, with 22 commits between 22/07/2026 and 22/10/2026. The conditions come from reading the source. (1) Its TLS mode `verify_full` checks the certificate chain but, on our reading, never checks the hostname. If the app needs TLS to Postgres we must add `SSL_set1_host` as a local change, and TLS pulls in system OpenSSL plus two more vendored packages (translate-c and aro). (2) Query read timeouts are not implemented: the option is accepted and then thrown away. A hung server blocks the request thread. (3) A large server message is read into a buffer grown to whatever length the server announces, with no upper limit, and the library keeps metrics in a global variable. Both conflict with TIGER_STYLE's "put a limit on everything" and static allocation at start-up. These are fine for a small internal app, but they should be written down as known gaps, not discovered later. Recommendation: vendor pg.zig at `0ccd7d9` with buffer.zig and metrics.zig, start without TLS (drop translate-c and the upstream test step), set `auth_methods = .scram_only`, open the whole pool at start-up, and decide TLS separately. Whether it compiles with Zig 0.17.0 has not been checked by building it. The evidence is strong but indirect.

## 1. Zig version support

The latest commit on `master` is `0ccd7d9dabce32e4cee0dd789d8007934099a0f9` ("auth hardening", Karl Seguin, 22/10/2026). The one before it, `1e457c0`, is from the same day.

From the sources:

- `readme.md` on master says: "This is for Zig 0.17.0. See branches for other versions."
- Commit `1ca2d58` ("zig 0.17", 04/10/2026) ported the library: new `@typeInfo` field names in `result.zig` and `types.zig`, `dupeZ` replaced with `dupeSentinel`, test runner changes, the metrics dependency moved to its "zig 0.17" commit, and translate-c moved to its `zig-0.17.x` branch. The readme line changed from 0.16.0 to 0.17.0 in the same commit.
- Issue #147 ("failure trying to use with 0.17.0 project", 10/10/2026) reported a hash mismatch on the translate-c dependency, not a compile error. PR #148 (`d7832be`, 10/10/2026) pinned translate-c to tag 2.0.1 at commit `4f5ad37`, and the reporter closed the issue as solved on 13/10/2026.
- `build.zig.zon` on master has no `minimum_zig_version` field. translate-c 2.0.1 declares `minimum_zig_version = "0.17.0"`, and metrics.zig at the pinned commit declares `"0.16.0"`.
- Branches exist for older releases: `zig-0.16.0` (updated 22/10/2026, so fixes are being backported), `zig-0.15`, `zig-0.14` and older, plus a `dev` branch.
- The code uses `std.Io` throughout: `Pool.init(io, allocator, opts)` and `Conn.open(io, allocator, opts)` take an `Io`, sockets come from `std.Io.net`, and the pool locks with `Io.Mutex` and `Io.Condition`.

Inferred: master targets the Zig 0.17.0 release. The README says so, the port commit is named for it, and a user building a 0.17.0 project got through to a dependency hash error, which needs the build script to run first. **We have not checked 0.17.0 compatibility by building.** The first vendoring step must be `zig build` and a smoke test on 0.17.0.

One caveat to check during that build: pg.zig still pins buffer.zig at `a0de502` (14/09/2025). That is older than buffer.zig's own "Update for Zig 0.16" (`027af39`) and "zig 0.17" (`011004b`) commits. Upstream evidently builds against it on 0.17, probably because pg.zig only touches a small part of `Buffer` and Zig only analyses code that is referenced. That is an inference. If the build fails inside buffer.zig, take buffer.zig at `dfff55f` instead.

## 2. Licence

MIT, "Copyright (c) 2024 Karl Seguin." (`LICENSE` on master; the GitHub API also reports MIT). There are no restrictions on vendoring beyond keeping the licence file.

## 3. Its own dependencies

From `build.zig.zon` on master:

| Dependency | Source | Pinned commit | Licence | Needed? |
|---|---|---|---|---|
| buffer | github.com/karlseguin/buffer.zig, tarball | `a0de50267550666dc126051f672a8f0b55c44083` (14/09/2025) | MIT, Karl Seguin 2024 | Yes. `conn.zig` imports `@import("buffer").Buffer` for the write buffer. |
| metrics | github.com/karlseguin/metrics.zig | `ac167295b6a8fd84ca7af852c1032e6b246101f0` ("zig 0.17", 04/10/2026) | MIT, Karl Seguin 2024 | Yes. `src/metrics.zig` imports it, and it is wired in unconditionally. |
| translate_c | codeberg.org/ziglang/translate-c, tag 2.0.1 | `4f5ad374e50d1a98d3da79fa5d3bda9949103bf7` | MIT (Expat) | Only for TLS. It translates `src/openssl.h`. |
| aro (via translate_c) | codeberg.org/ziglang/arocc, branch zig-0.17.x | `ffddc972f7a208bd6e254c27465407270fd8b60c` | MIT | Only if translate_c is vendored. |

buffer.zig at `a0de502` has no `build.zig.zon` (its tree holds only `LICENSE`, `Makefile`, `build.zig`, `readme.md`, `src/buffer.zig`, `src/pool.zig`, `src/t.zig`, `test_runner.zig`). The `N-V-__8AA…` hash confirms it is consumed as a package without a manifest. We infer that a path dependency without a manifest may be rejected or warned about by Zig 0.17. Adding a minimal `build.zig.zon` (name, version, fingerprint, paths) is a likely local change, matching `vendor/snapshot`.

metrics.zig has a newer commit, `3676413` ("fix: include histogram upper bounds", 10/10/2026). pg.zig only uses counters, so the pinned `ac16729` is enough.

`build.zig` calls `b.dependency("translate_c", .{})` (not `lazyDependency`) in two places: in the OpenSSL branch, and again, unconditionally, in the test step block. The test block runs on every `zig build`, so translate_c has to resolve even with OpenSSL switched off. Upstream's test step also always links system `ssl` and `crypto`. A vendored copy without TLS therefore has to remove translate_c from `build.zig.zon` and remove or trim the test step in `build.zig`.

## 4. Features

All of this was read from `readme.md` and the source unless marked otherwise.

- **Auth.** Supports `none` (trust), `password` (cleartext), `md5` and `scram_sha_256` (`src/auth.zig`). Commit `0ccd7d9` (22/10/2026) added an `auth_methods` allowlist (default: all allowed) with a `.scram_only` preset, a `max_scram_iterations` cap (default 1,000,000; Postgres defaults to 4096), and the RFC 5802 check that the server nonce extends the client nonce. The README warns that the server picks the method, so without certificate verification a man in the middle could ask for a cleartext password. We should set `.scram_only`. SCRAM channel binding (SCRAM-SHA-256-PLUS) is not mentioned anywhere, so we take it to be unsupported.
- **TLS.** Labelled "experimental". It links system OpenSSL through translate-c (`-Dopenssl`, or `-Dopenssl_lib_name/_lib_path/_include_path`). Modes are `.off` (default), `.require` (encrypted, no verification) and `.verify_full` (system roots or a given root certificate). TLS 1.2 is the minimum (`SSL_CTX_set_min_proto_version(ctx, TLS1_2_VERSION)` in `lib.zig`). On our reading of `lib.zig`, `stream.zig` and `conn.zig`, `verify_full` only calls `SSL_set_verify(ssl, SSL_VERIFY_PEER, null)` and sets SNI with `SSL_set_tlsext_host_name`. Neither `SSL_set1_host` nor `X509_VERIFY_PARAM_set1_host` appears, so the hostname in the certificate is not checked. Any certificate signed by a trusted root would be accepted. In libpq terms this is `verify-ca`, not `verify-full`. Open issue #124 says the handshake fails on non-blocking `std.Io` backends because `SSL_connect` is not retried. The maintainer turned down a switch to tls.zig (PR #132, closed 21/09/2026) because he will not adopt unaudited cryptography.
- **Pooling.** `pg.Pool` with `size` (default 10, `u16`), `timeout` (acquire wait, default 10,000 ms, then `error.Timeout`), and `connect_on_init_count` (default `null`, which opens all `size` connections at init). PR #149 (`4d63344`, 14/10/2026) replaced background reconnection with growing on demand: a slot freed by a broken connection is reopened on the next `acquire`. There is no background thread. A connection released in a non-idle state is counted as "dirty", closed and freed. PR #153 (max lifetime and idle timeout) was declined on 22/10/2026, so there is no connection recycling. The pool relies on TCP keepalive (on by default: 30 s idle, 10 s interval, 3 probes). `Pool.deinit` closes only idle connections, so the app must release every connection before shutdown.
- **Parameterised queries.** `exec`, `query`, `row`, and `queryOpts`/`rowOpts` take `$1…$n` arguments as a Zig tuple, sent through the extended protocol (Parse/Bind/Execute). The `pool.*` forms release the connection when the result or row is deinitialised. Statements can be prepared explicitly and cached per connection (`cache_name`). The README warns that the cache name is not sanitised.
- **Transactions.** `conn.begin()`, `commit()`, `rollback()` (rollback works from any state), and `tryRollback()`. The pattern is `begin`, then `errdefer conn.rollback() catch {}`, then `commit`, all on a connection taken with `pool.acquire()`.
- **LISTEN/NOTIFY.** `pg.Listener` or `pool.newListener()`, which opens a dedicated connection outside the pool. The README says there is no automatic reconnection and delivery is at most once. Commit `1e457c0` (22/10/2026) fixed a buffer overflow in `listen` for long channel names containing quotes.
- **Type mapping.** uuid reads as 16 raw bytes (`pg.uuidToHex` gives the text form; binding accepts either). `timestamp` and `timestamptz` read as `i64` microseconds since the Unix epoch (binding also accepts strings; infinity handling fixed in #142). `json`/`jsonb` read as `[]u8`, bind from a string or a struct, and `row.to` can map them to a struct since `2e08f98` (03/10/2026). Arrays read as `pg.Iterator(T)`, one dimension only (multi-dimensional arrays now return an error, #144). `numeric` maps to `pg.Numeric` or `f64` and the README calls its support "half-baked". Enums, `inet`/`cidr` and `bytea` are also covered. Reads check types strictly, binds less so.
- **Errors.** Server errors come back as `error.PG`, with details in `conn.err`: `code` (SQLSTATE), `message` and `severity`, plus `detail`, `hint`, `constraint`, `table`, `column` and others when the server sends them. `isUnique()` tests for `23505`. The error text is copied with the connection's allocator and lives until the next error or `deinit`. Pool helpers report through the connection, so to read SQLSTATE the app must `acquire` and use `conn.*`, not `pool.exec`. We inferred this from the API shape, and the smoke test should confirm it.

## 5. Memory and allocation model

From `conn.zig`, `reader.zig`, `pool.zig` and the README:

- **Allocators are passed in.** `Pool.init(io, allocator, opts)` and `Conn.open(io, allocator, opts)`. `queryOpts` takes an `allocator` (for example a per-request arena) that is used for reads that outgrow the buffer and for `column_names`. This fits STYLE.md's "allocator passed in, stored on self, deinit infallible".
- **Per connection, at open.** A write buffer (default 2048 bytes, minimum 128), a read buffer (default 4096), result state for 32 columns or parameters (`result_state_size`), and a parameter OID array of the same size. All of these are allocated once.
- **Per query.** No allocation in the common case. Allocation happens only when a statement has more parameters or columns than `result_state_size` (counted in the `pg_alloc_params` and `pg_alloc_columns` metrics), or when one server message is bigger than the read buffer (`pg_alloc_reader`). In that case the reader allocates exactly the length the server announced (`allocator.alloc(u8, message_length)`), with no upper limit beyond the u32 length field, and frees it at the end of the flow. Row values (strings, slices) borrow from the read buffer and are valid only until the next `next()`, `deinit()` or `drain()`. Callers must copy anything they keep.
- **Pool.** The connection slice is allocated once at init with length `size`. Each `Conn` is created with `allocator.create` when it opens. With `connect_on_init_count = null` every connection opens at start-up, and after that only broken connections are reopened.
- **Timeouts.** The acquire timeout and auth timeout (default 10,000 ms) exist. The per-query `timeout` does not work: in `reader.zig`, `startFlow` discards the value (`_ = ms; // autofix`) and the `SO_RCVTIMEO` call is commented out. Open PR #150 (21/10/2026) implements it. Open PR #151 adds `Conn.cancel()` through BackendKeyData.
- **Global state.** `src/metrics.zig` holds a file-scope `var metrics` of six counters, updated unconditionally. This is harmless, but it is shared global state.

Fit with TIGER_STYLE: pg.zig is close to "allocate at start-up" if we open the full pool at init and size `read_buffer` and `result_state_size` for our largest expected row and statement. Two gaps remain. Oversized messages are not capped, which conflicts with "put a limit on everything" and could be closed with a small local change (a `max_message_size` option that returns an error). Read timeouts are missing. We need neither change for a first version, but they should be recorded as known gaps. A summarised reading of `Reader.endFlow` suggested a possible double free when a large over-read stays in a buffer from the default allocator. We could not confirm this from the source text we saw, so it should be checked under `std.testing.allocator` with a large-row test when we vendor.

## 6. Maintenance

- **Activity.** 22 commits between 22/07/2026 and 22/10/2026. Stars 605, forks 72, 8 open issues and PRs (GitHub API, read 03/11/2026). The repository was created 26/10/2023.
- **Zig tracking.** The 0.17 port landed on 04/10/2026. A news article dated 02/10/2026 reports the 0.17.0 release, but we did not confirm the date against ziglang.org. The port therefore arrived within days, and the translate-c pin fix a week later. Version branches are kept back to 0.11, and `zig-0.16.0` still gets fixes.
- **Notable open items.** #124 (TLS handshake on non-blocking Io), #121 (Windows keepalive crash, not relevant to us), #150 (read timeout), #151 (cancel), #115 (replace Buffer with std.Io reader/writer), #146 (JSON into structs, partly done by `2e08f98`).
- **Recent fixes.** Many correctness and hardening fixes landed in October 2026: enum, array and timestamp panics (#141 to #145), a use-after-free on the auth error path (#131), a double unlock in the old reconnector (#127), malformed DataRow and length validation, the listener overflow (`1e457c0`), and the auth allowlist and nonce check (`0ccd7d9`). The library is still being hardened, which argues for pinning a commit and updating on purpose.
- **Bus factor.** Effectively one: Karl Seguin writes most commits and decides what merges. Lukáš Lalinský (author of the zio async runtime) and Nevindra are regular recent contributors. The maintainer has said he is cautious about investing in I/O-heavy code while `std.Io` settles (PR #132 discussion, 20/09/2026). Vendoring removes the availability risk, because the copy keeps working whatever upstream does.

## 7. Alternatives

- **libpq vendored as C.** The reference client: complete, with full TLS verification, GSSAPI and cancellation. But we would have to build part of the PostgreSQL source tree with Zig's build system and link OpenSSL, which means far more vendored code and a C API to wrap. That is not worth it for a small app unless strict TLS is required and patching pg.zig is unacceptable.
- **psql (codeberg.org/ouhamouy10/psql).** A native client in layers (wire, message, client) that states Zig 0.16.0 support. It is a smaller single-author project with no evidence yet of 0.17 support or production use. Not chosen.
- **Writing our own wire-protocol client.** Feasible, since the protocol is well documented, but it would repeat pg.zig's SCRAM, type mapping and hardening work. Not justified.

## 8. Vendoring recipe

This follows `meter/vendor/README.md`: sources are copied in, the commit is pinned, licence and local changes are recorded, nothing is fetched, and dependencies are path dependencies.

**Copy (pg.zig at `0ccd7d9`) into `vendor/pg/`:** `LICENSE`, `readme.md`, `build.zig`, `build.zig.zon`, `src/` (all of it, including `src/proto/`, `src/types/`, `openssl.h` and `openssl_stub.zig`, because `build.zig` refers to both), and `test_runner.zig` if we keep any test step.

**Leave out:** `example/`, `tests/` (Docker compose and Postgres config for upstream CI, plus test certificates and a test private key, `tests/client.key`, which should not be carried into this repository), `Makefile` and `.gitignore`.

**Also vendor:**

- `vendor/buffer/` from buffer.zig `a0de502`: `LICENSE`, `build.zig`, `src/buffer.zig`, `src/pool.zig`, `src/t.zig`. Leave out `Makefile`, `readme.md` and `test_runner.zig` (keep it only if `build.zig`'s test step stays). Add a minimal `build.zig.zon`, since upstream has none at this commit.
- `vendor/metrics/` from metrics.zig `ac16729`: `LICENSE`, `build.zig`, `build.zig.zon`, `src/`. Leave out `example/` (also drop it from `.paths` in its `build.zig.zon`), `Makefile` and `test_runner.zig` if unused.
- Only if TLS is wanted: `vendor/translate_c/` (2.0.1, `4f5ad37`) and `vendor/aro/` (`ffddc97`), with translate_c's `build.zig.zon` repointed to `.path = "../aro"`.

**Likely local changes, each to be recorded in the README table:**

1. `vendor/pg/build.zig.zon`: replace the `url`/`hash` entries with `.buffer = .{ .path = "../buffer" }` and `.metrics = .{ .path = "../metrics" }`. Remove `translate_c` when there is no TLS. Add `.minimum_zig_version = "0.17.0"`.
2. `vendor/pg/build.zig`: without TLS, remove the test step block (it calls `b.dependency("translate_c")` and links system `ssl`/`crypto` unconditionally). The OpenSSL branch is only entered with `-Dopenssl` or a path option, so it can stay or be cut down to the stub.
3. `vendor/buffer/build.zig.zon`: new file, as above.
4. `vendor/metrics/build.zig.zon`: drop `example` from `.paths`.
5. Optional, and only when needed: add `SSL_set1_host` for `verify_full` (required before TLS is relied on); cap the reader's message length; take PR #150's read timeout.

**App `build.zig.zon` and `build.zig`:**

```zig
.dependencies = .{
    .pg = .{ .path = "vendor/pg" },
},
```

```zig
const pg = b.dependency("pg", .{ .target = target, .optimize = optimize });
exe.root_module.addImport("pg", pg.module("pg"));
```

The paths are relative to the app's own `build.zig.zon`. If the app sits next to `vendor/` the way meter's packages do, use `"../vendor/pg"`.

**Smoke test (described only; Postgres is not installed locally).** Run Postgres 16 or 17 in a container with `password_encryption = scram-sha-256` and a `scram-sha-256` rule in `pg_hba.conf`. Then a Zig test or a small executable should:

1. Open a `Pool` (`size = 2`, `connect_on_init_count = null`, `auth = .{ .username, .password, .database, .auth_methods = .scram_only }`) with `std.testing.allocator`.
2. Create a table with `uuid`, `timestamptz`, `jsonb`, `text[]` and a unique column.
3. Insert inside `begin`/`commit` using `$1…$n` parameters.
4. Read the row back and check the 16-byte uuid, the `i64` microsecond timestamp, the jsonb bytes and the array iterator.
5. Insert a duplicate and check `error.PG`, `conn.err.?.code` equal to `"23505"` and `isUnique()`.
6. Run `begin`, insert, `rollback` and check the row is absent.
7. Select a row larger than `read_buffer` (for example `repeat('x', 100000)`) to exercise the overflow path.
8. `deinit` everything and check the testing allocator reports no leaks.

A second run against a server set to md5 should fail with `error.AuthMethodNotAllowed`.

## Sources

- Repository: https://github.com/karlseguin/pg.zig (master at `0ccd7d9dabce32e4cee0dd789d8007934099a0f9`, 22/10/2026)
- Commits list: https://github.com/karlseguin/pg.zig/commits/master
- `build.zig.zon`, `build.zig`, `readme.md`, `LICENSE`, `src/lib.zig`, `src/conn.zig`, `src/stream.zig`, `src/reader.zig`, `src/pool.zig`, `src/metrics.zig`: https://github.com/karlseguin/pg.zig/tree/0ccd7d9dabce32e4cee0dd789d8007934099a0f9
- Zig 0.17 port: https://github.com/karlseguin/pg.zig/commit/1ca2d58d412af038254da5a67882c5b68977c34a
- Auth hardening: https://github.com/karlseguin/pg.zig/commit/0ccd7d9dabce32e4cee0dd789d8007934099a0f9
- Listener overflow and validation: https://github.com/karlseguin/pg.zig/commit/1e457c04fb025d64f510abfc9285deb576c0296d
- Pool grows on demand (#149): https://github.com/karlseguin/pg.zig/commit/4d63344739ee48c1475d51e3b0f72a6cb572cd8f
- translate-c pin (#148): https://github.com/karlseguin/pg.zig/commit/d7832be453d4d34f6824c32eda6a256d0d50b79d
- Issues and PRs: https://github.com/karlseguin/pg.zig/issues/147, /pull/132, /pull/153, /pull/150, /pull/151, /issues/124
- Branches: https://github.com/karlseguin/pg.zig/branches/all
- buffer.zig at `a0de50267550666dc126051f672a8f0b55c44083`: https://github.com/karlseguin/buffer.zig/tree/a0de50267550666dc126051f672a8f0b55c44083 (later commits `011004b` "zig 0.17", `dfff55f` merge, 04/10/2026)
- metrics.zig at `ac167295b6a8fd84ca7af852c1032e6b246101f0`: https://github.com/karlseguin/metrics.zig/tree/ac167295b6a8fd84ca7af852c1032e6b246101f0
- translate-c 2.0.1: https://codeberg.org/ziglang/translate-c/src/tag/2.0.1 (commit `4f5ad374e50d1a98d3da79fa5d3bda9949103bf7`)
- arocc: https://codeberg.org/ziglang/arocc/src/commit/ffddc972f7a208bd6e254c27465407270fd8b60c
- psql: https://codeberg.org/ouhamouy10/psql
- Zig 0.17.0 release report (secondary, date not confirmed against ziglang.org): https://zeli.app/story/49938521
- Vendoring convention: ~/wrk/devex/meter/vendor/README.md, ~/wrk/devex/meter/kev-client/build.zig.zon
