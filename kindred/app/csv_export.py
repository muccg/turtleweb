import csv
from io import StringIO
import datetime
import json
from django.http import StreamingHttpResponse, Http404, HttpResponseBadRequest
from django.views.generic import View
from django.shortcuts import get_object_or_404

from ..query.query import PersonQueryExpr, EventQueryExpr, SampleQueryExpr
from ..project.models import Study, PatientHasCase
from ..events.models import Event, EventType

__all__ = ["CSVExport"]


def id(x):
    return x


def format_date(d):
    if d is not None:
        return d.strftime("%d/%m/%Y")
    return ""


def format_datetime(dt):
    if dt is not None:
        return dt.strftime("%d/%m/%Y %H:%M:%S")
    return ""


def format_time(dt):
    if dt is not None:
        return dt.strftime("%H:%M:%S")
    return ""


def format_bool(b):
    return "Yes" if b is True else "No" if b is False else ""


def format_studies(sms):
    return ", ".join(sm.study.name for sm in sms)


def format_patient_cases(sms, study=None):
    smids = [sm.id for sm in sms if sm.study == study or not study]
    return ", ".join(phc.case.name for phc
                     in PatientHasCase.objects.filter(study_member__in=smids))


def get_consent_status(p, study=None):
    return p.consent_status(study.id) if study else None


def get_consent_date(p, study=None):
    consent_date = p.consent_date(study.id) if study else None
    return format_date(consent_date) if consent_date is not None else None


def get_event_type(s):
    id = s.get_event_type_id()
    return EventType.objects.get(id=id) if id is not None else None


def get_transaction_date(type):
    def _get_transaction_date(s):
        return s.transactions.filter(type=type).values_list("date", flat=True).first()
    return _get_transaction_date


def get_sample_event(s):
    ids = s.transactions.values_list("samplecollection__event")
    return Event.objects.filter(id__in=ids).first()


def format_location_container(loc):
    return " / ".join(loc.container.get_path()) if loc else None


def format_location_position(loc):
    return loc.fmt_coord() if loc else None


def format_location(loc):
    return "%s / %s" % (format_location_container(loc), format_location_position(loc))


def format_attr(attr, fmt):
    get = attrgetter(attr)

    def _format_attr(obj):
        val = get(obj)
        return fmt(val) if val is not None else None
    return _format_attr


def json_attr(attr, field):
    get = attrgetter(attr)

    def _json_attr(obj):
        val = get(obj)
        return val.get(field) if val is not None else None
    return _json_attr


def pluck(ks, d):
    return {k: v for (k, v) in d.items() if k in set(ks)}


def attrgetter(attrs):
    """
    Like operator.attrgetter() except it handles None values.
    """
    parts = attrs.split(".", 1)
    attr = parts[0]
    subattr = attrgetter(parts[1]) if len(parts) > 1 else lambda x: x

    def _attrgetter(obj):
        val = getattr(obj, attr)
        return subattr(val) if val is not None else None
    return _attrgetter


class Column:

    def __init__(self, name, heading, get=None, fmt=None, params=[]):
        self.name = name
        self.heading = heading
        self.get = get or attrgetter(name)
        self.fmt = fmt or id
        self.params = params or []

    def cell(self, obj, **kwargs):
        val = self.get(obj)
        if callable(val):
            val = val()
        if val is not None:
            val = self.fmt(val, **pluck(self.params, kwargs))
            if callable(val):
                val = val()
        return "" if val is None else str(val)

person_cols = [
    Column("id", "Primary Key", attrgetter("id")),
    Column("patient_id", "Patient ID", attrgetter("patient_id")),
    Column("first_name", "First Name", attrgetter("first_name")),
    Column("last_name", "Last Name", attrgetter("last_name")),
    Column("other_name", "Other Name", attrgetter("other_name")),
    Column("sex", "Sex", attrgetter("sex")),
    Column("dob", "DOB", attrgetter("dob"), format_date),
    Column("dod", "DOD", attrgetter("dod"), format_date),
    Column("deceased", "Deceased", attrgetter("deceased"), format_bool),
    Column("cause_of_death", "Cause of Death", attrgetter("cause_of_death")),
    Column("title", "Title", attrgetter("title.name")),
    Column("studies", "Studies", attrgetter("studies.all"), format_studies),
    Column("case", "Patient Case", attrgetter("studies.all"), format_patient_cases, ["study"]),
    Column("full_name", "Patient", attrgetter("get_full_name")),
    Column("pid_full_name", "Patient", attrgetter("get_pid_full_name")),
    Column("consent_status", "Consent Status", id, get_consent_status, ["study"]),
    Column("consent_date", "Consent Date", id, get_consent_date, ["study"]),
]

event_cols = [
    Column("id", "Primary Key", attrgetter("id")),
    Column("ident", "Event ID", attrgetter("ident")),
    Column("type", "Type", attrgetter("type.name")),
    Column("datetime", "Date & Time", attrgetter("date"), format_datetime),
    Column("date", "Date", attrgetter("date"), format_date),
    Column("time", "Time", attrgetter("date"), format_time),
    Column("study", "Study", attrgetter("study.name")),
    Column("person.id", "Person PK", attrgetter("person.id")),
    Column("person.pid_full_name", "Patient", attrgetter("person.get_pid_full_name")),
]

