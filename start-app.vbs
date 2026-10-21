Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c npm run electron:start", 0, False
