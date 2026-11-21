using System.Buffers.Binary;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Win32.SafeHandles;

namespace ManagerHub.Fm2013Host;

/// <summary>
/// Experimental local process probe, not a certified FM2013 reader.
/// Only emits a sanitized status and byte count; never emits addresses or raw bytes.
/// This --worker endpoint is not an authenticated public IPC service.
/// </summary>
internal static class Program
{
    private const string Schema = "managerhub-native-probe-v2";
    private const uint QueryLimitedInformation = 0x1000;
    private const uint VmRead = 0x0010;
    private const int MaxInputCharacters = 512;
    private const int MaximumReadBytes = 512;
    private const long MaximumAddress = 0x7fffffffL;
    private readonly record struct Request(int Pid, string StartedAtFileTime, long Address, int ByteLength, string RequestId);
    private readonly record struct Result(string Status, string? Reason, int BytesRead)
    {
        public static Result Rejected(string reason) => new("rejected", reason, 0);
        public static Result Success(int length) => new("read_only_smoke", null, length);
    }
    [StructLayout(LayoutKind.Sequential)]
    private struct FileTime
    {
        public uint Low;
        public uint High;
        public readonly ulong Value => ((ulong)High << 32) | Low;
    }
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern SafeProcessHandle OpenProcess(uint desiredAccess, bool inheritHandle, int processId);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, EntryPoint = "QueryFullProcessImageNameW", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool QueryFullProcessImageName(
        SafeProcessHandle process, uint flags, StringBuilder name, ref uint length);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetProcessTimes(
        SafeProcessHandle process, out FileTime creation, out FileTime exit,
        out FileTime kernel, out FileTime user);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool ReadProcessMemory(
        SafeProcessHandle process, IntPtr address, [Out] byte[] buffer,
        UIntPtr size, out UIntPtr bytesRead);

    private static int Main(string[] args)
    {
        if (args.Length == 1 && args[0] == "--self-test") return SelfTest() ? 0 : 1;
        if (args.Length != 1 || args[0] != "--worker") return 2;
        Result outcome;
        string? responseRequestId = null;
        try
        {
            var line = ReadBoundedLine();
            if (line is not null && TryParseRequest(line, out var request))
            {
                responseRequestId = request.RequestId;
                outcome = Probe(request);
            }
            else outcome = Result.Rejected("invalid_request");
        }
        catch
        {
            // Never serialize private OS exceptions, paths, memory or stack traces.
            outcome = Result.Rejected("worker_failed");
        }
        Console.Out.WriteLine(JsonSerializer.Serialize(new
        {
            schema = Schema, requestId = responseRequestId, status = outcome.Status,
            reason = outcome.Reason, bytesRead = outcome.BytesRead
        }));
        return 0;
    }

    private static bool SelfTest()
    {
        // Strict parser tests; Windows also self-probes its own process via read-only OS rights.
        var valid = JsonSerializer.Serialize(new
        {
            schema = Schema, pid = 1234,
            startedAtFileTime = "134064000000000001",
            address = 0x123400, byteLength = 4,
            requestId = "0123456789abcdef0123456789abcdef"
        });
        var malformed = new[]
        {
            valid.Replace("1234", "0", StringComparison.Ordinal),
            valid.Replace("134064000000000001", "nope", StringComparison.Ordinal),
            valid.Replace("0123456789abcdef0123456789abcdef", "invalid", StringComparison.Ordinal),
            valid.Replace("1192960", "3", StringComparison.Ordinal),
            valid.Replace("\"byteLength\":4", "\"byteLength\":513", StringComparison.Ordinal),
            valid.Replace("\"pid\":1234", "\"pid\":-1", StringComparison.Ordinal),
            valid.Replace("\"pid\":1234", "\"pid\":2147483648", StringComparison.Ordinal),
            valid[..^1] + ",\"secret\":true}",
            "{not-json}"
        };
        bool okay = TryParseRequest(valid, out var request) &&
            request.Pid == 1234 && request.ByteLength == 4 &&
            request.Address == 0x123400 &&
            malformed.All(x => !TryParseRequest(x, out _));
        if (okay && OperatingSystem.IsWindows()) okay = TestReadOwnProcess();
        Console.Out.WriteLine(okay ? "NATIVE_SELF_TEST_PASS" : "NATIVE_SELF_TEST_FAIL");
        return okay;
    }

