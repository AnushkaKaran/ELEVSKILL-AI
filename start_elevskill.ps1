param(
    [int]$TimeoutSeconds = 150,
    [int]$PollIntervalSeconds = 2
)

$ErrorActionPreference = 'Stop'

$RootDir = $PSScriptRoot
$LogsDir = Join-Path $RootDir 'logs'
$FrontendDir = Join-Path $RootDir 'ElevSkill_Frontend'
$PythonExe = Join-Path $FrontendDir 'ml\ResumeAnalyzer\.venv\Scripts\python.exe'
$ViteScript = Join-Path $FrontendDir 'node_modules\vite\bin\vite.js'

$ServiceDefinitions = @(
    @{
        Key       = 'resume_analyzer'
        Name      = 'Resume Analyzer'
        Type      = 'fastapi'
        Port      = 8000
        WorkDir   = Join-Path $FrontendDir 'ml\ResumeAnalyzer'
        Exe       = $PythonExe
        Args      = @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000')
        HealthUrl = 'http://127.0.0.1:8000/health'
    },
    @{
        Key       = 'interview_coach'
        Name      = 'Interview Coach'
        Type      = 'fastapi'
        Port      = 8002
        WorkDir   = Join-Path $FrontendDir 'ml\InterviewCoach'
        Exe       = $PythonExe
        Args      = @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8002')
        HealthUrl = 'http://127.0.0.1:8002/health'
    },
    @{
        Key       = 'job_matcher'
        Name      = 'Job Matcher'
        Type      = 'fastapi'
        Port      = 8003
        WorkDir   = Join-Path $FrontendDir 'ml\JobMatcher'
        Exe       = $PythonExe
        Args      = @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8003')
        HealthUrl = 'http://127.0.0.1:8003/health'
    },
    @{
        Key       = 'career_roadmap'
        Name      = 'Career Roadmap'
        Type      = 'fastapi'
        Port      = 8004
        WorkDir   = Join-Path $FrontendDir 'ml\CareerRoadmap'
        Exe       = $PythonExe
        Args      = @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8004')
        HealthUrl = 'http://127.0.0.1:8004/health'
    },
    @{
        Key       = 'frontend'
        Name      = 'React + Vite Frontend'
        Type      = 'frontend'
        Port      = 5173
        WorkDir   = $FrontendDir
        Exe       = 'node'
        Args      = @($ViteScript, '--port', '5173', '--strictPort')
        HealthUrl = 'http://localhost:5173'
    }
)

function Write-Info {
    param([string]$Message)
    Write-Host "[ELEVSKILL] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[ELEVSKILL] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[ELEVSKILL] $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "[ELEVSKILL] $Message" -ForegroundColor Red
}

function Test-PortsFree {
    param([array]$Services)

    $conflicts = @()
    foreach ($svc in $Services) {
        $listeners = Get-NetTCPConnection -LocalPort $svc.Port -State Listen -ErrorAction SilentlyContinue
        if ($null -ne $listeners) {
            foreach ($listener in $listeners) {
                $procId = $listener.OwningProcess
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                $procName = if ($null -ne $proc) { $proc.ProcessName } else { 'unknown' }
                $conflicts += "Port $($svc.Port) ($($svc.Name)) is already in use by PID $procId ($procName)."
            }
        }
    }

    if ($conflicts.Count -gt 0) {
        foreach ($conflict in $conflicts) {
            Write-Err $conflict
        }
        throw "One or more required ports are already occupied. Stop the conflicting process(es) manually and retry."
    }
}

function Invoke-PreFlightChecks {
    Write-Info "Running pre-flight checks..."

    if (-not (Test-Path $PythonExe)) {
        throw "Shared Python virtual environment not found at: $PythonExe"
    }

    if ($null -eq (Get-Command 'node' -ErrorAction SilentlyContinue)) {
        throw "Node.js ('node') was not found in PATH."
    }
    if ($null -eq (Get-Command 'npm.cmd' -ErrorAction SilentlyContinue)) {
        throw "npm ('npm.cmd') was not found in PATH."
    }

    if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
        throw "Frontend dependencies missing. Run 'npm.cmd install' in $FrontendDir."
    }
    if (-not (Test-Path $ViteScript)) {
        throw "Vite binary script not found at: $ViteScript"
    }

    foreach ($svc in $ServiceDefinitions) {
        if (-not (Test-Path $svc.WorkDir)) {
            throw "Working directory for $($svc.Name) not found: $($svc.WorkDir)"
        }
    }

    Test-PortsFree -Services $ServiceDefinitions
    Write-Success "All required ports (5173, 8000, 8002, 8003, 8004) are available."
}

