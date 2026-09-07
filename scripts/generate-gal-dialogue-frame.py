"""Persist relay image responses before decoding the user's URL/base64 format."""

import argparse
from contextlib import ExitStack
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import time
import uuid

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PORTRAITS = {
    'harness': 'DeepSeek_Harness1.png', 'chatgpt': 'ChatGPT1.png', 'claude': 'Claude1.png',
    'doubao': 'Doubao1.png', 'ernie': 'ernie1.png', 'gemini': 'Gemini1.png', 'glm': 'GLM1.png',
    'grok': 'Grok1.png', 'kimi': 'Kimi1.png', 'mimo': 'Mimo1.png', 'minimax': 'Minmax1.png',
    'opencode': 'opencode1.png', 'qwen': 'Qwen1.png',
}


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('character', choices=PORTRAITS)
    parser.add_argument('--recover', type=Path)
    args = parser.parse_args()
    output_dir = ROOT / 'output/imagegen/dialogue-frames'
    output = output_dir / f'{args.character}-source.png'
    if output.exists():
        print('Source image already exists; no request sent.')
        return 0
    adapter = load_module('expression_adapter', ROOT / 'scripts/generate-gal-expressions.py')
    private = adapter.private_directory()
    run_id = f'frame-{args.character}-{uuid.uuid4().hex[:10]}'
    status_file = output_dir / f'{args.character}-generation.json'
    status = {'character': args.character, 'model': 'gpt-image-2', 'size': '1536x512', 'quality': 'high', 'api_attempts': 0 if args.recover else 1, 'status': 'requesting'}
    adapter.write_json(status_file, status)
    started = time.monotonic()
    try:
        if args.recover:
            response_file = args.recover.resolve()
            if response_file.parent != private.resolve() or not response_file.name.startswith(f'frame-{args.character}-') or not response_file.name.endswith('-response.json'):
                raise ValueError('Recovery must refer to this character\'s private response.')
            raw = json.loads(response_file.read_text(encoding='utf-8'))
        else:
            prior = sorted(private.glob(f'frame-{args.character}-*-response.json'))
            if prior:
                raise ValueError('A saved response exists; recover it instead of submitting another image request.')
            codex_dir = Path(os.environ.get('CODEX_HOME') or Path.home() / '.codex')
            helper = load_module('relay_helper', codex_dir / 'skills/relay-imagegen/scripts/relay_image.py')
            settings = helper.read_settings()
            connection_args = helper.create_parser().parse_args(['edit'])
            connection = helper.resolve(connection_args, settings)
            if not connection['key']:
                raise ValueError('No local image API credential is available.')
            from openai import OpenAI
            print(f"Generating {args.character}: one image edit, no automatic retries.", flush=True)
            with ExitStack() as stack:
                client = stack.enter_context(OpenAI(base_url=connection['base_url'], api_key=connection['key'], max_retries=0, timeout=600.0, default_headers={'User-Agent': 'relay-imagegen/1.0'}))
                images = [stack.enter_context(path.open('rb')) for path in [output_dir / 'reference/deepseek-frame-clean-reference-1536.png', ROOT / 'aipicture' / PORTRAITS[args.character]]]
                response = client.images.edit(model='gpt-image-2', image=images, prompt=(output_dir / 'prompts' / f'{args.character}.txt').read_text(encoding='utf-8'), n=1, size='1536x512', quality='high', background='opaque', output_format='png')
            raw = response.model_dump(mode='json')
            response_file = private / f'{run_id}-response.json'
            adapter.write_json(response_file, raw)
        status.update(status='received', response=adapter.describe_response(raw), private_response_file=str(response_file.relative_to(ROOT)))
        adapter.write_json(status_file, status)
        payload, source = adapter.extract_image_bytes(raw)
        with Image.open(io.BytesIO(payload)) as image:
            size = image.size
        if size[0] < 768 or size[1] < 256 or size[0] * size[1] > 8_294_400:
            raise ValueError('Unexpected dialogue frame dimensions.')
        output.write_bytes(adapter.validate_image(payload, size))
        status.update(status='saved', source=source, actual_size=list(size), elapsed_seconds=round(time.monotonic() - started, 2))
        adapter.write_json(status_file, status)
        print(f'Saved {output.name}: {size[0]}x{size[1]} ({source}).', flush=True)
        return 0
    except Exception as error:
        status.update(status='failed', error_type=type(error).__name__, elapsed_seconds=round(time.monotonic() - started, 2))
        if isinstance(getattr(error, 'status_code', None), int):
            status['http_status'] = error.status_code
        adapter.write_json(status_file, status)
        print(f'Frame operation failed ({type(error).__name__}). Sanitized report: {status_file}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
