import re
import collections
from functools import reduce
from itertools import chain
import datetime
import logging

from django.db.models import Q
from django.utils.timezone import make_aware

from ..app.api_util import get_tablename_from_resource

logger = logging.getLogger(__name__)


def _date_range_q(val, fieldname):
    q = {}
    if val is None:
        q[fieldname + "__isnull"] = True
    else:
        if val.get("start", None):
            q[fieldname + "__gte"] = val["start"]
        if val.get("end", None):
            q[fieldname + "__lte"] = val["end"]
    return Q(**q)


def _datetime_range_q(val, fieldname):
    if val and val.get("start", None):
        val["start"] = make_datetime(val["start"], False)
    if val and val.get("end", None):
        val["end"] = make_datetime(val["end"], True)
    return _date_range_q(val, fieldname)


def make_datetime(date_str, end):
    date = datetime.datetime.strptime(date_str, "%Y-%m-%d")
    if end:
        add = datetime.timedelta(days=1, seconds=-1)
    else:
        add = datetime.timedelta(0)
    return str(make_aware(date + add))


number_pat = re.compile(r"^\d+$")


def _is_numeric(val):
    return (isinstance(val, (int, float)) or
            (isinstance(val, str) and bool(number_pat.match(val))))


empty_q = Q(pk__in=[])


