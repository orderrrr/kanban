const std = @import("std");
const ztracy = @import("ztracy");

pub const TracyAllocator = @import("TracyAllocator.zig");

// TODO: improve logging.
pub const Logger = struct {
    pub fn ztrace(comptime src: std.builtin.SourceLocation) ztracy.ZoneCtx {
        comptime var pcg = rng(salt(src));
        const col = comptime pcg.random().int(u8);
        return ztracy.ZoneNC(src, src.file ++ "|" ++ src.fn_name, col);
    }

    pub fn ztraceNamed(comptime src: std.builtin.SourceLocation, comptime name: [:0]const u8) ztracy.ZoneCtx {
        comptime var pcg = rng(salt(src));
        const col = comptime pcg.random().int(u8);
        return ztracy.ZoneNC(src, name, col);
    }

    pub fn allocNamed(ptr: ?*const anyopaque, size: usize, comptime name: [*:0]const u8) void {
        ztracy.AllocN(ptr, size, name);
    }

    pub fn freeNamed(ptr: ?*const anyopaque, comptime name: [*:0]const u8) void {
        ztracy.FreeN(ptr, name);
    }

    pub fn debug(comptime format: []const u8, args: anytype, comptime src: std.builtin.SourceLocation) void {
        log(.debug, comptime format, args, src);
    }

    pub fn info(comptime format: []const u8, args: anytype, comptime src: std.builtin.SourceLocation) void {
        log(.info, comptime format, args, src);
    }

    pub fn err(comptime format: []const u8, args: anytype, comptime src: std.builtin.SourceLocation) void {
        log(.err, comptime format, args, src);
    }

    pub fn warn(comptime format: []const u8, args: anytype, comptime src: std.builtin.SourceLocation) void {
        log(.warn, comptime format, args, src);
    }

    fn log(comptime level: std.log.Level, comptime format: []const u8, args: anytype, comptime source: std.builtin.SourceLocation) void {
        // The program's `std_options.log_level` decides, as for `std.log`: by default every level
        // in Debug builds and `info` and above in release builds. Decided at compile time.
        if (comptime !std.log.logEnabled(level, .default)) return;
        comptime var c = Chameleon{};
        const file_trunc = if (source.file.len > 32) source.file[source.file.len - 32 ..] else source.file;

        const line = c.italic().fmt(std.fmt.comptimePrint("{:3}", .{source.line}));
        const file = c.bold().fmt(std.fmt.comptimePrint("{s:32}", .{file_trunc}));
        const prefix = c.blackBright().fmt(std.fmt.comptimePrint("[{s}:{s}]|", .{ file, line }));

        const fmt = switch (level) {
            .err => c.red(),
            .warn => c.yellow(),
            .info => c.cyan(),
            .debug => c.green(),
        };

        const stderr_fd = std.Io.File.stderr().handle;
        var buf: [4096]u8 = undefined;
        const msg = std.fmt.bufPrint(&buf, prefix ++ fmt.fmt(format) ++ "\n", args) catch return;
        _ = std.c.write(stderr_fd, msg.ptr, msg.len);
    }

    fn rng(s: []const u8) std.Random.Pcg {
        @setEvalBranchQuota(32000);
        comptime var hash = std.crypto.hash.sha2.Sha256.init(.{});
        comptime hash.update(s);
        comptime var digest: [32]u8 = undefined;
        comptime hash.final(&digest);
        const seed = std.mem.readInt(u64, digest[0..8], .little);
        return std.Random.Pcg.init(seed);
    }

    fn salt(comptime src: std.builtin.SourceLocation) []const u8 {
        const line = std.fmt.comptimePrint("{:3}", .{src.line});
        return src.file ++ line;
    }
};

