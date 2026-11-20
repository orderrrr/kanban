const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const options = .{
        .enable_ztracy = b.option(bool, "enable_ztracy", "Enable Tracy profile markers") orelse false,
        .enable_fibers = b.option(bool, "enable_fibers", "Enable Tracy fiber support") orelse false,
        .on_demand = b.option(bool, "on_demand", "Build tracy with TRACY_ON_DEMAND") orelse false,
        .callstack = b.option(u32, "callstack", "Tracy callstack depth") orelse 0,
    };

    const ztracy = b.dependency("ztracy", .{
        .target = target,
        .optimize = optimize,
        .enable_ztracy = options.enable_ztracy,
        .enable_fibers = options.enable_fibers,
        .on_demand = options.on_demand,
        .callstack = options.callstack,
    });

    const log = b.addModule("log", .{
        .root_source_file = b.path("log.zig"),
        .target = target,
        .optimize = optimize,
        .imports = &.{
            .{ .name = "ztracy", .module = ztracy.module("root") },
        },
    });
    log.linkLibrary(ztracy.artifact("tracy"));
}
