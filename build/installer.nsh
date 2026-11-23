!macro customInstall
  ; Regla de entrada en Windows Firewall para permitir que las tablets en la red Wi-Fi local
  ; se conecten al servidor de Yiyo Burger POS en el puerto 4003.
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Yiyo Burger POS (Puerto 4003)"'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Yiyo Burger POS (Puerto 4003)" dir=in action=allow protocol=TCP localport=4003 profile=any'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Yiyo Burger POS (Puerto 4003)"'
!macroend
