$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Server Tiệm bánh Mitu đang chạy tại: http://localhost:$port/"
    Write-Host "Nhấn Ctrl+C để dừng server."

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $rawPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath.TrimStart('/'))
            if ([string]::IsNullOrWhiteSpace($rawPath)) {
                $rawPath = "index.html"
            }

            $filePath = Join-Path $PSScriptRoot $rawPath
            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = switch ($ext) {
                    ".html"  { "text/html; charset=utf-8" }
                    ".htm"   { "text/html; charset=utf-8" }
                    ".css"   { "text/css; charset=utf-8" }
                    ".js"    { "application/javascript; charset=utf-8" }
                    ".json"  { "application/json; charset=utf-8" }
                    ".png"   { "image/png" }
                    ".jpg"   { "image/jpeg" }
                    ".jpeg"  { "image/jpeg" }
                    ".gif"   { "image/gif" }
                    ".svg"   { "image/svg+xml" }
                    ".ico"   { "image/x-icon" }
                    ".woff"  { "font/woff" }
                    ".woff2" { "font/woff2" }
                    ".ttf"   { "font/ttf" }
                    default  { "application/octet-stream" }
                }
                $response.ContentType = $contentType
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length

                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $response.StatusCode = 404
                $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
                $response.ContentLength64 = $buffer.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
            }
            $response.Close()
        } catch {
            Write-Warning "Lỗi xử lý request: $_"
        }
    }
} catch {
    Write-Error $_
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
