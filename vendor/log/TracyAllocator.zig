//! Reports every alloc/free to Tracy under a named pool (e.g. "engine", "sdl").
//! Unlike ztracy's TracyAllocator, only real OOM is logged; resize/remap fallbacks are normal.

const std = @import("std");
const ztracy = @import("ztracy");

const Self = @This();

child_allocator: std.mem.Allocator,
name: [*:0]const u8,

pub fn init(child_allocator: std.mem.Allocator, comptime name: [*:0]const u8) Self {
    return .{
        .child_allocator = child_allocator,
        .name = name,
    };
}

pub fn allocator(self: *Self) std.mem.Allocator {
    return .{
        .ptr = self,
        .vtable = &.{
            .alloc = alloc,
            .resize = resize,
            .remap = remap,
            .free = free,
        },
    };
}

fn alloc(ctx: *anyopaque, len: usize, alignment: std.mem.Alignment, ra: usize) ?[*]u8 {
    const self: *Self = @ptrCast(@alignCast(ctx));
    const result = self.child_allocator.rawAlloc(len, alignment, ra);
    if (result) |ptr| {
        ztracy.AllocN(ptr, len, self.name);
    } else {
        // Actual OOM — worth reporting.
        var buf: [128]u8 = undefined;
        const msg = std.fmt.bufPrint(&buf, "OOM: alloc {d} bytes [{s}]", .{ len, self.name }) catch return null;
        ztracy.Message(msg);
    }
    return result;
}

fn resize(ctx: *anyopaque, buf: []u8, alignment: std.mem.Alignment, new_len: usize, ra: usize) bool {
    const self: *Self = @ptrCast(@alignCast(ctx));
    const result = self.child_allocator.rawResize(buf, alignment, new_len, ra);
    if (result) {
        // In-place resize succeeded — update Tracy's bookkeeping.
        ztracy.FreeN(buf.ptr, self.name);
        ztracy.AllocN(buf.ptr, new_len, self.name);
    }
    // resize returning false is normal (GPA almost never resizes in-place).
    // The caller will alloc+copy+free which Tracy sees as separate events.
    return result;
}

fn remap(ctx: *anyopaque, buf: []u8, alignment: std.mem.Alignment, new_len: usize, ra: usize) ?[*]u8 {
    const self: *Self = @ptrCast(@alignCast(ctx));
    const result = self.child_allocator.rawRemap(buf, alignment, new_len, ra);
    if (result) |ptr| {
        // Remap succeeded (possibly moved) — update Tracy.
        ztracy.FreeN(buf.ptr, self.name);
        ztracy.AllocN(ptr, new_len, self.name);
    }
    // remap returning null is normal — caller falls back to alloc+copy+free.
    return result;
}

fn free(ctx: *anyopaque, buf: []u8, alignment: std.mem.Alignment, ra: usize) void {
    const self: *Self = @ptrCast(@alignCast(ctx));
    self.child_allocator.rawFree(buf, alignment, ra);
    ztracy.FreeN(buf.ptr, self.name);
}