class BaseQueryExpr(object):

    def __init__(self, expr, study_id=None):
        self.study_id = study_id
        self.q = self._qexpr(expr)
        if study_id is not None:
            self.q = self.q & self._study_filter(study_id)

    def _qexpr(self, expr):
        if isinstance(expr, dict):
            if "and" in expr:
                return Q(*map(self._qexpr, expr["and"]))
            elif "or" in expr:
                terms = map(self._qexpr, expr["or"])
                return reduce(lambda qo, q: qo | q, terms, Q())
            elif "not" in expr:
                return ~self._qexpr(expr["not"])
            elif "name" in expr:
                val = expr.get("value", None)
                exact = expr.get("exact", False)
                return self._query_field(expr["name"], val, exact)
            elif len(expr) == 0:
                # empty query matches all
                return Q()
        elif isinstance(expr, str):
            match = self._id_matcher(expr)
            if match:
                return self._id_query(match, True)
            else:
                return self._any_name_query(expr, False)
        elif expr is None:
            # empty query matches all
            return Q()

        # anything not recognized results in empty queryset
        return empty_q

    def _query_field(self, names, val, exact):
        if len(names) == 0:
            return empty_q
        elif len(names) == 1:
            return self._query_field1(names[0], val, exact)
        else:
            return self._query_related_field(names[0], names[1:], val, exact)

    def _query_field1(self, name, val, exact):
        query_field = getattr(self, "_field_query_%s" % name, None)
        if isinstance(query_field, collections.Callable):
            return query_field(val, exact)
        else:
            return self.query_field_fallback(name, val, exact)

    # subclasses should implement _field_query_BLAH like this
    def _field_query_name(self, val, exact):
        return self._any_name_query(val, exact)

    def _any_name_query(self, expr, exact):
        raise NotImplementedError()

    def _id_matcher(self, val):
        "Returns regexp match object if text looks like a record id"
        return None

    def _field_query_pk(self, val, exact):
        # assuming pks are integers
        return Q(pk=int(val) if _is_numeric(val) else None)

    def query_field_fallback(self, name, val, exact):
        """
        What to do if a field name is not implemented in the query class.
        Try to find the field in custom data schema,
        otherwise return nothing and log the query.
        """
        custom_fields = self.find_custom_fields(name)
        if custom_fields:
            return self._custom_data_query(name, custom_fields, val, exact)
        else:
            logger.warning("Unrecognized query field \"%s\"" % name)
            return Q(id__in=[])

    def find_custom_fields(self, name):
        from ..project.models import CustomDataSchema
        model_name = self.get_model()._meta.model_name
        field = CustomDataSchema.get_field(name, model_name, self.study_id)
        return [field] if field else []

    def _custom_data_query(self, name, fields, val, exact):
        cls = self.get_model()
        table = cls._meta.db_table

        is_str = isinstance(val, (str, type(None)))
        strglob = ("%" + val + "%") if val and is_str else None

        # fixme: for empty values, need to check that the field exists
        # on the particular event's event type.
        # fixme: need a cleaner way to generate query sql

        def field_query(field):
            p = {
                "table": table,
                "name": name,
                "val": strglob,
                "like": "=" if exact else "ILIKE",
            }
            if is_str and field.get("type") == "resourceId":
                if val:
                    resource = field.get("resource")
                    if _is_numeric(resource):
                        # custom drop-down list
                        p["ddl_id"] = int(resource)
                        rq = """
                            SELECT %(table)s.id
                            FROM %(table)s INNER JOIN app_customdropdownvalue
                            ON data->>%%(name)s = app_customdropdownvalue.id::text
                            WHERE app_customdropdownvalue.name %(like)s %%(val)s
                              AND app_customdropdownvalue.list_id = %%(ddl_id)s
                        """
                    else:
                        p["other_table"] = get_tablename_from_resource(resource)
                        rq = """
                            SELECT %(table)s.id
                            FROM %(table)s INNER JOIN %(other_table)s
                            ON data->>%%(name)s = %(other_table)s.id::text
                            WHERE %(other_table)s.name %(like)s %%(val)s
                        """
                else:
                    rq = """
                        SELECT %(table)s.id
                        FROM %(table)s
                        WHERE (data->>%%(name)s) IS NULL
                           OR (data->>%%(name)s) = ''
                    """
            elif isinstance(val, dict) and field.get("type") in ("date", "datetime"):
                if val:
                    p["start"] = val.get("start")
                    p["end"] = val.get("end")
                    range = filter(bool, [
                        "data->>%(name)s ~ E'^\\\\d+-\\\\d+-\\\\d+'",
                        "CAST(data->>%(name)s AS date) >= %(start)s" if p["start"] else None,
                        "CAST(data->>%(name)s AS date) <= %(end)s" if p["end"] else None,
                    ])
                    p["range"] = " AND ".join(range)
                    rq = """
                        SELECT id FROM %(table)s
                        WHERE %(range)s
                    """
                else:
                    rq = """
                        SELECT id FROM %(table)s
                        WHERE (data->>%%(name)s) IS NULL
                    """
            elif field.get("type") in ("integer", "number"):
                if val is None:
                    rq = """
                        SELECT id FROM %(table)s
                        WHERE (data->>%%(name)s) IS NULL
                    """
                elif isinstance(val, dict):
                    p["start"] = val.get("start")
                    p["end"] = val.get("end")
                    range = filter(bool, [
                        "data->>%(name)s ~ E'^[-.0-9]+$'",
                        "CAST(data->>%(name)s AS numeric) >= %(start)s" if p["start"] else None,
                        "CAST(data->>%(name)s AS numeric) <= %(end)s" if p["end"] else None,
                    ])
                    p["range"] = " AND ".join(range)
                    rq = """
                        SELECT id FROM %(table)s
                        WHERE %(range)s
                    """
                else:
                    try:
                        p["val"] = float(val)
                        rq = """
                            SELECT id FROM %(table)s
                            WHERE (data->>%%(name)s ~ E'^[-.0-9]+$') AND
                              (CAST(data->>%%(name)s AS numeric) = %%(val)s)
                        """
                    except ValueError:
                        rq = None
            elif field.get("type") == "boolean":
                if val is None:
                    rq = """
                        SELECT id FROM %(table)s
                        WHERE (data->>%%(name)s) IS NULL
                    """
                else:
                    p["val"] = "TRUE" if self._convert_bool(val) else "FALSE"
                    rq = """
                        SELECT id FROM %(table)s
                        WHERE CAST(data->>%%(name)s AS boolean) = %%(val)s
                    """
            elif is_str:
                if val:
                    rq = "SELECT id FROM %(table)s WHERE data->>%%(name)s %(like)s %%(val)s"
                else:
                    rq = """
                        SELECT id FROM %(table)s
                        WHERE (data->>%%(name)s) IS NULL
                          OR (data->>%%(name)s) = ''
                    """
            else:
                rq = None
            return cls.objects.raw(rq % p, p) if rq else []

        rqs = map(field_query, fields)
        return Q(id__in=chain(*[[x.id for x in rq] for rq in rqs]))

    def _query_related_field(self, related, names, val, exact):
        query_expr, lookup = self._get_related_cls(related)
        model = query_expr.get_model()
        rq = query_expr({"name": names, "value": val, "exact": exact}).q
        q = {"%s__in" % lookup: model.objects.filter(rq)}
        return Q(**q)

    def _get_related_cls(self, related):
        "Returns tuple of (QueryExprClass, field_name)"
        raise NotImplementedError()

    @staticmethod
    def _foreign_name_query(field, val, exact):
        "Query AbstractNameList/etc foreign keys by name"
        if val:
            if not isinstance(val, str):
                val = str(val)
            cmp = "exact" if exact else "contains"
            q = {"%s__name__i%s" % (field, cmp): val}
        else:
            q = {"%s__isnull" % field: True}
        return Q(**q)

    @staticmethod
    def _convert_bool(val):
        """
        Convert bool values. This string conversion shouldn't normally be
        required because the frontend search parser does it.
        """
        if isinstance(val, str):
            val = val.lower()
            return val in ["yes", "y", "1", "t", "true"]
        else:
            return bool(val)

    @classmethod
    def _bool_query(cls, val, exact, field):
        if not val and (val is None or isinstance(val, str)):
            q = {"%s__isnull" % field: True}
        else:
            q = {field: cls._convert_bool(val)}
        return Q(**q)

    @staticmethod
    def _string_query(val, exact, *fields):
        def string_query(field):
            if val:
                cmp = "exact" if exact else "contains"
                q = {"%s__i%s" % (field, cmp): val}
            else:
                q = {"%s__isnull" % field: True}
            return Q(**q)

        terms = map(string_query, fields)
        return reduce(lambda qo, q: qo | q, terms, Q())

    @staticmethod
    def _record_id_query(val, exact, field):
        if val:
            id_int = int(val) if _is_numeric(val) else None
            if id_int is None:
                q = {field: val}
            else:
                q = {"%s__regex" % field: "[-0]%d$" % id_int}
            return Q(**q)
        else:
            return empty_q

    @staticmethod
    def _record_id_match(val, prefix=r"[PEB]"):
        return re.match(r"((?P<entity>%s)-)?(?P<id>[0-9]+)" % prefix, val, re.I)

    def _study_filter(self, study_id):
        return Q()