    private static bool TestReadOwnProcess()
    {
        // An OS-level integration check of our own process, NEVER an FM game read.
        using var handle = OpenProcess(QueryLimitedInformation | VmRead, false, Environment.ProcessId);
        if (handle.IsInvalid || CurrentFileTime(handle) is null) return false;
        var name = new StringBuilder(1024);
        uint characters = (uint)name.Capacity;
        if (!QueryFullProcessImageName(handle, 0, name, ref characters) || characters == 0) return false;
        byte[] expected = { 15, 44, 71, 92 };
        var observed = new byte[expected.Length];
        var pinned = GCHandle.Alloc(expected, GCHandleType.Pinned);
        try
        {
            var ok = ReadProcessMemory(handle, pinned.AddrOfPinnedObject(), observed,
                new UIntPtr((uint)observed.Length), out var count);
            return ok && count.ToUInt64() == (ulong)expected.Length &&
                observed.AsSpan().SequenceEqual(expected);
        }
        finally
        {
            pinned.Free();
            CryptographicOperations.ZeroMemory(expected);
            CryptographicOperations.ZeroMemory(observed);
        }
    }

    private static string? ReadBoundedLine()
    {
        var buffer = new StringBuilder();
        while (true)
        {
            var next = Console.In.Read();
            if (next < 0 || next == '\n') return buffer.Length == 0 ? null : buffer.ToString();
            if (next == '\r') continue;
            if (buffer.Length == MaxInputCharacters) return null;
            buffer.Append((char)next);
        }
    }

