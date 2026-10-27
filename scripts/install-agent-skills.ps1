# Install the curated ManagerHub external Agent Skills in this local working tree.
# Run in PowerShell at repository root: powershell -ExecutionPolicy Bypass -File scripts/install-agent-skills.ps1 -Agent codex
# Security: inspect upstream SKILL.md/scripts/licensing before running third-party code.
param(
  [ValidateSet("codex", "claude-code", "cursor", "github-copilot")]
  [string] $Agent = "codex",
  [switch] $WithTesting
)
$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Install Git first." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Install Node.js 22.20+ first." }
$nodeVersion = (& node --version).TrimStart('v').Split('-')[0]
$v = [version]$nodeVersion
if ($v -lt [version]"22.20.0") { throw "Skills CLI requires Node 22.20+; current: $nodeVersion" }
if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) { throw "Install npm / npx on Windows." }
function Install-SkillSet {
    param([string[]] $SkillArgs)
    Write-Host "Installing reviewed project-scope skills: $($SkillArgs -join ' ')" -ForegroundColor Cyan
    & npx.cmd --yes skills add @SkillArgs -a $Agent -y --copy
    if ($LASTEXITCODE -ne 0) { throw "Skills installation failed, exit $LASTEXITCODE" }
}
Install-SkillSet @("vercel-labs/agent-skills", "--skill", "web-design-guidelines", "--skill", "vercel-react-best-practices", "--skill", "vercel-composition-patterns")
Install-SkillSet @("https://github.com/Leonxlnx/taste-skill", "--skill", "design-taste-frontend")
Install-SkillSet @("pbakaus/impeccable")
if ($WithTesting) {
    Install-SkillSet @("anthropics/skills", "--skill", "webapp-testing", "--skill", "skill-creator")
    Install-SkillSet @("vercel-labs/skills", "--skill", "find-skills")
}
Write-Host "Local skills inventory:" -ForegroundColor Green
& npx.cmd --yes skills list
Write-Host "Review third-party installed files before committing; see docs/engineering/agent-skills-research.md"