class PersonQueryExpr(BaseQueryExpr):
    name_fields = ["last_name", "maiden_name", "first_name",
                   "second_name", "other_name"]

    @staticmethod
    def get_model():
        from ..people.models import Person
        return Person

    def _any_name_query(self, val, exact):
        return self._string_query(val, exact, *self.name_fields)

    def _id_matcher(self, val):
        return self._record_id_match(val)

    def _id_query(self, match, exact):
        if match.group("entity") == "E":
            return self._query_related_field("event", ["id"], match.group("id"), exact)
        elif match.group("entity") == "B":
            # fixme: sample owner search not implemented
            # return self._query_related_field("sample", ["id"], match.group("id"), exact)
            return Q(id__in=[])
        else:
            return self._field_query_id(match.group("id"), exact)

    def _field_query_id(self, val, exact):
        return self._record_id_query(val, exact, "patient_id")

    def _field_query_sex(self, val, exact):
        return Q(sex__iexact=val)

    def _field_query_given(self, val, exact):
        return self._string_query(val, exact, "first_name", "second_name")

    def _field_query_alias(self, val, exact):
        return self._string_query(val, exact, "other_name", "maiden_name")

    def _field_query_surname(self, val, exact):
        return self._string_query(val, exact, "last_name")

    def _field_query_dob(self, val, exact):
        return _date_range_q(val, "dob")

    def _field_query_dod(self, val, exact):
        return _date_range_q(val, "dod")

    def _field_query_deceased(self, val, exact):
        return self._bool_query(val, exact, "deceased")

    def _field_query_cod(self, val, exact):
        return self._string_query(val, exact, "cause_of_death")

    def _field_query_study(self, val, exact):
        return Q(studies__study__slug__iexact=val)

    def _study_filter(self, study_id):
        return Q(studies__study_id=study_id)

    def _field_query_case(self, val, exact):
        from ..project.models import PatientHasCase
        cq = {"case__name__iexact" if exact else "case__name__icontains": val}
        cases = PatientHasCase.objects.filter(**cq)
        return Q(studies__in=cases.values_list("study_member"))

    def _field_query_group(self, val, exact):
        q = self._foreign_name_query("study_groups", val, exact)
        if _is_numeric(val):
            q = q | Q(study_groups__id=val)
        return q

    def _field_query_search(self, val, exact):
        from ..reports.models import Search
        search = Search.objects.filter(name__iexact=val).first()
        if search:
            if search.resource == "person":
                return search.get_q()
            elif search.resource == "event":
                return Q(event__in=search.get_qs())
            elif search.resource == "sample":
                return Q(event__samplecollection__sample__in=search.get_qs())
        return empty_q

    def _field_query_consent(self, val, exact):
        q = self._foreign_name_query("studies__consents__status", val, exact)
        if self.study_id is None:
            return q
        else:
            return q & Q(studies__study_id=self.study_id)

    def _field_query_consent_date(self, val, exact):
        q = _date_range_q(val, "studies__consents__date")
        if self.study_id is None:
            return q
        else:
            return q & Q(studies__study_id=self.study_id)

    def _get_related_cls(self, related):
        if related == "event":
            return EventQueryExpr, "event"
        raise Exception("unrelated " + related)


