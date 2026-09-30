# Tiny local web server to try the app on this PC: http://localhost:8080
# Run:  powershell -ExecutionPolicy Bypass -File tools\serve.ps1     (stop with Ctrl+C)
param([int]$Port = 8080)
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$types = @{ ".html"="text/html; charset=utf-8"; ".js"="text/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".json"="application/json"; ".webmanifest"="application/manifest+json"; ".png"="image/png"; ".svg"="image/svg+xml"; ".ico"="image/x-icon" }
$l = New-Object Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Care Package running at http://localhost:$Port  (Ctrl+C to stop)"
try {
  while ($l.IsListening) {
    $c = $l.GetContext()
    $path = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/'))
    if ($path -eq "") { $path = "index.html" }
    $file = [IO.Path]::GetFullPath((Join-Path $root $path))
    if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $c.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" })
      $c.Response.Headers.Add("Cache-Control", "no-cache")
      $c.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $c.Response.StatusCode = 404 }
    $c.Response.Close()
  }
} finally { $l.Stop() }