const Chameleon = struct {
    open: []const u8 = "",
    close: []const u8 = "",
    preset: bool = false,

    pub const Styles = struct {
        // Modifiers
        pub const reset = [_][]const u8{ "0", "0" };
        pub const bold = [_][]const u8{ "1", "22" };
        pub const dim = [_][]const u8{ "2", "22" };
        pub const italic = [_][]const u8{ "3", "23" };
        pub const underline = [_][]const u8{ "4", "24" };
        pub const blink = [_][]const u8{ "5", "25" };
        pub const inverse = [_][]const u8{ "7", "27" };
        pub const hidden = [_][]const u8{ "8", "28" };
        pub const strikethrough = [_][]const u8{ "9", "29" };
        pub const doubleUnderline = [_][]const u8{ "21", "24" };
        pub const overline = [_][]const u8{ "53", "55" };

        // Foreground colors
        pub const black = [_][]const u8{ "30", "39" };
        pub const red = [_][]const u8{ "31", "39" };
        pub const green = [_][]const u8{ "32", "39" };
        pub const yellow = [_][]const u8{ "33", "39" };
        pub const blue = [_][]const u8{ "34", "39" };
        pub const magenta = [_][]const u8{ "35", "39" };
        pub const cyan = [_][]const u8{ "36", "39" };
        pub const white = [_][]const u8{ "37", "39" };

        // Foreground bright colors
        pub const blackBright = [_][]const u8{ "90", "39" };
        pub const redBright = [_][]const u8{ "91", "39" };
        pub const greenBright = [_][]const u8{ "92", "39" };
        pub const yellowBright = [_][]const u8{ "93", "39" };
        pub const blueBright = [_][]const u8{ "94", "39" };
        pub const magentaBright = [_][]const u8{ "95", "39" };
        pub const cyanBright = [_][]const u8{ "96", "39" };
        pub const whiteBright = [_][]const u8{ "97", "39" };

        // Background colors
        pub const bgBlack = [_][]const u8{ "40", "49" };
        pub const bgRed = [_][]const u8{ "41", "49" };
        pub const bgGreen = [_][]const u8{ "42", "49" };
        pub const bgYellow = [_][]const u8{ "43", "49" };
        pub const bgBlue = [_][]const u8{ "44", "49" };
        pub const bgMagenta = [_][]const u8{ "45", "49" };
        pub const bgCyan = [_][]const u8{ "46", "49" };
        pub const bgWhite = [_][]const u8{ "47", "49" };

        // Background bright colors
        pub const bgBlackBright = [_][]const u8{ "100", "49" };
        pub const bgRedBright = [_][]const u8{ "101", "49" };
        pub const bgGreenBright = [_][]const u8{ "102", "49" };
        pub const bgYellowBright = [_][]const u8{ "103", "49" };
        pub const bgBlueBright = [_][]const u8{ "104", "49" };
        pub const bgMagentaBright = [_][]const u8{ "105", "49" };
        pub const bgCyanBright = [_][]const u8{ "106", "49" };
        pub const bgWhiteBright = [_][]const u8{ "107", "49" };
    };

    /// Returns the formatted text.
    pub inline fn fmt(self: *Chameleon, comptime text: []const u8) []const u8 {
        defer self.removeAll();
        return self.open ++ text ++ self.close;
    }

    /// Print the formatted text to a `File` writer.
    pub inline fn print(self: *Chameleon, writer: *std.Io.Writer, comptime text: []const u8, args: anytype) !void {
        defer self.removeAll();
        try writer.print(self.fmt(text), args);
    }

    /// Print the formatted text to a buffered `File` writer.
    pub inline fn printFileBuffered(self: *Chameleon, file: std.fs.File, comptime format: []const u8, args: anytype) !void {
        var buf: [1024]u8 = undefined;
        var writer = file.writer(&buf);
        try self.print(&writer.interface, format, args);
        try writer.interface.flush();
    }

    /// Print the formatted text to buffered stdout.
    pub inline fn printOutBuffered(self: *Chameleon, comptime format: []const u8, args: anytype) !void {
        return self.printFileBuffered(.stdout(), format, args);
    }

    /// Print the formatted text to buffered stderr.
    pub inline fn printErrBuffered(self: *Chameleon, comptime format: []const u8, args: anytype) !void {
        return self.printFileBuffered(.stderr(), format, args);
    }

    /// Print the formatted text to a `File` writer.
    pub inline fn printFile(self: *Chameleon, file: std.fs.File, comptime format: []const u8, args: anytype) !void {
        var writer = file.writer(&.{});
        try self.print(&writer.interface, format, args);
        try writer.interface.flush();
    }

    /// Print the formatted text to stdout.
    pub inline fn printOut(self: *Chameleon, comptime format: []const u8, args: anytype) !void {
        return self.printFile(.stdout(), format, args);
    }

    /// Print the formatted text to stderr.
    pub inline fn printErr(self: *Chameleon, comptime format: []const u8, args: anytype) !void {
        return self.printFile(.stderr(), format, args);
    }

    pub inline fn addStyle(self: *Chameleon, comptime style_name: []const u8) *Chameleon {
        const style = wrapStyle(@field(Styles, style_name));
        self.open = self.open ++ style[0];
        self.close = style[1] ++ self.close;
        return self;
    }

    inline fn removeAll(self: *Chameleon) void {
        if (self.preset) return;
        self.open = "";
        self.close = "";
    }

    pub inline fn reset(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bold(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn dim(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn italic(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn underline(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn blink(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn inverse(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn hidden(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn strikethrough(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn doubleUnderline(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn overline(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn black(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn red(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn green(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn yellow(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn blue(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn magenta(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn cyan(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn white(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn blackBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn gray(self: *Chameleon) *Chameleon {
        return blackBright(self);
    }

    pub inline fn grey(self: *Chameleon) *Chameleon {
        return blackBright(self);
    }

    pub inline fn redBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn greenBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn yellowBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn blueBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn magentaBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn cyanBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn whiteBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgBlack(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgRed(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgGreen(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgYellow(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgBlue(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgMagenta(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgCyan(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgWhite(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgBlackBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgGray(self: *Chameleon) *Chameleon {
        return bgBlackBright(self);
    }

    pub inline fn bgGrey(self: *Chameleon) *Chameleon {
        return bgBlackBright(self);
    }

    pub inline fn bgRedBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgGreenBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgYellowBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgBlueBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgMagentaBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgCyanBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    pub inline fn bgWhiteBright(self: *Chameleon) *Chameleon {
        return self.addStyle(@src().fn_name);
    }

    /// Set the foreground color to the rgb color values.
    pub inline fn rgb(self: *Chameleon, comptime r: u8, comptime g: u8, comptime b: u8) *Chameleon {
        self.open = self.open ++ wrapAnsi16m(false, r, g, b);
        self.close = "\u{001B}[39m" ++ self.close;
        return self;
    }

    /// Set the background color to the rgb color values.
    pub inline fn bgRgb(self: *Chameleon, comptime r: u8, comptime g: u8, comptime b: u8) *Chameleon {
        self.open = self.open ++ wrapAnsi16m(true, r, g, b);
        self.close = "\u{001B}[49m" ++ self.close;
        return self;
    }

    /// Set the foreground color to the hex color code.
    ///
    /// NOTE:
    /// - The `#` prefix is optional.
    /// - Hex triplets are allowed. (e.g. `#FFAA00` is equivalent to `#FA0`)
    ///
    pub inline fn hex(self: *Chameleon, comptime hex_code: []const u8) *Chameleon {
        const rgb_val = rgbFromHex(hex_code);
        return self.rgb(rgb_val[0], rgb_val[1], rgb_val[2]);
    }

    /// Set the background color to the hex color code.
    ///
    /// NOTE:
    /// - The `#` prefix is optional.
    /// - Hex triplets are allowed. (e.g. `#FFAA00` is equivalent to `#FA0`)
    ///
    pub inline fn bgHex(self: *Chameleon, comptime hex_code: []const u8) *Chameleon {
        const rgb_val = rgbFromHex(hex_code);
        return self.bgRgb(rgb_val[0], rgb_val[1], rgb_val[2]);
    }

    /// Create a new instance with the current styles as a preset.
    pub inline fn createPreset(self: *Chameleon) Chameleon {
        defer self.removeAll();
        return .{
            .open = self.open,
            .close = self.close,
            .preset = true,
        };
    }

    pub inline fn wrapStyle(style: [2][]const u8) [2][]const u8 {
        return [_][]const u8{ "\u{001B}[" ++ style[0] ++ "m", "\u{001B}[" ++ style[1] ++ "m" };
    }

    inline fn toString(num: comptime_int) []const u8 {
        return std.fmt.comptimePrint("{}", .{num});
    }

    pub inline fn wrapAnsi16m(bg: bool, r: u8, g: u8, b: u8) []const u8 {
        return "\u{001B}[" ++ toString(if (bg) 48 else 38) ++ ";2;" ++ toString(r) ++ ";" ++ toString(g) ++ ";" ++ toString(b) ++ "m";
    }

    pub inline fn rgbFromHex(hex_code: []const u8) [3]u32 {
        const user_hex = if (hex_code[0] == '#') hex_code[1..] else hex_code;
        const hex_final = if (user_hex.len == 3) &[_]u8{ user_hex[0], user_hex[0], user_hex[1], user_hex[1], user_hex[2], user_hex[2] } else user_hex;
        const hex_int = comptime std.fmt.parseInt(u32, hex_final, 16) catch |err| @compileError("unable to parse hex due to " ++ @errorName(err));
        return [_]u32{
            (hex_int >> 16) & 0xFF, // red
            (hex_int >> 8) & 0xFF, // green
            hex_int & 0xFF, // blue
        };
    }
};