class SampleQueryExpr(BaseQueryExpr):

    @staticmethod
    def get_model():
        from ..biobank.models import Sample
        return Sample

    def _id_matcher(self, val):
        return self._record_id_match(val)

    def _id_query(self, match, exact):
        if match.group("entity") == "E":
            return self._query_related_field("event", ["id"], match.group("id"), exact)
        elif match.group("entity") == "P":
            return self._query_related_field("owner", ["id"], match.group("id"), exact)
        else:
            return self._field_query_id(match.group("id"), exact)

    def _field_query_id(self, val, exact):
        return self._record_id_query(val, exact, "specimen_id")

    def _any_name_query(self, val, exact):
        prefix = "transactions__samplecollection__event__person__"
        names = [prefix + name for name in PersonQueryExpr.name_fields]
        return self._string_query(val, exact, *names)

    def _field_query_study(self, val, exact):
        return Q(transactions__samplecollection__event__study__slug__iexact=val)

    def _field_query_collected(self, val, exact):
        if val is None:
            return (~Q(transactions__samplecollection__isnull=False) |
                    Q(transactions__type="C", transactions__samplecollection__date__isnull=True))
        return _datetime_range_q(val, "transactions__samplecollection__date")

    def _field_query_processed(self, val, exact):
        if val is None:
            return ~Q(transactions__sampleprocessed__isnull=False)
        return _datetime_range_q(val, "transactions__sampleprocessed__date")

    def _field_query_frozenfixed(self, val, exact):
        if val is None:
            return ~Q(transactions__samplefrozenfixed__isnull=False)
        return _datetime_range_q(val, "transactions__samplefrozenfixed__date")

    def _field_query_type(self, val, exact):
        return self._foreign_name_query("cls", val, exact)

    def _field_query_subtype(self, val, exact):
        return self._foreign_name_query("subtype", val, exact)

    def _field_query_nature(self, val, exact):
        return self._foreign_name_query("nature", val, exact)

    def _field_query_behaviour(self, val, exact):
        return self._foreign_name_query("behaviour", val, exact)

    def _field_query_stored_in(self, val, exact):
        return self._foreign_name_query("stored_in", val, exact)

    def _field_query_treatment(self, val, exact):
        return self._foreign_name_query("treatment", val, exact)

    def _field_query_dna_extraction_protocol(self, val, exact):
        return self._foreign_name_query("dna_extraction_protocol", val, exact)

    def _field_query_search(self, val, exact):
        from ..reports.models import Search
        search = Search.objects.filter(name__iexact=val).first()
        if search:
            if search.resource == "sample":
                return search.get_q()
            elif search.resource == "event":
                return Q(transactions__samplecollection__event__in=search.get_qs())
            elif search.resource == "person":
                return Q(transactions__samplecollection__event__person__in=search.get_qs())
        return empty_q

    def _get_related_cls(self, related):
        if related == "owner":
            return PersonQueryExpr, "transactions__samplecollection__event__person"
        elif related == "event":
            return EventQueryExpr, "transactions__samplecollection__event"
        raise Exception("unrelated")


