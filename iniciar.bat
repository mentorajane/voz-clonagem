@echo off
cd /d "C:\Users\Administrador\Downloads\Hashtags Treimamentos\Páginas de Vendas\Persona Fotos\Aplicativo de Voz"
echo Iniciando servidor...
start "Voz App" cmd /c npm run dev
echo Servidor iniciado em http://localhost:3000
echo.
echo Acesse http://localhost:3000/clone para clonar sua voz
pause
