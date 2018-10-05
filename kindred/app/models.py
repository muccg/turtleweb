import json
import logging
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.conf import settings
from django.core.exceptions import PermissionDenied
from kindred.jsonb import JSONField

__all__ = ["Instance", "BaseModel", "AuditAndPrivacy",
           "AbstractNameList", "AbstractNameDescList",
           "MigrationRun", "IDMap"]

logger = logging.getLogger(__name__)


class Instance(models.Model):
    """
    Application info -- switched by APP_INSTANCE setting.
    This is kind of like the Registry model in RDRF.
    """
    code = models.SlugField(primary_key=True)
    title = models.CharField(max_length=80)

    DEFAULT_INSTANCE = "kindred"

    @classmethod
    def get_current(cls):
        instance_code = getattr(settings, "APP_INSTANCE", None) or cls.DEFAULT_INSTANCE
        return cls.objects.get(code=instance_code)

    @classmethod
    def get_current_dict(cls):
        instance = cls.get_current()
        return {"code": instance.code, "title": instance.title}

    def __str__(self):
        return self.title


class BaseModel(models.Model):
    """
    This model base class is the same as django.db.models.Model,
    except that it allows a limited way of specifying the __str__
    value.

    If a class has _str_format and _str_args attributes, they will be
    used with string.format() to generate the string representaion of
    the object.

    The other handy thing is that _str_format and _str_args are passed
    through the API to the javascript client of its use as well.
    """

    class Meta:
        abstract = True

    _str_format = "{0} object"
    _str_args = ("_meta_object_name",)

    def __str__(self):
        fmt = getattr(type(self), "_str_format", None)
        args = getattr(type(self), "_str_args", [])
        if fmt:
            vals = [getattr(self._meta, arg.lstrip("_meta"))
                    if arg[:5] == "_meta" else getattr(self, arg)
                    for arg in args]
            return fmt.format(*vals)
        else:
            return super(BaseModel, self).__str__()


class AccessLog(models.Model):
    """
    Simple recording of user CRUD operations
    """
    ACTION_CHOICES = (
        ("C", "Create"),
        ("R", "Read"),
        ("U", "Update"),
        ("D", "Delete"),
    )
    action = models.CharField(max_length=1, choices=ACTION_CHOICES)
    modified_by = models.ForeignKey("users.User", related_name="+",
                                    db_constraint=False,
                                    on_delete=models.DO_NOTHING)
    modified_on = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField("IP Address")

    content_type = models.ForeignKey(ContentType)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    resource_repr = models.TextField()

    @classmethod
    def log(cls, action, modified_by, ip_address, obj):
        content_type = ContentType.objects.get_for_model(obj)

        if modified_by.is_anonymous():
            logger.error("Attempt to log anonymous {} access to {} #{} from {}.".format(
                action, content_type.name, obj.pk, ip_address))
            raise PermissionDenied()

        self = cls(action=action,
                   modified_by=modified_by,
                   ip_address=ip_address,
                   content_type=content_type,
                   object_id=obj.pk,
                   resource_repr=str(obj))
        self.save()
        return self

    @property
    def action_taken(self):
        return dict(self.ACTION_CHOICES).get(self.action)

    @property
    def resource_name(self):
        return self.content_type.name

    def __str__(self):
        return "{}: {} ({}) {} {}: {} ({})".format(
            self.modified_on, self.modified_by.get_full_name(),
            self.modified_by.id,
            self.action_taken,
            self.content_type.name, self.object_id,
            self.resource_repr)


def default_user():
    from ..users.models import User
    return User.objects.order_by("id").values_list("id", flat=True).first()


class AuditAndPrivacy(models.Model):
    """
    Here are some fields which could be mixed in to provide an audit
    trail and hiding of data.
    """

    # audit fields
    modified_by = models.ForeignKey("users.User", related_name="+", default=default_user)
    modified_on = models.DateTimeField(auto_now=True)

    # more stuff, seems like a good idea
    created_by = models.ForeignKey("users.User", related_name="+", default=default_user)
    created_on = models.DateTimeField(auto_now_add=True)

    # privacy fields
    private = models.BooleanField(default=True)  # fixme: not sure what this means

    class Meta:
        abstract = True


class AbstractNameList(BaseModel):
    """
    This is a base model providing fields for lists of possible
    values.
    """
    name = models.CharField(max_length=256)
    order = models.PositiveSmallIntegerField(unique=False, default=0)
    default = models.BooleanField(default=False)

    class Meta:
        abstract = True
        unique_together = [("name",)]
        ordering = ["order", "name"]

    def __repr__(self):
        return "<%s: %s>" % (self.__class__.__name__, self.name)

    _str_format = "{0}"
    _str_args = ("name",)

    @classmethod
    def find_default(cls):
        return cls.objects.order_by("-default", "order").first()


class AbstractNameDescList(AbstractNameList):
    """
    Base model like AbstractNameList, also contains a description field.
    """
    desc = models.TextField(blank=True)

    class Meta(AbstractNameList.Meta):
        abstract = True


class CustomDropDownList(AbstractNameDescList):
    """
    This name list is for user-defined drop-down lists.
    """
    pass


class CustomDropDownValue(AbstractNameDescList):
    """
    This name list is for all the values of user-defined drop-down list.
    """
    list = models.ForeignKey(CustomDropDownList, on_delete=models.CASCADE,
                             related_name="items")

    class Meta(AbstractNameDescList.Meta):
        unique_together = [("list", "name")]
        ordering = ["list", "order", "name"]


class MigrationRun(models.Model):
    """
    This model stores the logs from the kintrak migration.
    """
    start_time = models.DateTimeField(auto_now_add=True)
    finish_time = models.DateTimeField(blank=True, null=True)
    report = JSONField(default={})


class IDMap(models.Model):
    """
    The ID map stores the result of the database migration.
    """
    migration = models.ForeignKey(MigrationRun, related_name="idmap")
    from_table = models.CharField(max_length=100, db_index=True)
    to_table = models.CharField(max_length=100, db_index=True)
    oldid = models.CharField(max_length=100, db_index=True)
    newid = models.CharField(max_length=100)

    class Meta:
        unique_together = ("from_table", "to_table", "oldid")
        verbose_name_plural = "id map"

    def __str__(self):
        return "(%s, %s) -> %s" % (self.model.model_class().__name__, self.oldid, self.newid)

    @property
    def model(self):
        app, model = self.to_table.split("_", 1)
        return ContentType.objects.get(app_label=app, model=model)

    @property
    def newpk(self):
        return json.loads(self.newid)

    @property
    def ob(self):
        id = self.newpk[0]
        return self.model.model_class().objects.get(id=id)
