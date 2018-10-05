import json
from django.http import HttpResponse, HttpResponseServerError, HttpResponseBadRequest
from django.views.generic import View
from django import forms
from django.views.decorators.cache import never_cache
from django.shortcuts import get_object_or_404
from .models import FamilyGroup
from .madeline import Madeline, family_group_tsv
from ..diagnosis.models import DiagnosisIndex

__all__ = ["Madeline", "MadelineTSVView", "MadelineSVGView", "MadelineJSONView"]


class MadelineJSONView(View):
    @never_cache
    def get(self, request, family_group_id=None):
        def make_response(svg_data, messages, errors):
            result = {
                'svg': svg_data,
                'messages': messages,
                'errors': errors
            }
            return HttpResponse(json.dumps(result), content_type="application/json")

        family = get_object_or_404(FamilyGroup, id=family_group_id)

        form = MadelineForm(request.GET)
        if not form.is_valid():
            return HttpResponseBadRequest()

        svg_path, messages, errors = Madeline.get_madeline_svg(family, form)
        if svg_path is None:
            return make_response(None, messages, errors)

        svg_data, xsl_errors = Madeline.postprocess_svg(svg_path)
        errors += xsl_errors
        Madeline.safe_unlink(svg_path)
        return make_response(svg_data, messages, errors)


class MadelineSVGView(View):
    @never_cache
    def get(self, request, family_group_id=None):
        family = get_object_or_404(FamilyGroup, id=family_group_id)

        form = MadelineForm(request.GET)
        if not form.is_valid():
            return HttpResponseBadRequest()

        svg_path, messages, errors = Madeline.get_madeline_svg(family, form)
        if svg_path is None:
            return HttpResponseServerError('\n'.join(errors))

        svg_data, xsl_errors = Madeline.postprocess_svg(svg_path)
        errors += xsl_errors
        Madeline.safe_unlink(svg_path)
        if svg_data is None:
            return HttpResponseServerError('\n'.join(errors))

        return HttpResponse(svg_data, content_type="image/svg+xml")


class MadelineTSVView(View):
    def get(self, request, family_group_id=None):
        family = get_object_or_404(FamilyGroup, id=family_group_id)

        form = MadelineForm(request.GET)
        if not form.is_valid():
            return HttpResponseBadRequest()

        response = HttpResponse(content_type="text/plain")
        family_group_tsv(response, family, form.cleaned_data["affected"])
        return response


class MadelineForm(forms.Form):
    FIELD_CHOICES = (("resource_uri", "IndividualId"), ("id", "ID"),
                     ("dob", "DOB"), ("name", "Name"))
    nolabeltruncation = forms.BooleanField(required=False)
    color = forms.BooleanField(required=False)
    affected = forms.ModelMultipleChoiceField(queryset=DiagnosisIndex.objects.all(),
                                              required=False)
    labels = forms.MultipleChoiceField(choices=FIELD_CHOICES, required=False)
    sibling_sort = forms.ChoiceField(choices=FIELD_CHOICES, required=False)

    _labels = dict(FIELD_CHOICES)

    def get_label_names(self):
        return list(map(self._labels.get, self.cleaned_data["labels"]))

    def get_sibling_sort(self):
        s = self.cleaned_data["sibling_sort"]
        return self._labels[s] if s else None
