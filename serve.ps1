# EventPlanner AI - tiny static web server (no installs needed)
# Serves this folder at http://localhost:8080 so the page can talk to Ollama.
param([int]$Port = 8080, [switch]$NoBrowser)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() } catch {
  Write-Host "Could not start on port $Port (already in use?). Try: .\serve.ps1 -Port 8090" -ForegroundColor Red
  exit 1
}
$types = @{ ".html"="text/html; charset=utf-8"; ".css"="text/css; charset=utf-8"; ".js"="application/javascript; charset=utf-8";
            ".json"="application/json"; ".svg"="image/svg+xml"; ".png"="image/png"; ".jpg"="image/jpeg"; ".ico"="image/x-icon"; ".pdf"="application/pdf" }

Write-Host ""
Write-Host "  EventPlanner AI is running at  http://localhost:$Port" -ForegroundColor Green
Write-Host "  Keep this window open. Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""
if (-not $NoBrowser) { Start-Process "http://localhost:$Port/index.html" }

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
      if ($path -eq "") { $path = "index.html" }
      $full = [IO.Path]::GetFullPath((Join-Path $root $path))
      if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
        $res.StatusCode = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
      } else {
        $ext = [IO.Path]::GetExtension($full).ToLower()
        $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
        $res.Headers.Add("Cache-Control", "no-cache")
        $bytes = [IO.File]::ReadAllBytes($full)
      }
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch { } finally { $res.Close() }
  }
} finally { $listener.Stop() }
