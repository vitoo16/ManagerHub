<#
.SYNOPSIS
    Safe branch cleanup script for 49 merged PR branches in vitoo16/ManagerHub.

.DESCRIPTION
    1. Holds a hardcoded list of 49 verified branches and their exact SHAs.
    2. Compares local/remote refs against expected SHAs to prevent accidental deletion of branches with new commits.
    3. Runs in DRY-RUN mode by default (no deletions).
    4. Deletes remote branches only when -Apply is supplied AND user explicitly types CONFIRM.
    5. Automatically falls back to 'git push origin --delete' if 'gh' CLI is not authenticated.

.PARAMETER Apply
    Executes actual deletion after confirmation. Default is dry-run.

.PARAMETER UseGitPush
    Forces usage of 'git push origin --delete' instead of 'gh api'.

.EXAMPLE
    .\cleanup-merged-branches.ps1
    # Dry-run audit

.EXAMPLE
    .\cleanup-merged-branches.ps1 -Apply
    # Validates SHAs and deletes after prompt

.EXAMPLE
    .\cleanup-merged-branches.ps1 -Apply -UseGitPush
    # Deletes using git push instead of gh
#>

[CmdletBinding()]
param (
    [switch]$Apply,
    [switch]$UseGitPush,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repo = "vitoo16/ManagerHub"

# 49 verified merged branches and their expected tip commit SHAs as of audit 2026-11-02
$branchesToClean = @(
    @{ Name = "docs/afe-member-envelope-evidence-20261029"; Sha = "0dcfb8b567fb36faf4f77b27364a60407a721297" },
    @{ Name = "docs/afe-vs-modern-fmf-format-gate-20261029"; Sha = "96f66494fce98570e3ec0db703da6bfc6728ac4c" },
    @{ Name = "docs/member-prefix-analysis-20261029"; Sha = "0c9e0e7548d54cf5b520d5b054a68b75ca9b4005" },
    @{ Name = "feat/afe-bounded-codec-validation-20261030"; Sha = "19b07d562f352a16c49623ea8b21ee7e6435793d" },
    @{ Name = "feat/afe-cohort-byte-profile-20261030"; Sha = "74c1a5db90890c22b59be0abed409645edd9858a" },
    @{ Name = "feat/afe-cross-save-full-catalogue-diff-20261031"; Sha = "2638e6defa8ff919a2906ce845552288cf79f80b" },
    @{ Name = "feat/afe-directory-unparsed-metadata-20261030"; Sha = "cc8f150559ad11d2306560e327444897759aea99" },
    @{ Name = "feat/afe-envelope-consistency-20261030"; Sha = "7d11d845be215070c3c6c59958d470fff5542678" },
    @{ Name = "feat/afe-equal-size-gap-comparison-20261030"; Sha = "8c1c4a7167615bdff89a343c86343f31d5132dbb" },
    @{ Name = "feat/afe-gap-complete-marker-audit-20261030"; Sha = "5078a937c27564dc97ff71ecb25c6d41f9d606bb" },
    @{ Name = "feat/afe-header-directory-pointer-20261030"; Sha = "e0064d08b639db518490bf7c46dd811a7097df1f" },
    @{ Name = "feat/afe-local-batch-codec-catalogue-20261030"; Sha = "74538516141535a6e79b9ad750e0d21db7b62d68" },
    @{ Name = "feat/afe-member-envelope-consistency-20261029"; Sha = "2532a4d3f7a116499f11b12769229626d210cd55" },
    @{ Name = "feat/afe-nested-directory-rgman-20261030"; Sha = "2798822b32091725ef2faf4b22a6a976053ab846" },
    @{ Name = "feat/afe-nested-member-structure-summary-20261030"; Sha = "2df7f3b8a041c0a959c143994b3bf0866d6760f8" },
    @{ Name = "feat/afe-node-consumed-bytes-probe-20261030"; Sha = "d23a90f92991e3b6176a789a734656b20920b45d" },
    @{ Name = "feat/afe-raw-deflate-trials-20261030"; Sha = "6e81b3d5e749304b411a3efc4ac2726e45105c2d" },
    @{ Name = "feat/afe-unindexed-gap-audit-20261030"; Sha = "dd2067cf7c3a98c8e11e84ee817fad2b45e11c85" },
    @{ Name = "feat/afe-unindexed-gap-marker-analysis-20261029"; Sha = "0f80ea5492e3176862eafcd82e541df0768402e7" },
    @{ Name = "feat/afe-validated-member-decoder-20261030"; Sha = "c582faa1151983921b252d11ab10a36dbb9f5de1" },
    @{ Name = "feat/browser-nested-afe-directory-20261030"; Sha = "53907421dfd6ddb8f0b5cf7f0801b442b2de2b3f" },
    @{ Name = "feat/member-post-prefix-diagnostics-20261029"; Sha = "68ebf07f743d9a22d16504f651713960eb12ba68" },
    @{ Name = "feat/read-only-member-envelope-probe-20261029"; Sha = "021d87f6ebcfbe47f62f817c5bba0920bc739874" },
    @{ Name = "feat/save-library-gap-diagnostics-20261029"; Sha = "4d12f045bb8b1002ea82e1f5191cb3456e7452eb" },
    @{ Name = "fix/afe-batch-index-integrity-20261030"; Sha = "eb70822e2f43f48bda13aaa46cfd748fda5d2aff" },
    @{ Name = "fix/afe-codec-trailing-data-checks-20261030"; Sha = "845b1d51c99dd9c4bff50d56435dbf8095b4a1a2" },
    @{ Name = "fix/afe-cross-save-pair-selection-20261030"; Sha = "269e9ec4df0cfe653d6c25a4d9e9ee6acffb402f" },
    @{ Name = "fix/afe-cross-save-stratified-samples-20261030"; Sha = "4374852e54128392e8dce49ea5068b2b630d33b1" },
    @{ Name = "fix/afe-full-member-hash-evidence-20261030"; Sha = "5f85100899eaac3b6728b83fe7321dc1c526e1d0" },
    @{ Name = "fix/afe-header-marker-length-validation-20261030"; Sha = "e768f811b6fc0d37db4d7eceed55e8c3ddbbf1a8" },
    @{ Name = "fix/afe-validated-decoder-envelope-bound-20261030"; Sha = "61c3af0bb3f3a987c1e6b34cf7c8d175028eb868" },
    @{ Name = "fix/archive-directory-integrity-20261030"; Sha = "7a755ae58b5be2d5785677bb722e6bfe21846748" },
    @{ Name = "fix/archive-index-candidate-scan-bound-20261029"; Sha = "f7f67de33e16dc7d24bf1399fbed0c69b6f96613" },
    @{ Name = "fix/archive-member-boundary-afe-20261029"; Sha = "612c27010dac610a2a8e4e22f962bfa27e88a964" },
    @{ Name = "fix/save-inspection-metadata-sanitize-20261030"; Sha = "bc508bcc21e85f61acd21de5a373f7fc8a709e33" },
    @{ Name = "perf/afe-cross-save-index-only-20261030"; Sha = "8d867e9412affeafe38e2c52ce97f31cec993ea2" },
    @{ Name = "perf/save-library-bounded-members-20261030"; Sha = "9f3f79445b5803d07254db94e9fa5e4813313b08" },
    @{ Name = "research/afe-cross-save-validation-20261030"; Sha = "484da6e75b50d1cbbbb331320c4fa3e8d0c3b93e" },
    @{ Name = "research/afe-framed-codec-signatures-20261030"; Sha = "f4ba107e23bae47d03bd2c105897484350384a8e" },
    @{ Name = "research/afe-raw-lz4-block-20261030"; Sha = "00e716f43808401471e84b644eaed91a574ad365" },
    @{ Name = "research/afe-targeted-codec-falsification-20261030"; Sha = "b8059e0f2565b5531b54f96b23e901c191b0e721" },
    @{ Name = "test/afe-container-trailing-index-20261029"; Sha = "83b771abf50afd265996a627cb08f3bd15eb588f" },
    @{ Name = "test/archive-index-69-member-fixture-20261029"; Sha = "e549b3113c5606e05e6da673d28c043d794ca869" },
    @{ Name = "test/archive-index-real-shape-20261029"; Sha = "1d0608c11f96ed8d53d5cb03bf01df2ef88faeb0" },
    @{ Name = "work/archive-index-integration-20261029"; Sha = "029895ddf723d587ffff0e680a5c482bc818f2c1" },
    @{ Name = "work/save-error-i18n-audit-20261029"; Sha = "0c96d9f5cbba802558ac257ce215ef52ca447160" },
    @{ Name = "work/save-index-integration-test-20261029"; Sha = "abfd3d866983cc982a3bc6a6bafb7eed541ddef0" },
    @{ Name = "work/save-metadata-persistence-20261029"; Sha = "16dcc30a58494dd4615847010c97c999fcf5d287" },
    @{ Name = "work/save-metadata-recovery-20261029"; Sha = "8f45ba0d2d0f00ac6369f5a90f69873aeecc0aca" }
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ManagerHub Branch Cleanup - 49 Merged Branches Verification   " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
if ($Apply) {
    Write-Host "Execution Mode: APPLY (WILL DELETE AFTER CONFIRMATION)" -ForegroundColor Red
}
else {
    Write-Host "Execution Mode: DRY-RUN (AUDIT ONLY, NO DELETIONS)" -ForegroundColor Yellow
}

# Determine delete method
$method = "gh"
if ($UseGitPush) {
    $method = "git"
}
else {
    try {
        $null = & gh --version 2>&1
        $auth = & gh auth status 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[INFO] gh CLI not authenticated. Falling back to git push origin --delete." -ForegroundColor Yellow
            $method = "git"
        }
    }
    catch {
        Write-Host "[INFO] gh CLI not found. Falling back to git push origin --delete." -ForegroundColor Yellow
        $method = "git"
    }
}
Write-Host "Deletion Method: $method" -ForegroundColor Gray

# Refresh remote refs
Write-Host "`nFetching latest refs from origin..." -ForegroundColor Gray
& git fetch origin --prune | Out-Null

$verifiedList = @()
$mismatchList = @()
$missingList = @()

foreach ($item in $branchesToClean) {
    $bName = $item.Name
    $expectedSha = $item.Sha
    
    $currentSha = ""
    try {
        $currentSha = (& git rev-parse "origin/$bName" 2>$null).Trim()
    }
    catch {
        $currentSha = ""
    }

    if ([string]::IsNullOrWhiteSpace($currentSha)) {
        $missingList += $bName
        Write-Host " [-] $bName : Already deleted on remote" -ForegroundColor DarkGray
    }
    elseif ($currentSha -eq $expectedSha) {
        $verifiedList += @{ Name = $bName; Sha = $currentSha }
        Write-Host " [OK] $bName ($($expectedSha.Substring(0,7))) : Verified SHA match" -ForegroundColor Green
    }
    else {
        $mismatchList += @{ Name = $bName; Expected = $expectedSha; Actual = $currentSha }
        Write-Host " [!] WARNING: $bName SHA mismatch! Expected: $expectedSha, Found: $currentSha" -ForegroundColor Red
    }
}

Write-Host "`n--- VERIFICATION SUMMARY ---" -ForegroundColor Cyan
Write-Host "Total branches in manifest : $($branchesToClean.Count)"
Write-Host "Safe to delete (matched)   : $($verifiedList.Count)" -ForegroundColor Green
Write-Host "Mismatched (will preserve) : $($mismatchList.Count)" -ForegroundColor $(if ($mismatchList.Count -gt 0) { "Red" } else { "Gray" })
Write-Host "Already deleted on remote  : $($missingList.Count)" -ForegroundColor Gray

if ($mismatchList.Count -gt 0) {
    Write-Host "`nWARNING: $($mismatchList.Count) branch(es) have new commits after audit. These will NOT be deleted." -ForegroundColor Red
}

if (-not $Apply) {
    Write-Host "`n[DRY-RUN COMPLETE] No branches were deleted." -ForegroundColor Yellow
    Write-Host "To execute deletion of the $($verifiedList.Count) verified branches, run:" -ForegroundColor White
    Write-Host "   .\cleanup-merged-branches.ps1 -Apply`n" -ForegroundColor Cyan
    exit 0
}

if ($verifiedList.Count -eq 0) {
    Write-Host "`nNo branches require deletion." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nYOU ARE ABOUT TO DELETE $($verifiedList.Count) BRANCHES ON REMOTE REPOSITORY '$repo'." -ForegroundColor Red
if (-not $Force) {
    $confirmation = Read-Host "Type 'CONFIRM' to proceed with deletion"
    if ($confirmation -ne "CONFIRM") {
        Write-Host "Deletion cancelled. No branches modified." -ForegroundColor Yellow
        exit 0
    }
}
else {
    Write-Host "Force flag passed. Proceeding with deletion without interactive prompt..." -ForegroundColor Yellow
}

Write-Host "`nDeleting remote branches..." -ForegroundColor Yellow
$successCount = 0
$failCount = 0

$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"

if ($method -eq "git") {
    $batchSize = 10
    for ($i = 0; $i -lt $verifiedList.Count; $i += $batchSize) {
        $count = [Math]::Min($batchSize, $verifiedList.Count - $i)
        $batch = $verifiedList[$i..($i + $count - 1)]
        $batchNames = $batch | ForEach-Object { $_.Name }
        Write-Host "Deleting batch ($($i + 1) to $($i + $count) of $($verifiedList.Count))..." -ForegroundColor Cyan
        
        & git push origin --delete $batchNames
        if ($LASTEXITCODE -eq 0) {
            foreach ($item in $batch) {
                Write-Host "  - $($item.Name) : [DELETED]" -ForegroundColor Green
                $successCount++
            }
        }
        else {
            Write-Host "  [!] Batch push failed, falling back to individual deletes..." -ForegroundColor Yellow
            foreach ($item in $batch) {
                Write-Host "  Deleting $($item.Name)..." -NoNewline
                & git push origin --delete $item.Name
                if ($LASTEXITCODE -eq 0) {
                    Write-Host " [DELETED]" -ForegroundColor Green
                    $successCount++
                }
                else {
                    Write-Host " [FAILED]" -ForegroundColor Red
                    $failCount++
                }
            }
        }
    }
}
else {
    foreach ($item in $verifiedList) {
        $bName = $item.Name
        Write-Host "Deleting $bName..." -NoNewline
        & gh api -X DELETE "repos/$repo/git/refs/heads/$bName"
        if ($LASTEXITCODE -eq 0) {
            Write-Host " [DELETED]" -ForegroundColor Green
            $successCount++
        }
        else {
            Write-Host " [FAILED]" -ForegroundColor Red
            $failCount++
        }
    }
}

$ErrorActionPreference = $prevEAP

Write-Host "`n--- FINAL RESULT ---" -ForegroundColor Cyan
Write-Host "Successfully deleted : $successCount" -ForegroundColor Green
Write-Host "Failed               : $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Gray" })
Write-Host "Cleanup completed." -ForegroundColor Cyan
