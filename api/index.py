import json
import logging
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from engines.batch_analyzer import (
    MAX_UPLOAD_BYTES,
    analyze_prompts,
    load_models,
    parse_prompt_file,
)


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        query = parse_qs(urlsplit(self.path).query)
        route = query.get("route", [""])[0]
        path = urlsplit(self.path).path.rstrip("/") or "/"
        if route == "health" or path in {"/", "/api", "/api/health", "/health"}:
            self._send_json(200, {"status": "ok", "version": "2.0.0"})
            return
        if route == "models" or path in {"/api/models", "/models"}:
            self._send_json(200, {"models": list(load_models())})
            return
        self._send_json(404, {"detail": "API route not found."})

    def do_POST(self):
        query = parse_qs(urlsplit(self.path).query)
        route = query.get("route", [""])[0]
        path = urlsplit(self.path).path.rstrip("/")
        if route not in {"analyze", "batch-analyze"} and path not in {
            "/api/analyze", "/api/batch-analyze", "/analyze", "/batch-analyze"
        }:
            self._send_json(404, {"detail": "API route not found."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"detail": "Invalid content length."})
            return

        if content_length <= 0:
            self._send_json(400, {"detail": "Upload a non-empty .xlsx or .csv file."})
            return
        if content_length > MAX_UPLOAD_BYTES:
            self._send_json(413, {"detail": "The uploaded file exceeds the 4 MB limit."})
            return

        try:
            contents = self.rfile.read(content_length)
            if len(contents) != content_length:
                self._send_json(400, {"detail": "The upload was incomplete. Please try again."})
                return

            filename = unquote(self.headers.get("X-Filename", ""))
            model = self.headers.get("X-Model", "") or "GPT-4.1"
            prompts = parse_prompt_file(contents, filename)
            self._send_json(200, analyze_prompts(prompts, model))
        except ValueError as error:
            self._send_json(400, {"detail": str(error)})
        except Exception:
            logging.exception("Unexpected prompt analysis API failure")
            self._send_json(500, {"detail": "Prompt analysis failed unexpectedly. Please retry."})

    def log_message(self, format_string, *args):
        logging.info("API %s - %s", self.address_string(), format_string % args)
