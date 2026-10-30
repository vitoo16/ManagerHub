param(
    [Parameter(Mandatory)][string[]]$Paths,
    [Parameter(Mandatory)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'fmrte-static-output.ps1')
$outputFullPath = Assert-FmrteOutputPath $OutputPath
foreach ($candidate in $Paths) {
    if ($outputFullPath.Equals((Resolve-Path -LiteralPath $candidate).Path, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Output must not overwrite an input artifact.' }
}
# Static metadata only: never Assembly.Load, reflection-load or execute targets.
$records = foreach ($candidate in $Paths) {
    $resolved = (Resolve-Path -LiteralPath $candidate).Path
    $file = Get-Item -LiteralPath $resolved
    if ($file.PSIsContainer) { throw 'Pass individual PE files, not directories.' }
    $stream = [System.IO.File]::OpenRead($resolved)
    $reader = $null
    try {
        $reader = [System.Reflection.PortableExecutable.PEReader]::new($stream)
        $header = $reader.PEHeaders
        $types = @()
        $references = @()
        $resources = @()
        $assembly = $null
        $mvid = $null
        if ($reader.HasMetadata) {
            $md = [System.Reflection.Metadata.PEReaderExtensions]::GetMetadataReader($reader)
            $assembly = if ($md.IsAssembly) { $ad = $md.GetAssemblyDefinition(); @{name=$md.GetString($ad.Name); version=$ad.Version.ToString()} } else { $null }
            $mvid = $md.GetGuid($md.GetModuleDefinition().Mvid).ToString()
            function Get-TypeName($handle) {
                $td = $md.GetTypeDefinition($handle)
                $parent = $td.GetDeclaringType()
                if (-not $parent.IsNil) { return (Get-TypeName $parent) + '+' + $md.GetString($td.Name) }
                return ($md.GetString($td.Namespace) + '.' + $md.GetString($td.Name)).TrimStart('.')
            }
            $types = @(foreach ($handle in $md.TypeDefinitions) {
                $td = $md.GetTypeDefinition($handle)
                $methods = @(foreach ($mh in $td.GetMethods()) {
                    $method = $md.GetMethodDefinition($mh)
                    $import = $method.GetImport()
                    @{token=('0x{0:x8}' -f [System.Reflection.Metadata.Ecma335.MetadataTokens]::GetToken([System.Reflection.Metadata.EntityHandle]$mh)); name=$md.GetString($method.Name); rva=$method.RelativeVirtualAddress; import= $(if (-not $import.Name.IsNil) {$md.GetString($import.Name)} else {$null})}
                })
                @{name=(Get-TypeName $handle); token=('0x{0:x8}' -f [System.Reflection.Metadata.Ecma335.MetadataTokens]::GetToken([System.Reflection.Metadata.EntityHandle]$handle)); methods=$methods}
            })
            $references = @(foreach ($h in $md.AssemblyReferences) { $r=$md.GetAssemblyReference($h); @{name=$md.GetString($r.Name); version=$r.Version.ToString()} })
            $resources = @(foreach ($h in $md.ManifestResources) { $r=$md.GetManifestResource($h); @{name=$md.GetString($r.Name); offset=$r.Offset; embedded=$r.Implementation.IsNil} })
        }
        [ordered]@{path=$resolved; sha256=(Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash.ToLowerInvariant(); bytes=$file.Length; fileVersion=$file.VersionInfo.FileVersion; machine=$header.CoffHeader.Machine.ToString(); hasMetadata=$reader.HasMetadata; corFlags=$(if ($header.CorHeader) {$header.CorHeader.Flags.ToString()} else {$null}); assembly=$assembly; mvid=$mvid; references=$references; resources=$resources; types=$types}
    } finally {
        if ($null -ne $reader) { $reader.Dispose() }
        $stream.Dispose()
    }
}
Write-FmrteStaticJson $outputFullPath ($records | ConvertTo-Json -Depth 12)
