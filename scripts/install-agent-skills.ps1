# Install curated Agent Skills locally for ManagerHub. Inspect upstream source/licensing first.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/install-agent-skills.ps1 -Agent codex
# Installs official Vercel UX, current Taste for branding, Impeccable app UX,
# and official GreenSock GSAP skills. Does NOT run inside GitHub or on the user's machine automatically.
param(
    [ValidateSet("codex", "claude-code", "cursor", "github-copilot")]
    [string] $Agent = "codex",
    [switch] $WithTesting,
    [switch] $WithScrollMotion
)
$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git required" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22.20+ required" }
$nodeVersion = (& node --version).TrimStart('v').Split('-')[0]
if ([version]$nodeVersion -lt [version]"22.20.0") { throw "Update Node.js to 22.20+" }
if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) { throw "npm/npx required on Windows" }
function Install-SkillSet {
    param([string[]] $SkillArgs)
    Write-Host ("Installing: " + ($SkillArgs -join " ")) -ForegroundColor Cyan
    & npx.cmd --yes skills add @SkillArgs -a $Agent -y --copy
    if ($LASTEXITCODE -ne 0) { throw "Install failed ($LASTEXITCODE): $($SkillArgs -join ' ')" }
}
Install-SkillSet @("vercel-labs/agent-skills", "--skill", "web-design-guidelines", "--skill", "vercel-react-best-practices", "--skill", "vercel-composition-patterns")
Install-SkillSet @("https://github.com/Leonxlnx/taste-skill", "--skill", "design-taste-frontend")
Install-SkillSet @("pbakaus/impeccable")
$gsapArgs = @("https://github.com/greensock/gsap-skills", "--skill", "gsap-core", "--skill", "gsap-react", "--skill", "gsap-timeline", "--skill", "gsap-plugins", "--skill", "gsap-performance")
if ($WithScrollMotion) { $gsapArgs += @("--skill", "gsap-scrolltrigger") }
Install-SkillSet $gsapArgs
if ($WithTesting) {
    Install-SkillSet @("anthropics/skills", "--skill", "webapp-testing", "--skill", "skill-creator")
    Install-SkillSet @("vercel-labs/skills", "--skill", "find-skills")
}
Write-Host "Installed locally (review source before committing):" -ForegroundColor Green
& npx.cmd --yes skills list
& npx.cmd --yes skills check
Write-Host "See docs/implementation/04-motion-skills-and-references.md; GSAP runtime npm install is a separate phase-1 application dependency." -ForegroundColor Yellow
