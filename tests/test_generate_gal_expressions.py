import base64
import hashlib
import importlib.util
import io
import json
import unittest
from pathlib import Path

from PIL import Image


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "generate-gal-expressions.py"
SPEC = importlib.util.spec_from_file_location("generate_gal_expressions", MODULE_PATH)
adapter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(adapter)


def image_bytes(size=(1024, 1824), color=(80, 100, 120), image_format="PNG", patterned=True):
    output = io.BytesIO()
    picture = Image.new("RGB", size, color)
    if patterned:
        picture.paste((200, 150, 60), (0, 0, size[0] // 2, size[1] // 2))
    picture.save(output, format=image_format)
    return output.getvalue()


class UrlValidationTests(unittest.TestCase):
    def test_accepts_https_url_with_signed_query(self):
        value = "https://images.example.test/path/output.png?signature=private-value&expires=123"
        self.assertEqual(adapter.validate_https_url(value), value)

    def test_rejects_unsafe_or_incomplete_urls_without_echoing_secrets(self):
        values = [
            "http://images.example.test/private-http-secret.png",
            "https://private-user:private-password@images.example.test/image.png",
            "https://private-user@images.example.test/image.png",
            "https://@images.example.test/private-empty-user.png",
            "https://:@images.example.test/private-empty-credentials.png",
            "https://images.example.test/image.png#private-fragment",
            "https:///private-missing-host.png",
            "file:///private-local-file.png",
            "data:image/png;base64,private-inline-payload",
            "//images.example.test/private-relative.png",
        ]
        for value in values:
            with self.subTest(value=value):
                with self.assertRaises(ValueError) as caught:
                    adapter.validate_https_url(value)
                self.assertNotIn(value, str(caught.exception))
                self.assertNotIn("private-", str(caught.exception))


class ResponseDescriptionTests(unittest.TestCase):
    def test_reports_structure_without_sensitive_response_content(self):
        secret_url = "https://images.example.test/generated.png?api_key=secret-key-123&signature=secret-signature"
        secret_base64 = base64.b64encode(b"secret image contents").decode("ascii")
        secret_prompt = "secret revised prompt containing private reference description"
        raw = {
            "created": 1780000000,
            "data": [{"url": secret_url, "b64_json": secret_base64, "revised_prompt": secret_prompt}],
        }
        description = adapter.describe_response(raw)
        self.assertIsInstance(description, dict)
        serialized = json.dumps(description, sort_keys=True)
        for secret in [
            secret_url,
            "secret-key-123",
            "secret-signature",
            secret_base64,
            secret_prompt,
            "secret revised prompt",
        ]:
            with self.subTest(secret=secret):
                self.assertNotIn(secret, serialized)
        self.assertIn("data", serialized)
        self.assertIn("url", serialized)
        self.assertIn("b64_json", serialized)
        self.assertIn("revised_prompt", serialized)
        self.assertIn(hashlib.sha256(secret_url.encode("utf-8")).hexdigest(), serialized)

    def test_empty_or_missing_image_fields_can_be_described(self):
        for raw in [{}, {"data": []}, {"data": [{"url": None, "b64_json": None}]}]:
            with self.subTest(raw=raw):
                self.assertIsInstance(adapter.describe_response(raw), dict)


class ImageExtractionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = image_bytes()
        cls.encoded = base64.b64encode(cls.payload).decode("ascii")

    def test_base64_response_is_decoded_without_downloading(self):
        def forbidden_downloader(url):
            self.fail("A valid base64 response must not trigger a download")

        payload, source = adapter.extract_image_bytes(
            {"data": [{"b64_json": self.encoded}]}, downloader=forbidden_downloader
        )
        self.assertEqual(payload, self.payload)
        self.assertEqual(source, "base64")

    def test_valid_base64_takes_precedence_over_url(self):
        def forbidden_downloader(url):
            self.fail("A valid base64 response must take precedence over URL")

        payload, source = adapter.extract_image_bytes(
            {"data": [{"b64_json": self.encoded, "url": "https://images.example.test/image.png"}]},
            downloader=forbidden_downloader,
        )
        self.assertEqual((payload, source), (self.payload, "base64"))

    def test_null_base64_url_response_uses_injected_downloader(self):
        url = "https://images.example.test/image.png?signature=private-signature"
        calls = []

        def downloader(value):
            calls.append(value)
            return self.payload

        payload, source = adapter.extract_image_bytes(
            {"data": [{"b64_json": None, "url": url}]}, downloader=downloader
        )
        self.assertEqual(calls, [url])
        self.assertEqual((payload, source), (self.payload, "url"))

    def test_invalid_or_empty_base64_falls_back_to_valid_url(self):
        url = "https://images.example.test/image.png"
        for encoded in ["", "not base64!", self.encoded + "!", " \n"]:
            calls = []

            def downloader(value):
                calls.append(value)
                return self.payload

            with self.subTest(encoded=encoded[:30]):
                payload, source = adapter.extract_image_bytes(
                    {"data": [{"b64_json": encoded, "url": url}]}, downloader=downloader
                )
                self.assertEqual(calls, [url])
                self.assertEqual((payload, source), (self.payload, "url"))

    def test_invalid_base64_without_fallback_is_rejected(self):
        for encoded in ["not base64!", self.encoded + "!", self.encoded[:20] + "\n" + self.encoded[20:]]:
            with self.subTest(encoded=encoded[:30]):
                with self.assertRaises(ValueError):
                    adapter.extract_image_bytes({"data": [{"b64_json": encoded}]})

    def test_unsafe_url_is_rejected_before_downloader_is_called(self):
        def forbidden_downloader(url):
            self.fail("Unsafe URLs must be rejected before attempting a download")

        for url in [
            "http://images.example.test/private-image.png",
            "https://private-user:private-password@images.example.test/image.png",
            "https://images.example.test/image.png#private-fragment",
        ]:
            with self.subTest(url=url):
                with self.assertRaises(ValueError) as caught:
                    adapter.extract_image_bytes({"data": [{"url": url}]}, downloader=forbidden_downloader)
                self.assertNotIn(url, str(caught.exception))
                self.assertNotIn("private-", str(caught.exception))

    def test_response_without_image_is_rejected(self):
        for raw in [{}, {"data": []}, {"data": [{}]}, {"data": [{"b64_json": None, "url": None}]}]:
            with self.subTest(raw=raw):
                with self.assertRaises(ValueError):
                    adapter.extract_image_bytes(raw)


class ImageValidationTests(unittest.TestCase):
    def test_valid_image_is_returned_as_decodable_png(self):
        payload = adapter.validate_image(image_bytes())
        self.assertIsInstance(payload, bytes)
        self.assertTrue(payload.startswith(b"\x89PNG\r\n\x1a\n"))
        with Image.open(io.BytesIO(payload)) as decoded:
            self.assertEqual(decoded.format, "PNG")
            self.assertEqual(decoded.size, (1024, 1824))
            decoded.load()

    def test_jpeg_is_normalized_to_png(self):
        payload = adapter.validate_image(image_bytes(image_format="JPEG"))
        with Image.open(io.BytesIO(payload)) as decoded:
            self.assertEqual(decoded.format, "PNG")
            self.assertEqual(decoded.size, (1024, 1824))

    def test_explicit_expected_size_is_supported(self):
        payload = adapter.validate_image(image_bytes(size=(40, 60)), expected_size=(40, 60))
        with Image.open(io.BytesIO(payload)) as decoded:
            self.assertEqual(decoded.size, (40, 60))

    def test_wrong_size_is_rejected(self):
        with self.assertRaises(ValueError):
            adapter.validate_image(image_bytes(size=(1024, 1024)))

    def test_invalid_or_truncated_image_is_rejected(self):
        valid_image = image_bytes()
        for payload in [b"", b"not an image", b"\x89PNG\r\n\x1a\ninvalid", valid_image[:64]]:
            with self.subTest(payload=payload[:20]):
                with self.assertRaises(ValueError):
                    adapter.validate_image(payload)

    def test_white_placeholder_is_rejected(self):
        with self.assertRaises(ValueError):
            adapter.validate_image(image_bytes(color=(255, 255, 255), patterned=False))

    def test_fully_transparent_image_is_rejected(self):
        source = Image.open(io.BytesIO(image_bytes())).convert("RGBA")
        source.putalpha(0)
        output = io.BytesIO()
        source.save(output, format="PNG")
        with self.assertRaises(ValueError):
            adapter.validate_image(output.getvalue())


class ImagePreparationTests(unittest.TestCase):
    def test_gateway_size_preserves_original_and_pads_target(self):
        payload = image_bytes(size=(940, 1672))
        target, original, metadata = adapter.prepare_image(payload)
        self.assertEqual(metadata, {
            "actual_size": [940, 1672],
            "output_size": [1024, 1824],
            "normalization": "uniform-scale-white-padding",
        })
        with Image.open(io.BytesIO(payload)) as before, Image.open(io.BytesIO(original)) as preserved:
            self.assertEqual(preserved.format, "PNG")
            self.assertEqual(preserved.size, before.size)
            self.assertEqual(preserved.convert("RGB").tobytes(), before.convert("RGB").tobytes())
        with Image.open(io.BytesIO(target)) as prepared:
            self.assertEqual(prepared.format, "PNG")
            self.assertEqual(prepared.size, (1024, 1824))
            self.assertEqual(prepared.convert("RGB").getpixel((0, 0)), (255, 255, 255))
            self.assertEqual(prepared.convert("RGB").getpixel((1023, 1823)), (255, 255, 255))
            self.assertEqual(prepared.convert("RGB").getpixel((20, 20)), (200, 150, 60))
            self.assertEqual(prepared.convert("RGB").getpixel((1000, 1800)), (80, 100, 120))

    def test_exact_target_size_requires_no_normalization(self):
        target, original, metadata = adapter.prepare_image(image_bytes())
        self.assertEqual(target, original)
        self.assertEqual(metadata, {
            "actual_size": [1024, 1824],
            "output_size": [1024, 1824],
            "normalization": "none",
        })

    def test_incorrect_aspect_ratio_or_insufficient_resolution_is_rejected(self):
        for size in [(1024, 1024), (1024, 1780), (500, 891)]:
            with self.subTest(size=size):
                with self.assertRaises(ValueError):
                    adapter.prepare_image(image_bytes(size=size))


if __name__ == "__main__":
    unittest.main()
