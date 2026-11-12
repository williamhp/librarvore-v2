# Librárvore — inicia o servidor com verificação
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "`n📚 Librárvore — verificando estrutura..." -ForegroundColor Cyan

$htmls = @(
    '01-login.html','02-esqueci-senha.html','03-nova-senha.html',
    '04-inicio.html','05-acervo.html','06-minha-lista.html',
    '07-continuar-lendo.html','08-detalhes-livro.html','09-leitura.html',
    '10-meu-perfil.html','11-configuracoes.html','12-preferencias-leitura.html'
)

$faltando = @()
foreach ($h in $htmls) {
    if (Test-Path (Join-Path $PSScriptRoot $h)) {
        Write-Host "  ✓ $h (raiz)" -ForegroundColor Green
    } elseif (Test-Path (Join-Path $PSScriptRoot "views\$h")) {
        Write-Host "  ✓ $h (views/)" -ForegroundColor Green
    } elseif (Test-Path (Join-Path $PSScriptRoot "public\$h")) {
        Write-Host "  ✓ $h (public/)" -ForegroundColor Green
    } else {
        $faltando += $h
    }
}

if ($faltando.Count -gt 0) {
    Write-Host "`n⚠ Faltando: $($faltando -join ', ')" -ForegroundColor Yellow
    Write-Host "  Coloque-os em views\ ou public\." -ForegroundColor Yellow
}

# node_modules
if (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules'))) {
    Write-Host "`n📦 Instalando dependências..." -ForegroundColor Cyan
    npm install
}

# .env
if (-not (Test-Path (Join-Path $PSScriptRoot '.env'))) {
    Write-Host "`n🔐 Criando .env..." -ForegroundColor Cyan
    @"
PORT=3000
NODE_ENV=development
SESSION_SECRET=librarvore-super-secreta
DB_HOST=localhost
DB_USER=root
DB_PASS=12345678
DB_NAME=librarvore_d
DB_PORT=3306
APP_BASE_URL=http://localhost:3000
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
"@ | Out-File -Encoding utf8 (Join-Path $PSScriptRoot '.env')
}

Write-Host "`n🚀 Iniciando servidor..." -ForegroundColor Cyan
Write-Host "   Diagnóstico: http://localhost:3000/debug`n" -ForegroundColor DarkGray
npm start