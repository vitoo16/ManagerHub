# FMRTE13 alternate file source

**CONFIRMED:** an alternate loader opens a read-only FileStream and presents it to the common address-read helpers. **INFERRED:** this is an address-indexed file source. **UNKNOWN:** which file format and profile are intended. No AFE `.fm` decoder is demonstrated by these methods.

Source: `C:\BraCa Soft\FMRTE 13\FMRTE.exe`, version/assembly `13.3.3.62`, x86/.NET4; SHA-256 `c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae`, MVID `3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6`. Canonical source evidence `ev_cd0cfcfea5622bc352c978da5c834b6caefe70f65195afe8a4f9fbb5c411ec7d`; build-bound method coordinates and prior P/Invoke evidence are in [the manifest](evidence-manifest.json).

## File loader

`0x06000566`, RVA193140, accepts a path and checks `File.Exists`. It constructs GameProcess, assigns placeholder Pointer `74565` (`0x12345`), EndPoint `344865` (`0x54321`) and Process=null at IL53–81. These constants are placeholders used in this path, not discovered game addresses or Windows handles.

It sets `GameProcess.accessMethod` (`0x040009ae`) to literal 1. An existing shared fileStream is closed before the replacement is stored. At IL162–170 it constructs `FileStream(path, 3, 1, 1)`: FileMode.Open, FileAccess.Read, FileShare.Read. `GameProcess.fileStream` is field `0x040009af`. This path does not request file write access.

The new GameProcess becomes the shared read context. Description/FileName are populated, and reflected profiles are tested through `0x0600089b` with source-mode argument 1. A fallback profile is also constructed later if none was selected. There is no AFE header, directory or decompression operation in this loader's recovered body. Validation inside individual profiles remains only partly traced; absence here is not an assembly-wide claim.

## Common reads

| Method / RVA | Source selection and byte access |
|---|---|
| `0x06000425` / 158656 | Mode 0 calls ReadProcessMemory at IL58 with its explicit handle. Alternate mode takes a lock, `fileStream.Seek(address, Begin)` at IL108 and `Read(buffer,0,count)` at IL128, recording the returned count. |
| `0x06000427` / 158916 | Mode 0 gets the shared process pointer and calls ReadProcessMemory at IL83. Alternate mode rejects a negative signed address, locks the shared context, seeks directly to the supplied numeric address at IL146 and reads at IL166. |

There is no address relocation, file-member lookup or decompression between these seeks and reads. This supports an address-indexed source interpretation, but it does **not** establish a Windows dump format, a full process-image format or an ordinary FM save format. A caller/profile may impose additional structure elsewhere.

## Recovered writer does not mirror the file path

`0x06000448`, RVA160944, contains guard state whose full semantics remain unresolved. One sentinel-state branch returns the requested count without reaching the OS write call. Otherwise it requires a non-null GameProcess.Process, checks HasExited and other guard state, then calls WriteProcessMemory (`0x06000988`) at IL205 and returns bytes written. A null Process takes its failure path (`-1`).

This body contains no Stream.Write and does not switch on `accessMethod` to write the alternate file. The file loader explicitly creates a null Process and a read-only stream, so the traced CA/PA setter-to-448 path does not provide direct file writeback in that mode. This is a static control-flow conclusion; no file was opened through FMRTE and no write was attempted. It does not exclude other file-writing functions elsewhere in the application.

## Consequence for ManagerHub

Keep [AFE container research](05-offline-save-format.md) separate from live-memory layout and [field arithmetic](14-fmrte13-field-transforms.md). Recovering an address read and reversible field transform does not supply player catalogs or byte positions in the user's `.fm` file. No private save was supplied to FMRTE or uploaded, and no game/installation/save file was changed by this investigation.
