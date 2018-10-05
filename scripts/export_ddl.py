from kindred.app.models import AbstractNameList, AbstractNameDescList
from kindred.app.utils import kindred_apps

import csv
import sys


def export_ddls():
    f = csv.writer(sys.stdout)
    f.writerow(["App", "Model", "Order", "Name", "Desc", "Default"])

    for app in kindred_apps():
        for model in app.get_models():
            if issubclass(model, (AbstractNameList, AbstractNameDescList)):
                for ob in model.objects.order_by("id"):
                    f.writerow([app.label, model.__name__, ob.order,
                                ob.name, ob.desc if hasattr(ob, "desc") else "",
                                "1" if ob.default else ""])


def main():
    import django
    django.setup()
    export_ddls()

if __name__ == "__main__":
    main()
