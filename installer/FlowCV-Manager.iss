#define AppName "FlowCV Manager"
#define Version "0.6.3"
[Setup]
AppId={{A727F06A-34EA-41E7-9570-921C48C50A43}
AppName={#AppName}
AppVersion={#Version}
AppPublisher=LucaXTech
DefaultDirName={localappdata}\Programs\FlowCV Manager
DefaultGroupName=FlowCV Manager
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=FlowCV-Manager-Setup-{#Version}
Compression=lzma
SolidCompression=yes
SetupIconFile=..\FlowCV-Local-Manager\FlowCV-Manager.ico
UninstallDisplayIcon={app}\FlowCV-Manager.ico
WizardStyle=modern
ArchitecturesAllowed=x64compatible
[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "it"; MessagesFile: "compiler:Languages\Italian.isl"
[CustomMessages]
en.DesktopShortcut=Create a desktop shortcut
it.DesktopShortcut=Crea un collegamento sul desktop
en.ShortcutGroup=Shortcuts
it.ShortcutGroup=Collegamenti
en.LaunchManager=Launch FlowCV Manager
it.LaunchManager=Avvia FlowCV Manager
[Files]
Source: "runtime\node.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "runtime\NODE-LICENSE.txt"; DestDir: "{app}\licenses"; Flags: ignoreversion
Source: "..\FlowCV-Local-Manager\*.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\FlowCV-Local-Manager\*.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\FlowCV-Local-Manager\*.css"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\FlowCV-Local-Manager\*.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\FlowCV-Local-Manager\*.svg"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\FlowCV-Local-Manager\*.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\FlowCV-Local-Manager\*.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\FlowCV-Local-Manager\*.cmd"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\FlowCV-Local-Manager\README.md"; DestDir: "{app}"; Flags: ignoreversion
[Icons]
Name: "{autoprograms}\FlowCV Manager"; Filename: "{sys}\wscript.exe"; Parameters: "//nologo ""{app}\FlowCV-Manager.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\FlowCV-Manager.ico"
Name: "{autodesktop}\FlowCV Manager"; Filename: "{sys}\wscript.exe"; Parameters: "//nologo ""{app}\FlowCV-Manager.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\FlowCV-Manager.ico"; Tasks: desktopicon
[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopShortcut}"; GroupDescription: "{cm:ShortcutGroup}:"; Flags: checkedonce
[Run]
Filename: "{app}\node.exe"; Parameters: """{app}\launcher.mjs"" --stop"; Flags: runhidden waituntilterminated
Filename: "{sys}\wscript.exe"; Parameters: "//nologo ""{app}\FlowCV-Manager.vbs"""; Description: "{cm:LaunchManager}"; Flags: nowait postinstall skipifsilent
[UninstallRun]
Filename: "{app}\node.exe"; Parameters: """{app}\launcher.mjs"" --stop"; Flags: runhidden waituntilterminated
[UninstallDelete]
; DO NOT delete any personal archive/cookie folder in Documents.

[Code]
// Stop the old service before replacing its executable: Windows can lock a running node.exe.
// If the old version was installed from the ZIP, fall back to node.exe on PATH.
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ExistingLauncher, ExistingNode, CmdLine: String;
  ExitCode: Integer;
begin
  Result := '';
  ExistingLauncher := ExpandConstant('{app}\launcher.mjs');
  ExistingNode := ExpandConstant('{app}\node.exe');
  if not FileExists(ExistingLauncher) then
    Exit;
  if FileExists(ExistingNode) then
    Exec(ExistingNode, '"' + ExistingLauncher + '" --stop', ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ExitCode)
  else
  begin
    CmdLine := '/C node "' + ExistingLauncher + '" --stop';
    Exec(ExpandConstant('{cmd}'), CmdLine, ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ExitCode);
  end;
  // The launcher may report that no running server exists; installation can continue.
end;
