"""Explicit demo database selection without launching or modifying a real DB."""
import io
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts import start_demo


class StartDemoTests(unittest.TestCase):
    def test_requires_explicit_database_even_with_environment(self):
        with patch.dict(os.environ, {'SAIGON_DATABASE': 'personal.db'}), \
             patch.object(start_demo.subprocess, 'call') as launch, redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as raised:
                start_demo.main([])
            self.assertEqual(raised.exception.code, 2)
            launch.assert_not_called()

    def test_missing_database_is_not_created_or_launched(self):
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / 'missing.db'
            with patch.object(start_demo.subprocess, 'call') as launch, redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as raised:
                    start_demo.main(['--database', str(database)])
                self.assertEqual(raised.exception.code, 2)
                launch.assert_not_called()
                self.assertFalse(database.exists())

    def test_uses_selected_path_and_preserves_file(self):
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / 'selected.db'
            database.write_bytes(b'untouched test fixture')
            with patch.object(start_demo.subprocess, 'call', return_value=7) as launch:
                self.assertEqual(start_demo.main(['--database', str(database), '--port', '18080']), 7)
            command = launch.call_args.args[0]
            self.assertEqual(command[-4:], ['--host', '127.0.0.1', '--port', '18080'])
            self.assertEqual(launch.call_args.kwargs['env']['SAIGON_DATABASE'], str(database.resolve()))
            self.assertEqual(database.read_bytes(), b'untouched test fixture')

    def test_invalid_port_does_not_launch(self):
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / 'selected.db'
            database.touch()
            with patch.object(start_demo.subprocess, 'call') as launch, redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit):
                    start_demo.main(['--database', str(database), '--port', '0'])
                launch.assert_not_called()
