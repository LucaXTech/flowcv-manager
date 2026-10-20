Option Explicit
Dim sh, fso, folder, shortcut, icon, link, target
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
target = fso.BuildPath(folder, "FlowCV-Manager.vbs")
icon = fso.BuildPath(folder, "FlowCV-Manager.ico")
link = fso.BuildPath(sh.SpecialFolders("Desktop"), "FlowCV Manager.lnk")
Set shortcut = sh.CreateShortcut(link)
shortcut.TargetPath = fso.BuildPath(sh.ExpandEnvironmentStrings("%SystemRoot%"), "System32\wscript.exe")
shortcut.Arguments = "//nologo " & Chr(34) & target & Chr(34)
shortcut.WorkingDirectory = folder
shortcut.IconLocation = icon & ",0"
shortcut.Description = "FlowCV Manager - Archivio dei curriculum"
shortcut.Save
MsgBox "Collegamento FlowCV Manager creato sul desktop.", vbInformation, "FlowCV Manager"
