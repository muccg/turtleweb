import sys
import argparse
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Generate Typescript classes for API resources"

    def add_arguments(self, parser):
        parser.add_argument("--output", "-o", help="output file",
                            nargs="?", type=argparse.FileType("w"),
                            default=sys.stdout)

    def handle(self, output=sys.stdout, **options):
        from ....api.classgen import gen_typescript
        from ....api import v1
        gen_typescript(v1, output)
