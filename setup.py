import os
import os.path
import re
from setuptools import setup, find_packages


def package_files(package):
    path = package.replace('.', os.path.sep)
    data_files = []
    for data_dir in ('templates', 'static', 'migrations', 'scripts'):
        data_files.extend(os.path.join(subdir.replace(path + "/", "", 1), f)
                          for (subdir, dirs, files) in os.walk(os.path.join(path, data_dir)) for f in files)
    return data_files


def get_package_version(package):
    version = re.compile(r"(?:__)?version(?:__)?\s*=\s\"(.*)\"", re.I)
    initfile = os.path.join(os.path.dirname(__file__), package, "__init__.py")
    for line in open(initfile):
        m = version.match(line)
        if m:
            return m.group(1)
    return "UNKNOWN"

packages = find_packages(exclude=["*.tests", "*.tests.*", "tests.*", "tests"])
package_data = dict((p, package_files(p)) for p in packages)
package_scripts = [
    "scripts/turtle",
]
package_version = get_package_version("kindred")

setup(name='django-kindred',
      version=package_version,
      description='Kindred Spirits',
      author='Centre for Comparative Genomics',
      author_email='web@ccg.murdoch.edu.au',
      packages=packages,
      package_data=package_data,
      include_package_data=True,
      zip_safe=False,
      install_requires=[],
      scripts=package_scripts,
      entry_points={
          "console_scripts": [
              "turtle-export = migrate.odbc_export:main",
              "turtle-import = migrate.load_turtle_csv:main",
              "turtle-migrate = migrate.load_turtleweb:main",
              "load-wago = migrate.load_wago:main",
          ],
      },
      )
