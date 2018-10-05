from django.conf import settings
import json
import logging
import requests
import os
from tastypie import fields
from tastypie.resources import Resource, Bundle

from .base import register


logger = logging.getLogger(__name__)


class QuestionnaireType(object):
    def __init__(self, **kwargs):
        for attr in ('id', 'name', 'description'):
            setattr(self, attr, kwargs.get(attr))


class QuestionnaireRequest(object):
    def __init__(self, **kwargs):
        for attr in ('id', 'patient_id', 'staff_member_id', 'mobile_phone', 'unique_code'):
            setattr(self, attr, kwargs.get(attr))
        if 'questionnaire_type' in kwargs:
            self.questionnaire_type = QuestionnaireType(**kwargs.get('questionnaire_type'))

# TODO error handling. It has to be looked at in general not just
# for these resources

QUESTIONNAIRE_APP_URI = settings.QUESTIONNAIRE_APP_URI
QUESTIONNAIRE_APP_API_SECRET_KEY = settings.QUESTIONNAIRE_APP_API_SECRET_KEY


def log_response(response, level=logging.ERROR):
    """Logs a Python requests HTTP response object"""
    logger.log(level, "Response status: %s", response.status_code)
    logger.log(level, "Response headers: \n%s", response.headers)
    logger.log(level, "Response body: \n%s", response.text)


class BaseQuestionnaireProxyResource(Resource):
    rel_url = ''

    def __init__(self, *args, **kwargs):
        Resource.__init__(self, *args, **kwargs)
        self.base_uri = os.path.join(QUESTIONNAIRE_APP_URI, 'api/')

    def uri(self, pk=None):
        uri = os.path.join(self.base_uri, self.rel_url)
        if pk is not None:
            uri = os.path.join(uri, '%s/' % pk)

        return uri

    def headers(self, headers={}):
        base_headers = {'Authorization': QUESTIONNAIRE_APP_API_SECRET_KEY}
        all_headers = base_headers.copy()
        all_headers.update(headers)
        return all_headers

    def rewrite_fk_uri(self, data, fk_name):
        if fk_name in data:
            data[fk_name] = data[fk_name].replace('/api/v1/', '/api/')

    def _get(self, pk=None):
        try:
            r = requests.get(self.uri(), headers=self.headers())
            data = r.json()

            return data
        except:
            logger.exception("Questionnaire App Communication Error.(URI: %s)", self.uri(pk))
            log_response(r)
            raise

    def detail_uri_kwargs(self, bundle_or_obj):
        kwargs = {}

        if isinstance(bundle_or_obj, Bundle):
            kwargs['pk'] = bundle_or_obj.obj.id
        else:
            kwargs['pk'] = bundle_or_obj.id

        return kwargs

    def get_object_list(self, request):
        data = self._get()
        results = [self.Meta.object_class(**qt) for qt in data.get('objects', [])]

        return results

    def obj_get_list(self, bundle, **kwargs):
        # Filtering disabled for brevity...
        return self.get_object_list(bundle.request)

    def obj_get(self, bundle, **kwargs):
        data = self._get(pk=kwargs['pk'])

        return self.Meta.object_class(**data)


@register
class QuestionnaireTypeResource(BaseQuestionnaireProxyResource):
    rel_url = 'questionnairetype/'

    id = fields.CharField('id')
    name = fields.CharField('name')
    description = fields.CharField('description')

    class Meta:
        resource_name = 'questionnairetype'
        object_class = QuestionnaireType
        allowed_methods = ['get']
        limit = 0
        max_limit = 0


@register
class QuestionnaireRequestResource(BaseQuestionnaireProxyResource):
    rel_url = 'request/'

    id = fields.CharField('id')

    questionnaire_type = fields.ForeignKey(QuestionnaireTypeResource, 'questionnaire_type')

    patient_id = fields.IntegerField('patient_id')
    staff_member_id = fields.IntegerField('staff_member_id')
    mobile_phone = fields.CharField('mobile_phone')

    unique_code = fields.CharField('unique_code', null=True)

    class Meta:
        resource_name = 'questionnairerequest'
        object_class = QuestionnaireRequest
        allowed_list_methods = ['get', 'post']
        allowed_detail_methods = ['get']
        always_return_data = True
        limit = 0
        max_limit = 0

    def _post(self, payload):
        try:
            headers = self.headers({'Content-Type': 'application/json'})
            r = requests.post(self.uri(), headers=headers, data=json.dumps(payload))
            return r.json()
        except:
            logger.exception("Questionnaire App Communication Error.(URI: %s)", self.uri())
            logger.error("Data posted: \n%s", json.dumps(payload))
            log_response(r)
            raise

    def obj_create(self, bundle, **kwargs):
        payload = bundle.data
        self.rewrite_fk_uri(payload, 'questionnaire_type')
        resp_data = self._post(payload)

        bundle.obj = QuestionnaireRequest(**resp_data)

        return bundle
