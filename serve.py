import os
import sys
import mimetypes
import re
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8000

class RangeHTTPRequestHandler(SimpleHTTPRequestHandler):
    """
    HTTP handler with full Range request support (HTTP 206 Partial Content),
    essential for HTML5 video seeking, scrubbing, and streaming large MP4 files.
    """
    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            parts = self.path.split('?')
            if not parts[0].endswith('/'):
                self.send_response(301)
                self.send_header("Location", parts[0] + "/" + (("?" + parts[1]) if len(parts) > 1 else ""))
                self.end_headers()
                return None
            for index in "index.html", "index.htm":
                index_path = os.path.join(path, index)
                if os.path.exists(index_path):
                    path = index_path
                    break
            else:
                return super().send_head()

        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        ctype = self.guess_type(path)
        fs = os.fstat(f.fileno())
        size = fs[6]

        range_header = self.headers.get('Range')
        if range_header:
            match = re.match(r'bytes=(\d*)-(\d*)', range_header)
            if match:
                start_str, end_str = match.groups()
                start = int(start_str) if start_str else 0
                end = int(end_str) if end_str else size - 1
                if start >= size or end >= size or start > end:
                    self.send_error(416, "Requested Range Not Satisfiable")
                    f.close()
                    return None

                self.send_response(206)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
                self.send_header("Content-Length", str(end - start + 1))
                self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
                self.end_headers()
                f.seek(start)
                return f

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(size))
        self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
        self.end_headers()
        return f

def run(port=PORT):
    server_address = ('', port)
    for p in range(port, port + 20):
        try:
            httpd = HTTPServer(('', p), RangeHTTPRequestHandler)
            print(f"Serving HTTP on port {p} (http://localhost:{p}/) ...", flush=True)
            httpd.serve_forever()
            break
        except OSError:
            continue

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run(port)
