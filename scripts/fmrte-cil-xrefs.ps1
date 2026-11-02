param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string[]]$Tokens,
    [Parameter(Mandatory)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'fmrte-static-output.ps1')
$outputFullPath = Assert-FmrteOutputPath $OutputPath
if ($outputFullPath.Equals((Resolve-Path -LiteralPath $Path).Path, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Output must not overwrite an input artifact.' }
# File-backed CIL references, not runtime reachability or a decompiler.
$wanted = @{}
foreach ($token in $Tokens) { $wanted[[Convert]::ToInt32($token,16)] = $true }
$opcodes = @{}
foreach ($field in [System.Reflection.Emit.OpCodes].GetFields([System.Reflection.BindingFlags]'Public,Static')) {
    $op = $field.GetValue($null)
    $opcodes[([int]$op.Value -band 65535)] = $op
}
$stream = [System.IO.File]::OpenRead((Resolve-Path -LiteralPath $Path).Path)
$reader = [System.Reflection.PortableExecutable.PEReader]::new($stream)
try {
    $md = [System.Reflection.Metadata.PEReaderExtensions]::GetMetadataReader($reader)
    function Get-TypeName($handle) {
        $td=$md.GetTypeDefinition($handle); $parent=$td.GetDeclaringType()
        if (-not $parent.IsNil) { return (Get-TypeName $parent)+'+'+$md.GetString($td.Name) }
        return ($md.GetString($td.Namespace)+'.'+$md.GetString($td.Name)).TrimStart('.')
    }
    $issues = [System.Collections.Generic.List[object]]::new()
    $matches = @(foreach ($th in $md.TypeDefinitions) {
        $td=$md.GetTypeDefinition($th)
        foreach ($mh in $td.GetMethods()) {
            $m=$md.GetMethodDefinition($mh)
            if ($m.RelativeVirtualAddress -eq 0 -or ([int]$m.ImplAttributes -band 3) -ne 0) { continue }
            try {
            $body=[System.Reflection.Metadata.PEReaderExtensions]::GetMethodBody($reader,$m.RelativeVirtualAddress)
            $il=$body.GetILBytes(); $cursor=0
            while ($cursor -lt $il.Length) {
                $start=$cursor; $code=[int]$il[$cursor]; $cursor++
                if ($code -eq 254) {
                    if ($cursor -ge $il.Length) { throw 'Truncated extended opcode.' }
                    $code=65024+[int]$il[$cursor]; $cursor++
                }
                if (-not $opcodes.ContainsKey($code)) { throw "Unknown opcode $code at $start" }
                $op=$opcodes[$code]
                $size=switch ($op.OperandType.ToString()) {
                    'InlineNone' {0}
                    {$_ -in 'ShortInlineBrTarget','ShortInlineI','ShortInlineVar'} {1}
                    'InlineVar' {2}
                    {$_ -in 'InlineI8','InlineR'} {8}
                    'InlineSwitch' {
                        if ($cursor+4 -gt $il.Length) { throw 'Truncated switch.' }
                        $count=[BitConverter]::ToInt32($il,$cursor)
                        if ($count -lt 0 -or $count -gt ($il.Length-$cursor-4)/4) { throw 'Invalid switch length.' }
                        4+4*$count
                    }
                    default {4}
                }
                if ($cursor+$size -gt $il.Length) { throw 'Truncated operand.' }
                if ($op.OperandType.ToString() -in 'InlineMethod','InlineField','InlineTok','InlineType') {
                    $target=[BitConverter]::ToInt32($il,$cursor)
                    if ($wanted.ContainsKey($target)) {
                        @{type=(Get-TypeName $th); caller=('0x{0:x8}' -f [System.Reflection.Metadata.Ecma335.MetadataTokens]::GetToken([System.Reflection.Metadata.EntityHandle]$mh)); name=$md.GetString($m.Name); rva=$m.RelativeVirtualAddress; ilOffset=$start; opcode=$op.Name; target=('0x{0:x8}' -f $target)}
                    }
                }
                $cursor+=$size
            }
            } catch {
                $issues.Add(@{caller=('0x{0:x8}' -f [System.Reflection.Metadata.Ecma335.MetadataTokens]::GetToken([System.Reflection.Metadata.EntityHandle]$mh)); detail=$_.Exception.Message})
            }
        }
    })
    $result = @{path=(Resolve-Path -LiteralPath $Path).Path; sha256=(Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant(); mvid=$md.GetGuid($md.GetModuleDefinition().Mvid).ToString(); requestedTokens=$Tokens; references=$matches; issues=$issues.ToArray(); coverage=$(if ($issues.Count) {'partial'} else {'complete-file-backed-cil'})}
    Write-FmrteStaticJson $outputFullPath ($result | ConvertTo-Json -Depth 6)
} finally { $reader.Dispose(); $stream.Dispose() }
