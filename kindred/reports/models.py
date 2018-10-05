from itertools import groupby, chain
from operator import attrgetter

from django.db import models
from kindred.jsonb import JSONField
from reversion import revisions

from ..app.models import BaseModel
from ..users.models import User
from ..project.models import Study
from ..people import models as people
from ..events import models as events
from ..biobank import models as biobank
from ..query import person_query_expr, event_query_expr, sample_query_expr, user_query_expr


class ReportSearch(BaseModel):
    """
    A search is a saved query expression.
    """
    RESOURCE_CHOICES = (
        ("person", "Person"),
        ("event", "Event"),
        ("sample", "Sample"),
        ("user", "User"),
    )

    study = models.ForeignKey(Study, null=True, blank=True)
    resource = models.CharField(max_length=30, choices=RESOURCE_CHOICES)
    name = models.CharField(max_length=200)
    desc = models.TextField(blank=True)
    owner = models.ForeignKey(User, related_name="+")

    query = JSONField(help_text="Query expression parsed from the Turtleweb query syntax",
                      null=True, blank=True)

    order_by = models.CharField(max_length=200, blank=True,
                                help_text="Whitespace separated list of fields")
    list_columns = models.CharField(max_length=200, blank=True,
                                    help_text="Whitespace separated list of fields")

    class Meta(BaseModel.Meta):
        abstract = True

    def __str__(self):
        return self.name

    def get_q(self):
        study_id = None if self.study is None else self.study.id
        if self.resource == "person":
            return person_query_expr(self.query, study_id)
        elif self.resource == "event":
            return event_query_expr(self.query, study_id)
        elif self.resource == "sample":
            return sample_query_expr(self.query, study_id)
        elif self.resource == "user":
            return user_query_expr(self.query)
        else:
            return models.Q(id__in=[])

    @property
    def model_cls(self):
        mapping = {
            "person": people.Person,
            "event": events.Event,
            "sample": biobank.Sample,
            "user": User
        }
        return mapping.get(self.resource, people.Person)

    def get_qs(self):
        q = self.get_q()
        qs = self._order_qs(self.model_cls.objects.filter(q))
        return qs

    def _order_qs(self, qs):
        return qs.order_by(*self.get_order_by())

    def get_order_by(self):
        return self._order_by_fields(self.order_by)

    def _order_by_fields(self, order_by):
        m = {
            "id": ["id"],
            "surname": ["last_name"],
            "given": ["first_name", "second_name"],
            "sex": ["sex"],
            "dob": ["dob"],
            "dob.year": ["dob"],
            "dob.month": ["dob"],
            "address.suburb": ["addresses__contact__suburb"],
            "address.state": ["addresses__contact__suburb__state"],
            # fixme: study and project lookup is pretty naff
            "study": ["studies"],
            "project": ["studies__project"],
        }

        def conv(s):
            return m[s]

        return list(chain(*map(conv, order_by.split())))


@revisions.register
class Search(ReportSearch):
    # not using table inheritance because JSONField bug #101
    pass

    # TODO: enable this
    # session = models.ForeignKey("django.Session", null=True, blank=True,
    #                             on_delete=models.DELETE_CASCADE,
    #                             help_text="Login session which this search "
    #                             "is attached to. If set, the search is "
    #                             "transient and will be deleted with the "
    #                             "session.")


@revisions.register
class Report(ReportSearch):
    """
    A report is a saved database query used for gathering statistics.
    """
    group_by = models.CharField(max_length=200, blank=True,
                                help_text="Whitespace separated list of fields")
    chart = models.CharField(max_length=3, blank=True,
                             choices=(("bar", "Bar"), ("pie", "Pie")))

    def _group_qs(self, qs):
        return qs

    def _grouper(self):
        def get_year(a):
            return lambda p: getattr(p, a).year if getattr(p, a) else None

        def get_year_month(a):
            return lambda p: getattr(p, a).strftime("%Y-%m") if getattr(p, a) else ""

        def get_address(p):
            pa = p.addresses.first()
            return pa.contact if pa else None

        def get_address_suburb(p):
            a = get_address(p)
            # fixme: this will collapse suburbs with same name in different states
            return a.suburb.name if a else None

        def get_address_state(p):
            a = get_address(p)
            return a.suburb.state.abbrev if a and a.suburb else None

        def get_study(p):
            # fixme: this assumes person is only member of one study
            s = p.studies.first()
            return s.name if s else None

        def get_project(p):
            # fixme: to get project requires that person is member of a study
            s = p.studies.first()
            return s.project.name if s and s.project else None

        m = {
            "sex": [attrgetter("sex")],
            "dob": [attrgetter("dob")],
            "dob.year": [get_year("dob")],
            # "dob.month": [get_year("dob"), get_month("dob")],
            "dob.month": [get_year_month("dob")],
            "dod.year": [get_year("dod")],
            # "dod.month": [get_year("dod"), get_month("dod")],
            "dod.month": [get_year_month("dod")],
            "address.suburb": [get_address_suburb],
            "address.state": [get_address_state],
            "study": [get_study],
            "project": [get_project],
        }

        def conv(s):
            return m[s]

        groups = list(chain(*map(conv, self.group_by.split())))

        def grouper(person):
            return tuple(g(person) for g in groups)
        return grouper

    # fixme: this report is generated using python so will be slow and
    # use too much memory. Need to replace it with a django/sql query.
    def get_groups(self):
        qs = self.get_qs()
        qs = qs.order_by(*self._order_by_fields(self.group_by))
        groups = groupby(qs, self._grouper())
        return [{"group": g, "count": len(list(p))} for (g, p) in groups]


class ReportFrontPage(BaseModel):
    """
    Puts a report result on the front page of the study.
    """
    report = models.OneToOneField(Report)
    order = models.IntegerField(default=0)
