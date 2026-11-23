<#
.SYNOPSIS
  Starts all four CareerPilot AI FastAPI ML services (ports 8000, 8002, 8003, 8004)
  and the React + Vite frontend dev server (port 5173).
.NOTES
  Close the spawned PowerShell windows or press Ctrl+C in each window to shut down.
#>

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonExe = Join-Path $RootDir "ml\ResumeAnalyzer\.venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
  Write-Error "Python virtual environment not found at $PythonExe"
  exit 1
}

$Services = @(
  @{ Name = "ResumeAnalyzer";  Dir = "ml\ResumeAnalyzer";  Port = 8000 },
  @{ Name = "InterviewCoach";  Dir = "ml\InterviewCoach";  Port = 8002 },
  @{ Name = "JobMatcher";      Dir = "ml\JobMatcher";      Port = 8003 },
  @{ Name = "CareerRoadmap";   Dir = "ml\CareerRoadmap";   Port = 8004 }
)

foreach ($svc in $Services) {
  $svcPath = Join-Path $RootDir $svc.Dir
  Write-Host "Starting $($svc.Name) FastAPI on http://127.0.0.1:$($svc.Port)..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$svcPath'; & '$PythonExe' -m uvicorn main:app --host 127.0.0.1 --port $($svc.Port)"
  )
}

Write-Host "Starting React + Vite frontend on http://localhost:5173..." -ForegroundColor Green
Set-Location $RootDir
& npm.cmd run dev -- --port 5173
