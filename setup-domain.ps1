$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$entries = @(
    '127.0.0.1 librarvore.com.br',
    '127.0.0.1 www.librarvore.com.br'
)

$existing = Get-Content $hostsPath -ErrorAction Stop

foreach ($entry in $entries) {
    if ($existing -notmatch [regex]::Escape($entry)) {
        Add-Content -Path $hostsPath -Value "`n$entry"
    }
}

Write-Host 'Domínio configurado: http://www.librarvore.com.br'
Write-Host 'Inicie a aplicação na porta 80 com: npm run start:domain'
Write-Host 'A porta 3000 não será usada no modo de domínio.'
