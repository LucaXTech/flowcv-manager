Option Explicit
Dim shell, fso, here, launcher, command, result, nodeExe
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
launcher = fso.BuildPath(here, "launcher.mjs")
shell.CurrentDirectory = here
nodeExe = fso.BuildPath(here, "node.exe")
If Not fso.FileExists(nodeExe) Then nodeExe = "node.exe"
command = Chr(34) & nodeExe & Chr(34) & " " & Chr(34) & launcher & Chr(34)
result = shell.Run(command, 0, True)
If result <> 0 Then
    MsgBox "FlowCV Manager non si e' avviato. Controlla che Node.js sia installato e leggi il file launcher.log in Documenti\FlowCV-Local-Manager.", vbExclamation, "FlowCV Manager"
End If
