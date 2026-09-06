"""Run only with a disposable database; never add test users to the user's DB."""
import argparse
import os
from pathlib import Path
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--backend", type=Path, required=True)
parser.add_argument("--serve", action="store_true")
args = parser.parse_args()
sys.path.insert(0, str(args.backend.resolve()))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DEBUG"] = "True"
os.environ["COOKIE_SECURE"] = "False"
os.environ["ALLOWED_HOSTS"] = "localhost,127.0.0.1"
os.environ["FRONTEND_URLS"] = "http://localhost:4201,https://web.taji.test"
database_name = os.environ.get("TAJI_E2E_DB", "taji_web_e2e")
if not database_name.endswith("_e2e"):
    raise SystemExit("TAJI_E2E_DB must end in _e2e; refusing to modify a real database.")

from django.conf import settings
import psycopg
from psycopg import sql

db = settings.DATABASES["default"]
with psycopg.connect(dbname="postgres", user=db["USER"], password=db["PASSWORD"],
                     host=db["HOST"], port=db["PORT"], autocommit=True) as connection:
    exists = connection.execute("SELECT 1 FROM pg_database WHERE datname=%s", [database_name]).fetchone()
    if not exists:
        connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))
db["NAME"] = database_name

import django
django.setup()
from django.core.management import call_command
from accounts.models import Role, User

call_command("migrate", interactive=False, verbosity=0)
call_command("seed_rbac", verbosity=0)
for email, role in (("admin@sprint1.taji.test", "administrador"), ("residente@sprint1.taji.test", "residente")):
    user = User.objects.filter(email=email).first()
    if user is None:
        user = User.objects.create_user(email=email, password="TajiSprint1-Test2026!",
            first_name="Prueba", last_name="Sprint Uno", role=Role.objects.get(slug=role), is_approved=True)
    else:
        user.set_password("TajiSprint1-Test2026!")
        user.save(update_fields=["password"])
print(f"Isolated E2E database ready: {database_name}", flush=True)
if args.serve:
    call_command("runserver", "127.0.0.1:8001", use_reloader=False)
