# FlowCV Manager per-user installer. Does not require Administrator privileges.
# NEVER copies Documents\FlowCV-Local-Manager, cookies, or the user's CV archive.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $here 'FlowCV-Local-Manager'
$destination = Join-Path $env:LOCALAPPDATA 'Programs\FlowCV Manager'
$data = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'FlowCV-Local-Manager'
try {
    if (-not (Test-Path (Join-Path $source 'server.mjs'))) { throw 'Cartella FlowCV-Local-Manager mancante nell installer.' }
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $node) { throw 'Node.js 22+ non trovato. Installa Node.js da https://nodejs.org/ e riprova.' }
    $versionText = & $node.Source '--version'
    if ($LASTEXITCODE -ne 0) { throw 'Non riesco a verificare Node.js.' }
    if ([int]($versionText -replace '^v(\d+).*','$1') -lt 22) { throw 'Serve Node.js 22 o superiore.' }

    # Stop a running manager that was launched from the extracted source tree too.
    # Does not terminate unrelated services: launcher checks PID + local token.
    try { & $node.Source (Join-Path $source 'launcher.mjs') '--stop' 2>$null | Out-Null } catch { }
    # Stop any prior installed server before replacing executable code.
    if (Test-Path (Join-Path $destination 'launcher.mjs')) {
        try { & $node.Source (Join-Path $destination 'launcher.mjs') '--stop' 2>$null | Out-Null } catch { }
    }
    New-Item -ItemType Directory -Force -Path $destination | Out-Null
    # Explicit allowlist; never copy storage or secrets into installation.
    $files = @('app.js','bridge.mjs','launcher.mjs','server.mjs','index.html','style.css',
        'favicon.svg','FlowCV-Manager.ico','FlowCV-Manager.vbs','Avvia-FlowCV.cmd','Arresta-FlowCV.cmd',
        'Crea-collegamento-desktop.vbs','README.md','CHANGELOG.md')
    foreach ($file in $files) {
        $from = Join-Path $source $file
        if (-not (Test-Path $from)) { throw "File richiesto mancante: $file" }
        Copy-Item -LiteralPath $from -Destination (Join-Path $destination $file) -Force
    }
    # Remove obsolete automated-login module on upgrades from v0.6.
    Remove-Item -LiteralPath (Join-Path $destination 'browser-auth.mjs') -Force -ErrorAction SilentlyContinue
    $shell = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath('Desktop')
    $start = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
    $target = Join-Path $env:WINDIR 'System32\wscript.exe'
    foreach ($folder in @($desktop,$start)) {
        New-Item -ItemType Directory -Force -Path $folder | Out-Null
        $link = $shell.CreateShortcut((Join-Path $folder 'FlowCV Manager.lnk'))
        $link.TargetPath = $target
        $link.Arguments = '//nologo "' + (Join-Path $destination 'FlowCV-Manager.vbs') + '"'
        $link.WorkingDirectory = $destination
        $link.IconLocation = (Join-Path $destination 'FlowCV-Manager.ico') + ',0'
        $link.Description = 'FlowCV Manager - Archivio curriculum locale'
        $link.Save()
    }
    Write-Host ''
    Write-Host 'FlowCV Manager installato correttamente.' -ForegroundColor Green
    Write-Host "Applicazione: $destination"
    Write-Host "Archivio personale (non modificato): $data"
    Write-Host 'Icona creata su Desktop e nel menu Start.'
    Write-Host 'Puoi avviarla subito dal collegamento.'
} catch {
    Write-Host "ERRORE: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
