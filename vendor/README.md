# vendor

Third-party code built from source by `build.zig`. Nothing is fetched at build time. `log` and `snapshot` were copied from `~/wrk/devex/meter/vendor/` on 03/11/2026, at the commits below.

| Directory | Source | Commit | Licence | Local changes |
|---|---|---|---|---|
| `log/` | https://github.com/orderrrr/log | `44ed250` | the user's own | none |
| `snapshot/` | https://github.com/orderrrr/snapshot.zig (test-only) | `0b70a96` | the user's own | none; its example and its own snapshots are left out |
| `log/ztracy/` | https://github.com/zig-gamedev/ztracy, carried inside `log` | `d95d2a1` | MIT | Fixed for Zig 0.17 (in `log` upstream). Here only: the `system_sdk` dependency and the macOS branch that used it are removed from `build.zig` and `build.zig.zon`. It only added a frameworks path for cross-compiling to macOS (44 MB); native macOS and Linux builds don't need it. |
