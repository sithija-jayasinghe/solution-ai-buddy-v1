# Combined Installer for Error Buddy (CLI + VS Code Extension)

# Variables
$projectRoot = "c:\ICET\My Projects\solution ai buddy\error-solution-ai-buddy"
$cliPath = "$projectRoot\cli"
$extensionPath = "$projectRoot\extension"

# Step 1: Install CLI Tool
Write-Host "Installing Error Buddy CLI..." -ForegroundColor Cyan
Set-Location $cliPath
npm install
npm link
Write-Host "CLI installed successfully!" -ForegroundColor Green

# Step 2: Package VS Code Extension
Write-Host "Packaging VS Code Extension..." -ForegroundColor Cyan
Set-Location $extensionPath
if (-Not (Get-Command vsce -ErrorAction SilentlyContinue)) {
    Write-Host "VSCE not found. Installing..." -ForegroundColor Yellow
    npm install -g @vscode/vsce
}
vsce package --allow-missing-repository

# Step 3: Install VS Code Extension
$vsixFile = Get-ChildItem -Path $extensionPath -Filter "*.vsix" | Select-Object -First 1
if ($vsixFile) {
    Write-Host "Installing VS Code Extension..." -ForegroundColor Cyan
    code --install-extension $vsixFile.FullName
    Write-Host "VS Code Extension installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Error: VSIX file not found. Packaging might have failed." -ForegroundColor Red
}

# Return to project root
Set-Location $projectRoot
Write-Host "Setup complete! Error Buddy (CLI + Extension) is ready to use." -ForegroundColor Green