function Initialize-LogFiles {
    param([array]$Services)

    if (-not (Test-Path $LogsDir)) {
        $null = New-Item -ItemType Directory -Path $LogsDir -Force
    }

    foreach ($svc in $Services) {
        $outLog = Join-Path $LogsDir "$($svc.Key).out.log"
        $errLog = Join-Path $LogsDir "$($svc.Key).err.log"
        $prevOutLog = Join-Path $LogsDir "$($svc.Key).prev.out.log"
        $prevErrLog = Join-Path $LogsDir "$($svc.Key).prev.err.log"

        if ((Test-Path $outLog) -and ((Get-Item $outLog).Length -gt 0)) {
            Copy-Item -Path $outLog -Destination $prevOutLog -Force
        }
        if ((Test-Path $errLog) -and ((Get-Item $errLog).Length -gt 0)) {
            Copy-Item -Path $errLog -Destination $prevErrLog -Force
        }
    }
}

function Get-ServiceHealthState {
    param([hashtable]$Tracked)

    if ($Tracked.Process.HasExited) {
        return @{
            State  = 'Failed'
            Detail = "Process exited early with code $($Tracked.Process.ExitCode)"
        }
    }

    try {
        if ($Tracked.Type -eq 'fastapi') {
            $resp = Invoke-RestMethod -Uri $Tracked.HealthUrl -Method Get -TimeoutSec 3
            if ($resp.status -eq 'ok' -and $resp.model_loaded -eq $true) {
                return @{ State = 'Ready'; Detail = 'Model loaded' }
            }
            return @{ State = 'Waiting for model loading'; Detail = "status=$($resp.status), model_loaded=$($resp.model_loaded)" }
        }
        elseif ($Tracked.Type -eq 'frontend') {
            $resp = Invoke-WebRequest -Uri $Tracked.HealthUrl -Method Get -UseBasicParsing -TimeoutSec 3
            if ($resp.StatusCode -eq 200) {
                return @{ State = 'Ready'; Detail = 'Vite dev server responding' }
            }
            return @{ State = 'Starting'; Detail = "HTTP $($resp.StatusCode)" }
        }
    }
    catch {
        return @{ State = 'Starting'; Detail = 'Waiting for HTTP endpoint' }
    }

    return @{ State = 'Starting'; Detail = 'Initializing' }
}

function Stop-TrackedProcesses {
    param([System.Collections.ArrayList]$TrackedList)

    if ($null -eq $TrackedList -or $TrackedList.Count -eq 0) {
        return
    }

    Write-Info "Shutting down orchestrator-managed child processes..."
    for ($i = $TrackedList.Count - 1; $i -ge 0; $i--) {
        $entry = $TrackedList[$i]
        $proc = $entry.Process
        if ($null -eq $proc) {
            continue
        }

        try {
            $proc.Refresh()
            if (-not $proc.HasExited) {
                $null = & taskkill /PID $proc.Id /T /F 2>&1
                Write-Info "Stopped $($entry.Name) (PID $($proc.Id), port $($entry.Port))."
            }
            else {
                Write-Info "$($entry.Name) (PID $($proc.Id)) already exited."
            }
        }
        catch {
            Write-Warn "Could not verify shutdown for $($entry.Name) (PID $($proc.Id)): $($_.Exception.Message)"
        }
    }
    Write-Info "Unrelated processes were not modified."
}

$TrackedProcesses = New-Object System.Collections.ArrayList
$ExitCode = 0

