import itertools
import json

from django.conf.urls import url
from django.core.exceptions import FieldError

from tastypie import fields
from tastypie.utils import trailing_slash, dict_strip_unicode_keys
from tastypie.http import HttpBadRequest

from ..records import models as records
from .base import register, BaseResource
from ..app.api_util import get_api_resource


@register
class CsvTempResource(BaseResource):
    creator = fields.ForeignKey("kindred.api.users.BriefUserResource",
                                "creator", full=True)
    preview = fields.CharField(readonly=True, use_in="detail")
    header = fields.ListField("get_headers", use_in="detail")
    data = fields.CharField("data", use_in="detail")

    class Meta(BaseResource.Meta):
        queryset = records.CsvTemp.objects.order_by("-id")

    def get_object_list(self, request):
        qs = super().get_object_list(request)
        return qs.filter(session_key=request.session.session_key)

    def dehydrate_preview(self, bundle):
        return "\n".join([bundle.obj.header, bundle.obj.data[:2000]])

    def prepend_urls(self):
        urls = [
            url(r"^(?P<resource_name>%s)/(?P<pk>\w+)/import%s$" %
                (self._meta.resource_name, trailing_slash()),
                self.wrap_view('do_import'), name="api_csv_import"),
        ]
        urls.extend(super().prepend_urls())
        return urls

    def do_import(self, request, **kwargs):
        self.method_check(request, allowed=['post'])
        obj, err = self._get_obj_for_wrapped_view(request, **kwargs)
        if err:
            return err

        data = self._get_json_request_data(request)
        if not isinstance(data, dict):
            return HttpBadRequest("Posted data is wrong")

        kwargs = pluck(data, ["resource", "key", "update", "create",
                              "overwrite_empty", "mapping"])
        dry_run = data.get("dry_run", False)
        limit = int(data.get("limit", 0)) or 10

        csv_import = CSVImport(obj, **kwargs)

        if dry_run:
            result = {
                'success': True,
                'updates': list(itertools.islice(csv_import.updates, 0, limit)),
                'fields': csv_import.fields,
                'limit': limit,
            }
        else:
            result = csv_import.apply_updates(request)
            result["success"] = True

        return self.create_response(request, result)


class CSVImport:

    def __init__(self, csvtemp, resource, key="id",
                 update=True, create=True,
                 overwrite_empty=True, mapping=None):
        mapping = mapping or {}
        self.resource_name = resource
        self.resource = get_api_resource(resource)
        self.model_cls = self.resource._meta.object_class
        self.updates = self.calc_updates(csvtemp, key, update, create,
                                         mapping)
        self.fields = [mapping[h] for h in csvtemp.get_headers()]

    def calc_updates(self, csvtemp, key, update, create, mapping):
        for row in csvtemp.get_csv_reader():
            if update and key:
                q = {key: csvtemp.get_value(row, key)}
                try:
                    existing = self.model_cls.objects.filter(**q)
                except (ValueError, FieldError):
                    # fixme: note that the key field is bad
                    existing = []
            else:
                existing = []

            change = {}

            if len(existing) == 0:
                if create:
                    change = {
                        "action": "C",
                    }
                else:
                    change = {"error": "U"}
            elif len(existing) > 1:
                change = {"error": "M"}
            else:
                change = {
                    "action": "U",
                    "pk": existing[0].pk,
                }

            if "action" in change:
                change["values"] = self.apply_mapping(csvtemp, row, mapping)
                if existing:
                    change["changes"] = self.calc_changes(change["values"], existing[0])

            change["success"] = "error" not in change

            yield change

    @staticmethod
    def apply_mapping(csvtemp, row, mapping):
        return {field: csvtemp.get_value(row, header)
                for (header, field) in mapping.items()
                if field}

    @staticmethod
    def calc_changes(values, existing):
        """
        this function is pretty useless because fields often have
        different type than csv string.
        """
        return sorted(f for (f, v) in values.items()
                      if f and getattr(existing, f, None) != v)

    def apply_updates(self, request):
        """
        Too hard to explain this.
        """
        res = self.resource
        num_updated = 0
        num_created = 0
        num_error_rows = 0
        updates = []
        for update in self.updates:
            action = update.get("action", "")
            if action not in ["C", "U"]:
                if "error" in action:
                    num_error_rows += 1
                continue

            if action == "C":
                initial = "{}"
            elif action == "U":
                obj = self.model_cls.objects.get(pk=update["pk"])
                bundle = res.build_bundle(obj=obj, request=request)
                bundle = res.full_dehydrate(bundle)
                bundle = res.alter_detail_data_to_serialize(request, bundle)
                initial = res.serialize(request, bundle, "application/json")

            updated, diff_count = self.csv_to_dict(json.loads(initial), update)

            deserialized = res.deserialize(request, json.dumps(updated))
            deserialized = res.alter_deserialized_detail_data(request, deserialized)
            bundle = res.build_bundle(data=dict_strip_unicode_keys(deserialized), request=request)

            if action == "C":
                res.obj_create(bundle=bundle)
                num_created += 1
            elif action == "U":
                res.obj_update(bundle=bundle, pk=update["pk"])
                num_updated += 1

            updates.append({"diff_count": diff_count})

        return {
            "updates": updates,
            "num_rows": len(updates),
            "num_updated": num_updated,
            "num_created": num_created,
            "fields_changed": sum(update["diff_count"] for update in updates),
            "num_error_rows": num_error_rows,
        }

    def csv_to_dict(self, initial, update):
        """
        Transfers field updates into the serialized object dict so they
        can be saved back.
        """
        diff_count = 0
        for field, value in update["values"].items():
            if value:
                diff_count += 1 if initial.get(field, None) != value else 0
                # if initial.get(field, None) != value:
                #     print("%s: %s is different to %s" % (field, initial.get(field, None), value))
                initial[field] = value

        return initial, diff_count


def pluck(data, keys):
    return dict((key, data[key]) for key in keys if key in data)