sample_cols = [
    Column("id", "Primary Key", attrgetter("id")),
    Column("specimen_id", "Specimen ID", attrgetter("specimen_id")),
    Column("container", "Container", attrgetter("location"), format_location_container),
    Column("position", "Position", attrgetter("location"), format_location_position),
    Column("location", "Location", attrgetter("location"), format_location),
    Column("cls", "Class", attrgetter("cls.name")),
    Column("subtype", "Sub-type", attrgetter("subtype.name")),
    Column("stored_in", "Stored In", attrgetter("stored_in.name")),
    Column("treatment", "Treatment", attrgetter("treatment.name")),
    Column("behaviour", "Behaviour", attrgetter("behaviour.name")),
    Column("dna_extraction_protocol", "DNA Extraction Protocol", attrgetter("dna_extraction_protocol.name")),
    Column("amount", "amount", attrgetter("amount")),
    Column("concentration", "concentration", attrgetter("concentration")),
    Column("collection.date", "Collection", get_transaction_date("C"), format_datetime),
    Column("processed.date", "Processed", get_transaction_date("P"), format_datetime),
    Column("frozenfixed.date", "Frozen/Fixed", get_transaction_date("F"), format_datetime),
    Column("event.event_id", "Event ID", get_sample_event, attrgetter("ident")),
    Column("event.id", "Event PK", get_sample_event, attrgetter("id")),
    Column("event.type", "Event Type", get_event_type, attrgetter("name")),
    Column("owner.patient_id", "Patient ID", attrgetter("get_owner"), attrgetter("patient_id")),
    Column("owner.pid_full_name", "Patient ID", attrgetter("get_owner"), attrgetter("get_pid_full_name")),
    Column("owner.last_name", "Last Name", attrgetter("get_owner"), attrgetter("last_name")),
    Column("owner.second_name", "owner.second_name", attrgetter("get_owner"), attrgetter("second_name")),
    Column("owner.first_name", "owner.first_name", attrgetter("get_owner"), attrgetter("first_name")),
    Column("owner.dob", "DOB", attrgetter("get_owner"), format_attr("dob", format_date)),
    Column("owner.dod", "DOD", attrgetter("get_owner"), format_attr("dod", format_date)),
    Column("owner.umrn", "UMRN", attrgetter("get_owner"), json_attr("data", "umrn")),
    Column("owner.wa_crn", "WA CRN", attrgetter("get_owner"), json_attr("data", "wa_crn")),
    Column("owner.cameron_db_id", "owner.cameron_db_id", attrgetter("get_owner"), json_attr("data", "cameron_db_id")),
    Column("owner.wartn_subject_id", "owner.wartn_subject_id", attrgetter("get_owner"), json_attr("data", "wartn_subject_id")),
]


class CSVExport(View):

    def get(self, request, study="", model=""):
        study = get_object_or_404(Study, slug=study) if study and study != "_" else None
        query_cls = self.get_query_cls(model)
        try:
            jq = self.get_json_query(request.GET.get("jq"))
        except ValueError:
            return HttpResponseBadRequest("jq")
        qs = self.get_queryset(query_cls, study, jq)
        cols = self.get_cols(model, request.GET.getlist("c", []))
        csv = self.gen_csv(qs, study, cols)
        response = StreamingHttpResponse(csv, content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="%s"' % self.get_filename(model)
        return response

    def get_json_query(self, jq):
        return json.loads(jq) if jq else None

    def get_query_cls(self, model):
        if model == "person":
            return PersonQueryExpr
        elif model == "event":
            return EventQueryExpr
        elif model == "sample":
            return SampleQueryExpr
        else:
            raise Http404("Model not supported")

    def get_filename(self, model):
        now = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        return "%s-%s.csv" % (model, now)

    def get_queryset(self, query_cls, study, jq):
        qs = query_cls.get_model().objects.all()
        return qs.filter(query_cls(jq, study.id if study else None).q)

    def get_all_cols(self, model):
        if model == "person":
            return person_cols
        elif model == "event":
            return event_cols
        elif model == "sample":
            return sample_cols
        else:
            return []

    def get_data_cols(self, col_names):
        def field(c):
            return c.lstrip("data.")
        return [Column(c, field(c), json_attr("data", field(c)))
                for c in col_names]

    def get_cols(self, model, col_names):
        return ([c for c in self.get_all_cols(model)
                 if c.name in col_names or not col_names] +
                self.get_data_cols(col_names))

    def gen_csv(self, qs, study, cols):
        return self.csv_iter(self.gen_contents(qs, study, cols))

    def gen_contents(self, qs, study, cols):
        yield self.make_header_row(cols)
        for obj in qs:
            yield [col.cell(obj, study=study) for col in cols]

    def make_header_row(self, cols):
        return [col.name for col in cols]

    @staticmethod
    def csv_iter(iterable):
        """
        csv module can't be used as a generator, so we have to write each
        row to a temp buffer then yield it.
        """
        out_fd = StringIO()
        w = csv.writer(out_fd)
        for row in iterable:
            w.writerow(row)
            yield out_fd.getvalue()
            out_fd.truncate(0)
            out_fd.seek(0)

    @staticmethod
    def quote_escape(val):
        # escape quotes
        val = val.replace('"', '""')
        # quote cell if it contains delimiter
        if "," in val:
            val = '"%s"' % val
        return val
