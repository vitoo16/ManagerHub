$ErrorActionPreference = 'Stop'
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('managerhub-static-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$fixture = Join-Path $testRoot 'fixture.dll'
# Compile our own fixture; never execute a proprietary target.
Add-Type -OutputAssembly $fixture -TypeDefinition @'
namespace ManagerHubFixture {
    public static class Calls {
        public static int Callee(int x) { return x + 1; }
        public static int Caller(int x) { return Callee(x); }
        public static int Constant() { return 0x06000001; }
        public static bool Compare(int x) { return x == 42; }
        public static int Branch(int x) {
            switch (x) { case 0: return 6; case 1: return 4; case 2: return 9; case 3: return 1; default: return -1; }
        }
    }
}
'@
$inventoryPath = Join-Path $testRoot 'inventory.json'
& (Join-Path $PSScriptRoot 'fmrte-pe-inventory.ps1') -Paths $fixture -OutputPath $inventoryPath
$inventory = Get-Content -LiteralPath $inventoryPath -Raw | ConvertFrom-Json
$type = @($inventory.types | Where-Object name -eq 'ManagerHubFixture.Calls')
if ($type.Count -ne 1 -or -not $inventory.hasMetadata) { throw 'Fixture type inventory failed.' }
if ($inventory.sha256 -ne (Get-FileHash -LiteralPath $fixture).Hash.ToLowerInvariant()) { throw 'Inventory digest mismatch.' }
$callee = $type[0].methods | Where-Object name -eq 'Callee'
$xrefPath = Join-Path $testRoot 'references.json'
& (Join-Path $PSScriptRoot 'fmrte-cil-xrefs.ps1') -Path $fixture -Tokens $callee.token -OutputPath $xrefPath
$xref = Get-Content -LiteralPath $xrefPath -Raw | ConvertFrom-Json
if ($xref.coverage -ne 'complete-file-backed-cil' -or $xref.issues.Count -ne 0) { throw 'CIL decoder did not cover own fixture.' }
if ($xref.references.Count -ne 1 -or $xref.references[0].name -ne 'Caller' -or $xref.references[0].opcode -ne 'call') { throw 'Expected exactly one call; a token-shaped constant must not become a reference.' }
if ($xref.mvid -ne $inventory.mvid -or $xref.sha256 -ne $inventory.sha256) { throw 'Cross-tool artifact identity mismatch.' }
$rejected = $false
try { & (Join-Path $PSScriptRoot 'fmrte-pe-inventory.ps1') -Paths $testRoot -OutputPath (Join-Path $testRoot 'unexpected.json') } catch { $rejected = $true }
if (-not $rejected) { throw 'Directory input should be rejected.' }
foreach ($scriptName in 'fmrte-pe-inventory.ps1','fmrte-cil-xrefs.ps1') {
    $rejected = $false
    try {
        if ($scriptName -eq 'fmrte-pe-inventory.ps1') { & (Join-Path $PSScriptRoot $scriptName) -Paths $fixture -OutputPath $fixture }
        else { & (Join-Path $PSScriptRoot $scriptName) -Path $fixture -Tokens $callee.token -OutputPath $fixture }
    } catch { $rejected = $true }
    if (-not $rejected) { throw 'Input overwrite must be rejected.' }
}
if ($inventory.sha256 -ne (Get-FileHash -LiteralPath $fixture).Hash.ToLowerInvariant()) { throw 'Fixture was mutated.' }
$aliasPath = Join-Path $testRoot 'fixture-alias.dll'
New-Item -ItemType HardLink -Path $aliasPath -Target $fixture | Out-Null
$realOutputDirectory = Join-Path $testRoot 'real-output'
New-Item -ItemType Directory -Path $realOutputDirectory | Out-Null
$junctionPath = Join-Path $testRoot 'linked-output'
New-Item -ItemType Junction -Path $junctionPath -Target $realOutputDirectory | Out-Null
foreach ($destination in $aliasPath, (Join-Path $junctionPath 'output.json')) {
    foreach ($scriptName in 'fmrte-pe-inventory.ps1','fmrte-cil-xrefs.ps1') {
        $rejected = $false
        try {
            if ($scriptName -eq 'fmrte-pe-inventory.ps1') { & (Join-Path $PSScriptRoot $scriptName) -Paths $fixture -OutputPath $destination }
            else { & (Join-Path $PSScriptRoot $scriptName) -Path $fixture -Tokens $callee.token -OutputPath $destination }
        } catch { $rejected = $true }
        if (-not $rejected) { throw 'Hardlink/junction outputs must be rejected.' }
    }
}
if ([System.IO.File]::Exists((Join-Path $realOutputDirectory 'output.json'))) { throw 'Junction target was written.' }
if ($inventory.sha256 -ne (Get-FileHash -LiteralPath $fixture).Hash.ToLowerInvariant()) { throw 'Hardlinked fixture was mutated.' }
$shortInstallPath = 'C:\BRACAS~1\FMRTE 13'
if ([System.IO.Directory]::Exists($shortInstallPath)) {
    $rejected = $false
    # Guard-only regression: never create anything in the installation.
    try { $null = Assert-FmrteOutputPath (Join-Path $shortInstallPath ('never-created-' + [guid]::NewGuid().ToString('N') + '.json')) } catch { $rejected = $true }
    if (-not $rejected) { throw 'Installation short-name alias must be rejected.' }
}
'PASS: metadata, hashes/MVID, exact call, token-shaped constant, extended opcode/switch decoding, directory/input-overwrite/hardlink/junction/installation-alias rejection.'
"Own fixture retained at $testRoot"
