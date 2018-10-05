import re

from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404

from .models import FileAttachment, CsvTemp
from ..api import parse_resource_uri


def upload_attachment(request):
    if request.method != "POST":
        return _api_response(False, msg="Need to POST request",
                             status_code=405)

    resource_uri = request.POST.get("resource_uri", None) or None

    if not resource_uri:
        return _api_response(False, msg="resource_uri parameter is missing",
                             status_code=400)

    content_type, object_id = parse_resource_uri(resource_uri)

    if not object_id:
        return _api_response(False, msg="Couldn't reverse resource_uri",
                             status_code=400)

    if not content_type.model_class().objects.filter(id=object_id).exists():
        return _api_response(False, msg="Object doesn't exist",
                             status_code=404)

    desc = request.POST.get("desc", "")

    def make_attachment(file):
        attach = FileAttachment(content_type=content_type, object_id=object_id,
                                desc=desc, file=file, name=file.name,
                                mime_type=file.content_type,
                                creator=request.user)
        attach.save()
        return attach.id

    ids = list(map(make_attachment, request.FILES.values()))

    return _api_response(True, ids=ids)


def download_attachment(request, id=None, content_type=None, object_id=None,
                        filename=None):
    attach = get_object_or_404(FileAttachment, id=id)
    response = StreamingHttpResponse(attach.file, content_type=attach.mime_type)
    response['Content-Disposition'] = get_content_disposition(attach)
    return response


def get_content_disposition(attach):
    # Apparently it's better to host uploaded files on a separate
    # domain to prevent session stealing through HTML/SWF/etc.
    # But for now we will request download/save of most attachments.
    whitelist = ["image/.*", "application/(x-)?pdf"]
    safe = any(re.match(w, attach.mime_type) for w in whitelist)
    return "%s; filename=\"%s\"" % ("inline" if safe else "attachment",
                                    attach.name.replace('"', ''))


def upload_csv(request):
    if request.method != "POST":
        return _api_response(False, msg="Need to POST request",
                             status_code=405)

    def decode(b):
        return str(b, "utf-8", errors="backslashreplace")

    def make_csv_temp(file):
        header = decode(file.readline()).rstrip()
        data = decode(file.read())
        csv = CsvTemp(filename=file.name,
                      size=file.size,
                      header=header, data=data,
                      session_key=request.session.session_key,
                      creator=request.user)
        csv.save()
        return csv.id

    ids = list(map(make_csv_temp, request.FILES.values()))

    return _api_response(True, ids=ids)


def _api_response(success, status_code=None, **props):
    r = JsonResponse(dict(success=success, **props))
    if status_code is not None:
        r.status_code = status_code
    return r
