Remove-Item -Recurse -Force node_modules/.cache, coverage, .vitest -ErrorAction SilentlyContinue

$process = Start-Process node -ArgumentList "src/app.js" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 8

npm run test:rbac > audit-evidence/phase4-rbac.txt 2>&1
npm run test:forms > audit-evidence/phase4-forms.txt 2>&1
npm run test:guardrails > audit-evidence/phase4-guardrails.txt 2>&1
npm run test:harness > audit-evidence/phase4-harness.txt 2>&1
npm run smoke-test > audit-evidence/phase4-smoke.txt 2>&1

Invoke-WebRequest -Uri "http://127.0.0.1:3000/healthz" -UseBasicParsing | Select-Object -ExpandProperty Content > audit-evidence/phase4-healthz.json

$loginResponse = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"hospital3_admin","password":"Hospital3@Admin2026"}' -SessionVariable session -UseBasicParsing
$loginResponse.Content > audit-evidence/phase4-login.json

$matrixResponse = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/rbac/matrix" -WebSession $session -UseBasicParsing
$matrixResponse.Content.Substring(0, [math]::Min($matrixResponse.Content.Length, 1000)) > audit-evidence/phase4-matrix.json

Stop-Process -Id $process.Id -Force

npm audit --production > audit-evidence/phase4-npm-audit.txt 2>&1

Get-ChildItem -Path src, public/js -Recurse -Filter *.js | Where-Object { $_.FullName -notmatch '\\node_modules\\' } | Select-Object Name, @{Name="Lines";Expression={(Get-Content $_.FullName | Measure-Object -Line).Lines}} | Sort-Object Lines -Descending | Select-Object -First 10 > audit-evidence/phase4-filesizes.txt

$out = ""
if (-not (Test-Path src/routes/api.js)) { $out += "? api.js gone
" } else { $out += "? api.js still present
" }
if (-not (Test-Path public/js/app.js)) { $out += "? app.js gone
" } else { $out += "? app.js still present
" }
if (-not (Test-Path src/middleware/demo-open.js)) { $out += "? demo-open.js gone
" } else { $out += "? demo-open.js still present
" }
$out > audit-evidence/phase4-monolith.txt

