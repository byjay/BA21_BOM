import http.server
import json
import os
from pathlib import Path

PORT = 8000
REMARKS_FILE = Path(__file__).parent / 'remarks.json'

# R2 Configuration
R2_PUBLIC_URL = 'https://65a3e734c27681a2734f87c0c5721ccb.r2.cloudflarestorage.com/drawings'

# R2 Path Mapping
R2_PATH_MAPPING = {
    'assembly-pdf': 'balwin2/조립도/REV.2',
    'fabrication-pdf': 'balwin2/가공도/최종',
    'assembly-cad': 'balwin2/조립도/REV.2'
}


def build_r2_url(local_path):
    """
    R2 URL 생성

    Args:
        local_path: 로컬 파일 경로

    Returns:
        R2 URL 또는 None
    """
    # 파일 타입 감지
    path_lower = local_path.lower()
    if '2. 가공도' in path_lower and '.pdf' in path_lower:
        file_type = 'fabrication-pdf'
    elif '1. 조립도' in path_lower:
        if '.pdf' in path_lower:
            file_type = 'assembly-pdf'
        elif '.dwg' in path_lower:
            file_type = 'assembly-cad'
    else:
        return None

    # 파일명 추출
    filename = os.path.basename(local_path)

    # R2 경로 가져오기
    r2_path = R2_PATH_MAPPING.get(file_type, '')
    if not r2_path:
        return None

    # R2 URL 생성
    r2_url = f'{R2_PUBLIC_URL}/{r2_path}/{filename}'
    return r2_url


class RemarkHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/remarks':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            data = {}
            if REMARKS_FILE.exists():
                with open(REMARKS_FILE, 'r', encoding='utf-8') as f:
                    try:
                        data = json.load(f)
                    except:
                        pass
            self.wfile.write(json.dumps(data).encode())

    def do_POST(self):
        if self.path == '/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))

            uid = payload.get('uid')
            remark = payload.get('remark')

            if not uid:
                self.send_error(400, "Missing UID")
                return

            # Load existing
            data = {}
            if REMARKS_FILE.exists():
                with open(REMARKS_FILE, 'r', encoding='utf-8') as f:
                    try:
                        data = json.load(f)
                    except:
                        pass

            # Update
            data[uid] = remark

            with open(REMARKS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode())

        elif self.path == '/open':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))

            file_path = payload.get('path', '')
            if file_path:
                try:
                    # Robust path conversion
                    # 1. Handle file:/// prefix
                    local_path = file_path.replace('file:///', '')

                    # 2. URL Decode everything (handles spaces, Korean characters, etc.)
                    import urllib.parse
                    local_path = urllib.parse.unquote(local_path)

                    # 3. On Windows, ensure it starts correctly (remove leading slash if it exists after file:///)
                    if os.name == 'nt' and local_path.startswith('/') and local_path[2] == ':':
                        local_path = local_path[1:]

                    # 4. Normalize separators
                    local_path = os.path.normpath(local_path)

                    print(f"[OPEN REQUEST] Raw: {file_path}")
                    print(f"[OPEN REQUEST] Normalized: {local_path}")

                    if os.path.exists(local_path):
                        # 로컬 파일 있으면 시스템 뷰어로 열림
                        print(f"Executing: os.startfile('{local_path}')")
                        os.startfile(local_path)

                        self.send_response(200)
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "launched", "path": local_path}).encode())
                    else:
                        # R2 Fallback - 로컬 파일 없으면 R2 URL 반환
                        r2_url = build_r2_url(local_path)

                        if r2_url:
                            print(f"[R2 FALLBACK] Using R2 URL: {r2_url}")
                            self.send_response(200)
                            self.send_header('Access-Control-Allow-Origin', '*')
                            self.send_header('Content-type', 'application/json')
                            self.end_headers()
                            self.wfile.write(json.dumps({"status": "r2_fallback", "url": r2_url}).encode())
                            return

                        print(f"[ERROR] File not found: {local_path}")
                        self.send_response(404)
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({"error": "File not found", "path": local_path}).encode())
                except Exception as e:
                    print(f"[CRITICAL ERROR] {str(e)}")
                    self.send_response(500)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(e)}).encode())
            else:
                self.send_error(400, "Missing path")

if __name__ == "__main__":
    print(f"--- Remark Service started on http://localhost:{PORT} ---")
    print(f"R2 Public URL: {R2_PUBLIC_URL}")
    print(f"Target file: {REMARKS_FILE}")
    print("Press Ctrl+C to stop.")
    server = http.server.HTTPServer(('localhost', PORT), RemarkHandler)
    server.serve_forever()
