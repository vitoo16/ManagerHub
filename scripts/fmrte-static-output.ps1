function Assert-FmrteOutputPath([string]$Path) {
    $full = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
    if ($full.StartsWith('C:\BraCa Soft\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Installation directories are read-only analysis targets.' }
    $root = [System.IO.Path]::GetPathRoot($full)
    if ($full.Substring($root.Length).Contains(':')) { throw 'Alternate data streams are not output files.' }
    if ([System.IO.File]::Exists($full) -or [System.IO.Directory]::Exists($full)) { throw 'Choose a fresh output file; existing files are never replaced.' }
    $parent = [System.IO.DirectoryInfo]::new([System.IO.Path]::GetDirectoryName($full))
    if (-not $parent.Exists) { throw 'Output parent directory must already exist.' }
    while ($null -ne $parent) {
        if ($parent.FullName.Equals('C:\BraCa Soft', [System.StringComparison]::OrdinalIgnoreCase) -or $parent.FullName.StartsWith('C:\BraCa Soft\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Installation directories are read-only analysis targets.' }
        if (($parent.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Output directories must not traverse links or junctions.' }
        $parent = $parent.Parent
    }
    return $full
}

function Write-FmrteStaticJson([string]$Path, [string]$Json) {
    $full = Assert-FmrteOutputPath $Path
    # CreateNew atomically rejects existing output files, including hardlinks.
    $output = [System.IO.FileStream]::new($full, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
        $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Json + [Environment]::NewLine)
        $output.Write($bytes, 0, $bytes.Length)
    } finally { $output.Dispose() }
}