class EventQueryExpr(BaseQueryExpr):

    @staticmethod
    def get_model():
        from ..events.models import Event
        return Event

    def _any_name_query(self, val, exact):
        prefix = "person__"
        names = [prefix + name for name in PersonQueryExpr.name_fields]
        return self._string_query(val, exact, *names)

    def _id_matcher(self, val):
        return self._record_id_match(val)

    def _id_query(self, match, exact):
        if match.group("entity") == "P":
            return self._query_related_field("patient", ["id"], match.group("id"), exact)
        elif match.group("entity") == "B":
            return self._query_related_field("sample", ["id"], match.group("id"), exact)
        else:
            return self._field_query_id(match.group("id"), exact)

    def _field_query_id(self, val, exact):
        return self._record_id_query(val, exact, "ident")

    def _field_query_study(self, val, exact):
        return Q(study__slug__iexact=val)

    def _study_filter(self, study_id):
        return Q(study_id=study_id)

    def _field_query_date(self, val, exact):
        return _datetime_range_q(val, "date")

    def _field_query_type(self, val, exact):
        # fixme: bad hack for super types
        if val:
            return (self._foreign_name_query("type", val, exact) |
                    self._foreign_name_query("type__super_type", val, exact))
        return empty_q

    def find_custom_fields(self, name):
        from ..events.models import EventType
        ets = EventType.objects.raw("SELECT id, fields->'properties'->%s as field FROM events_eventtype", [name])
        return [x.field for x in ets if x.field] or [{"type": "string"}]

    def query_field_fallback(self, name, val, exact):
        fields = self.find_custom_fields(name)
        return self._custom_data_query(name, fields, val, exact)

    def _get_related_cls(self, related):
        if related == "patient":
            return PersonQueryExpr, "person"
        elif related == "sample":
            return SampleQueryExpr, "samplecollection__sample"
        raise Exception("unrelated")

    def _field_query_search(self, val, exact):
        from ..reports.models import Search
        search = Search.objects.filter(name__iexact=val).first()
        if search:
            if search.resource == "event":
                return search.get_q()
            elif search.resource == "person":
                return Q(person__in=search.get_qs())
            elif search.resource == "sample":
                return Q(samplecollection__sample__in=search.get_qs())
        return empty_q


class UserQueryExpr(BaseQueryExpr):

    @staticmethod
    def get_model():
        from ..users.models import User
        return User

    def _any_name_query(self, q, exact):
        return self._string_query(q, exact, "email", "last_name", "first_name")

    def _field_query_email(self, val, exact):
        return self._string_query(val, exact, "email")

    def _field_query_active(self, val, exact):
        return Q(is_active=self._convert_bool(val))

    def _field_query_superuser(self, val, exact):
        return Q(is_superuser=self._convert_bool(val))

    def _field_query_role(self, val, exact):
        # fixme: exact role would be nice
        return self._foreign_name_query("groups", val, exact)

    def _field_query_id(self, val, exact):
        return self._field_query_pk(val, exact)

    def _id_matcher(self, val):
        return _is_numeric(val)

    def _id_query(self, val, exact):
        return self._field_query_id(val, exact)


def person_query_expr(expr, study_id):
    return PersonQueryExpr(expr, study_id).q


def sample_query_expr(expr, study_id=None):
    return SampleQueryExpr(expr, study_id).q


def event_query_expr(expr, study_id=None):
    return EventQueryExpr(expr, study_id).q


def user_query_expr(expr):
    return UserQueryExpr(expr).q