try {
    Invoke-PreFlightChecks
    Initialize-LogFiles -Services $ServiceDefinitions

    Write-Info "Launching ELEVSKILL AI services (logs in $LogsDir)..."
    foreach ($svc in $ServiceDefinitions) {
        $outLog = Join-Path $LogsDir "$($svc.Key).out.log"
        $errLog = Join-Path $LogsDir "$($svc.Key).err.log"

        $proc = Start-Process -FilePath $svc.Exe `
            -ArgumentList $svc.Args `
            -WorkingDirectory $svc.WorkDir `
            -WindowStyle Hidden `
            -RedirectStandardOutput $outLog `
            -RedirectStandardError $errLog `
            -PassThru

        $null = $TrackedProcesses.Add(@{
            Key       = $svc.Key
            Name      = $svc.Name
            Type      = $svc.Type
            Port      = $svc.Port
            HealthUrl = $svc.HealthUrl
            Process   = $proc
            OutLog    = $outLog
            ErrLog    = $errLog
            LastState = 'Starting'
        })

        Write-Info "Launched $($svc.Name) (PID $($proc.Id), port $($svc.Port))."
    }

    Write-Info "Waiting for all services and ML models to become healthy (timeout: ${TimeoutSeconds}s)..."
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $allReady = $false

    while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        $readyCount = 0

        foreach ($entry in $TrackedProcesses) {
            $entry.Process.Refresh()
            $health = Get-ServiceHealthState -Tracked $entry

            if ($health.State -eq 'Failed') {
                Write-Err "$($entry.Name) failed during startup: $($health.Detail)"
                Write-Err "Check logs: $($entry.ErrLog) and $($entry.OutLog)"
                if (Test-Path $entry.ErrLog) {
                    $tail = Get-Content -Path $entry.ErrLog -Tail 15 -ErrorAction SilentlyContinue
                    if ($tail) {
                        Write-Host "--- $($entry.Name) stderr tail ---" -ForegroundColor DarkRed
                        $tail | ForEach-Object { Write-Host $_ -ForegroundColor DarkRed }
                    }
                }
                throw "$($entry.Name) exited prematurely during startup."
            }

            if ($health.State -ne $entry.LastState) {
                $entry.LastState = $health.State
                if ($health.State -eq 'Ready') {
                    Write-Success "$($entry.Name) (port $($entry.Port)): Ready ($($health.Detail))"
                }
                else {
                    Write-Info "$($entry.Name) (port $($entry.Port)): $($health.State)"
                }
            }

            if ($health.State -eq 'Ready') {
                $readyCount++
            }
        }

        if ($readyCount -eq $TrackedProcesses.Count) {
            $allReady = $true
            break
        }

        Start-Sleep -Seconds $PollIntervalSeconds
    }

    if (-not $allReady) {
        Write-Err "Startup timed out after ${TimeoutSeconds}s. Service states:"
        foreach ($entry in $TrackedProcesses) {
            Write-Err "  - $($entry.Name) (port $($entry.Port)): $($entry.LastState) | logs: $($entry.ErrLog)"
        }
        throw "Timed out waiting for all ELEVSKILL AI services to become healthy."
    }

    $elapsed = [math]::Round($stopwatch.Elapsed.TotalSeconds, 1)
    Write-Host ""
    Write-Success "=========================================================="
    Write-Success " ELEVSKILL AI is READY in ${elapsed}s"
    Write-Success "=========================================================="
    Write-Host "  Frontend : http://127.0.0.1:5173"
    Write-Host "  AI (RA)  : http://127.0.0.1:8000/health"
    Write-Host "  AI (IC)  : http://127.0.0.1:8002/health"
    Write-Host "  AI (JM)  : http://127.0.0.1:8003/health"
    Write-Host "  AI (CR)  : http://127.0.0.1:8004/health"
    Write-Host "  Logs     : $LogsDir"
    Write-Host ""
    Write-Info "Press Ctrl+C to stop all ELEVSKILL AI services cleanly."

    while ($true) {
        Start-Sleep -Seconds 2
        foreach ($entry in $TrackedProcesses) {
            $entry.Process.Refresh()
            if ($entry.Process.HasExited) {
                Write-Err "$($entry.Name) (PID $($entry.Process.Id)) exited unexpectedly with code $($entry.Process.ExitCode)."
                Write-Err "See logs: $($entry.ErrLog)"
                throw "$($entry.Name) crashed at runtime."
            }
        }
    }
}
catch {
    Write-Err $_.Exception.Message
    $ExitCode = 1
}
finally {
    Stop-TrackedProcesses -TrackedList $TrackedProcesses
}

exit $ExitCode