    private static bool TryParseRequest(string json, out Request result)
    {
        result = default;
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return false;
            var keys = new HashSet<string>(StringComparer.Ordinal);
            foreach (var property in root.EnumerateObject())
            {
                if (!keys.Add(property.Name)) return false;
            }
            if (keys.Count != 6 || !keys.SetEquals(new[]
                { "schema", "pid", "startedAtFileTime", "address", "byteLength", "requestId" })) return false;

            if (root.GetProperty("schema").GetString() != Schema ||
                !root.GetProperty("pid").TryGetInt32(out var pid) ||
                !root.GetProperty("address").TryGetInt64(out var address) ||
                !root.GetProperty("byteLength").TryGetInt32(out var size)) return false;
            var startedAt = root.GetProperty("startedAtFileTime").GetString();
            var requestId = root.GetProperty("requestId").GetString();
            if (requestId is null || requestId.Length != 32 ||
                !requestId.All(c => c is >= '0' and <= '9' or >= 'a' and <= 'f') ||
                startedAt is null || startedAt.Length is < 18 or > 20 ||
                startedAt[0] == '0' || !startedAt.All(char.IsAsciiDigit) ||
                !ulong.TryParse(startedAt, NumberStyles.None, CultureInfo.InvariantCulture, out _) ||
                pid < 1 || address < 0x10000 || address > MaximumAddress || (address & 3) != 0 ||
                size < 1 || size > MaximumReadBytes || size - 1 > MaximumAddress - address) return false;
            result = new Request(pid, startedAt, address, size, requestId);
            return true;
        }
        catch (JsonException) { return false; }
        catch (InvalidOperationException) { return false; }
        catch (KeyNotFoundException) { return false; }
    }

    private static string? CurrentFileTime(SafeProcessHandle handle)
    {
        if (!GetProcessTimes(handle, out var creation, out _, out _, out _)) return null;
        return creation.Value.ToString(CultureInfo.InvariantCulture);
    }

    private static string? GetImagePath(SafeProcessHandle handle)
    {
        var name = new StringBuilder(1024);
        uint size = (uint)name.Capacity;
        if (!QueryFullProcessImageName(handle, 0, name, ref size) || size == 0 || size > 1024)
            return null;
        var path = name.ToString();
        if (path.Length < 9 || !char.IsAsciiLetter(path[0]) ||
            path[1] != ':' || path[2] != '\\' ||
            !string.Equals(Path.GetFileName(path), "fm.exe", StringComparison.OrdinalIgnoreCase))
            return null;
        return path;
    }

    private static bool IsSupportedImage(string path)
    {
        // Hashing the on-disk exe is a research identity check, NOT loaded-image attestation.
        using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        if (fs.Length < 1024 || fs.Length > 64L * 1024 * 1024) return false;
        byte[] header = new byte[4096];
        int read = fs.Read(header);
        if (read < 0x100 || header[0] != 'M' || header[1] != 'Z') return false;
        int pe = BinaryPrimitives.ReadInt32LittleEndian(header.AsSpan(0x3c, 4));
        if (pe < 0x40 || pe + 26 >= read ||
            header[pe] != 'P' || header[pe + 1] != 'E' ||
            header[pe + 2] != 0 || header[pe + 3] != 0 ||
            BinaryPrimitives.ReadUInt16LittleEndian(header.AsSpan(pe + 4, 2)) != 0x014c ||
            BinaryPrimitives.ReadUInt16LittleEndian(header.AsSpan(pe + 24, 2)) != 0x010b)
            return false;
        fs.Position = 0;
        var digest = Convert.ToHexString(SHA256.HashData(fs)).ToLowerInvariant();
        var profilePath = Path.Combine(AppContext.BaseDirectory, "fm2013-live-profile.json");
        using var profile = JsonDocument.Parse(File.ReadAllText(profilePath));
        var root = profile.RootElement;
        return root.GetProperty("edition").GetString() == "FM2013" &&
            root.GetProperty("build").GetString() == "13.3.3f359652" &&
            string.Equals(digest, root.GetProperty("binarySha256").GetString(), StringComparison.Ordinal);
    }

    private static Result Probe(Request request)
    {
        if (!OperatingSystem.IsWindows() || !Environment.Is64BitProcess)
            return Result.Rejected("unsupported_platform");

        // Deliberately omit PROCESS_VM_WRITE/PROCESS_VM_OPERATION/CREATE_THREAD,
        // PROCESS_ALL_ACCESS and debug-privilege escalation. No VirtualQueryEx.
        using var handle = OpenProcess(QueryLimitedInformation | VmRead, false, request.Pid);
        if (handle.IsInvalid)
        {
            var error = Marshal.GetLastWin32Error();
            return Result.Rejected(error == 5 ? "access_denied" :
                error == 87 ? "process_not_found" : "read_failed");
        }

        if (CurrentFileTime(handle) != request.StartedAtFileTime)
            return Result.Rejected("process_identity_changed");
        var image = GetImagePath(handle);
        if (image is null) return Result.Rejected("invalid_image");

        try { if (!IsSupportedImage(image)) return Result.Rejected("unsupported_build"); }
        catch { return Result.Rejected("invalid_image"); }

        if (CurrentFileTime(handle) != request.StartedAtFileTime ||
            !string.Equals(GetImagePath(handle), image, StringComparison.OrdinalIgnoreCase))
            return Result.Rejected("process_identity_changed");

        // This is only a bounded read-smoke probe. It does NOT validate RTTI,
        // player identity, field semantics, loaded image hash or career identity.
        var bytes = new byte[request.ByteLength];
        try
        {
            var ok = ReadProcessMemory(handle, new IntPtr(request.Address), bytes,
                new UIntPtr((uint)bytes.Length), out var count);
            if (!ok || count.ToUInt64() != (ulong)bytes.Length)
                return Result.Rejected("partial_or_invalid_read");
            if (CurrentFileTime(handle) != request.StartedAtFileTime)
                return Result.Rejected("process_identity_changed");
            return Result.Success(bytes.Length);
        }
        catch { return Result.Rejected("read_failed"); }
        finally { CryptographicOperations.ZeroMemory(bytes); }
    }
}
