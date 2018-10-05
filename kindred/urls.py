from django.conf.urls import include, url
from django.contrib import admin
from django.contrib.auth.decorators import login_required
import django.views.defaults
import django.views.static

from . import api
from .app.views import Home, Config, IDLookup
from .people.views import MadelineTSVView, MadelineSVGView, MadelineJSONView
from .biobank.views import SampleQRCode, SampleLabel, SampleLabelsPrint
from .records.views import upload_attachment, download_attachment, upload_csv
from .users.views import MailUserAdmins
from .app.csv_export import CSVExport

admin.autodiscover()

urlpatterns = [
    url(r'^api/', include(api.v1.urls), name="api"),
    url(r'^views/config.json', Config.as_view(), name="config_json"),
    url(r'^views/madeline/(?P<family_group_id>\d+)\.svg',
        login_required(MadelineSVGView.as_view()), name="madeline-svg"),
    url(r'^views/madeline/(?P<family_group_id>\d+)\.tsv',
        login_required(MadelineTSVView.as_view()), name="madeline-tsv"),
    url(r'^views/madeline/(?P<family_group_id>\d+)\.json',
        login_required(MadelineJSONView.as_view()), name="madeline-json"),
    url(r'^views/biobank/qrcode/(?P<sample_id>\d+)\.svg',
        login_required(SampleQRCode.as_view()), name="sample-qrcode"),
    url(r'^views/biobank/label/(?P<sample_id>\d+)\.svg',
        login_required(SampleLabel.as_view()), name="sample-label"),
    url(r'^views/biobank/labels\.pdf',
        login_required(SampleLabelsPrint.as_view()), name="sample-labels-print"),
    url(r'^views/records/file-upload/',
        login_required(upload_attachment), name="file-upload"),
    url(r'^views/records/files/(?P<id>\d+)/(?P<content_type>[^/]+)/(?P<object_id>\d+)/(?P<filename>.*)',
        login_required(download_attachment), name="file-download"),
    url(r'^views/records/csv-upload/',
        login_required(upload_csv), name="csv-upload"),
    url(r'^views/csv/(?:(?P<study>[^/]+)/)?(?P<model>person|event|sample)\.csv',
        login_required(CSVExport.as_view()), name="csv-download"),
    url(r'^views/lookup/(?P<id>.+)/?$',
        login_required(IDLookup.as_view()), name="id-lookup"),
    url(r'^views/registration/', include("django.contrib.auth.urls")),
    url(r'^views/mail-user-admins/',
        MailUserAdmins.as_view(), name="mail-user-admins"),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^explorer/', include('explorer.urls')),

    # The single-page app view matches any URL. The javascript app will
    # handle routing to the correct client-side view.
    url(r'^(api|views|admin|explorer).*$',
        django.views.defaults.page_not_found),
    url(r'^.*$', Home.as_view(), name='home'),
]
