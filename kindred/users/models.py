from django.core.mail import send_mail
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, UserManager
import django.contrib.auth.models as auth
from django.utils import timezone
from django.contrib.auth.forms import PasswordResetForm
from kindred.jsonb import JSONField
from reversion import revisions

from ..app.models import AuditAndPrivacy


class CaseInsensitiveUserManager(UserManager):

    def get_by_natural_key(self, username):
        q = {self.model.USERNAME_FIELD + "__iexact": username}
        return self.get(**q)


class User(AbstractBaseUser, PermissionsMixin, AuditAndPrivacy, models.Model):
    email = models.EmailField(verbose_name='email address', max_length=255,
                              unique=True, db_index=True)
    first_name = models.CharField(max_length=256)
    last_name = models.CharField(max_length=256)
    is_staff = models.BooleanField(
        'staff status', default=False,
        help_text='Designates whether the user can log into this admin site.')
    is_active = models.BooleanField(
        'active', default=True,
        help_text='Designates whether this user should be treated as '
                  'active. Unselect this instead of deleting accounts.')
    date_joined = models.DateTimeField('date joined', default=timezone.now)
    password_change_date = models.DateTimeField(
        auto_now_add=True,
        null=True,
    )

    mobile_phone_number = models.CharField(max_length=100)
    tokenless_login_allowed = models.BooleanField(default=False,
                                                  help_text='Allows the user to log in without a 2-factor token')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CaseInsensitiveUserManager()

    class Meta(AbstractBaseUser.Meta):
        pass

    def clean(self):
        # We want e-mail addresses to be unique modulo case.
        # Simplest way of achieving this is to convert e-mails to
        # lower case.
        self.email = self.email.lower()

    def __str__(self):
        return self.email

    def get_full_name(self):
        """
        Returns the first_name plus the last_name, with a space in between.
        """
        full_name = '%s %s' % (self.first_name, self.last_name)
        return full_name.strip()

    def get_short_name(self):
        "Returns the short name for the user."
        return self.first_name

    def email_user(self, subject, message, from_email=None):
        """
        Sends an email to this User.
        """
        send_mail(subject, message, from_email, [self.email])

    SPECIAL_GROUPS = [
        "Administrator",
        "User Manager",
        "Data Analyst",
        "Curator",
        "User",
    ]
    DJANGO_ADMIN_GROUPS = SPECIAL_GROUPS[:3]

    LVL_ADMIN = 0
    LVL_MANAGER = 1
    LVL_ANALYST = 2
    LVL_CURATOR = 3
    LVL_USER = 4

    LEVEL_CHOICES = tuple(enumerate(SPECIAL_GROUPS))

    @property
    def group_names(self):
        return set(self.groups.values_list("name", flat=True))

    @property
    def is_staff(self):
        "This property determines whether django admin is available"
        groups = self.group_names
        return len(groups.intersection(self.DJANGO_ADMIN_GROUPS)) > 0

    @property
    def level(self):
        if self.is_active:
            if self.is_superuser:
                return 0
            else:
                return self._groups_to_level(self.group_names)
        else:
            return None

    @classmethod
    def _groups_to_level(cls, groups):
        mapping = dict((n, l) for (l, n) in cls.LEVEL_CHOICES)
        if len(groups) > 0:
            return min(mapping.get(l, len(mapping)) for l in groups)
        else:
            return cls.LEVEL_CHOICES[-1][0]

    @level.setter
    def level(self, level):
        if self.is_active and isinstance(level, int):
            self.is_superuser = level == 0
            self.save()
            remove = self.SPECIAL_GROUPS[:level]
            add = self.SPECIAL_GROUPS[level:]
            self.groups.remove(*list(self.groups.filter(name__in=remove)))
            self.groups.add(*list(auth.Group.objects.filter(name__in=add)))
        else:
            self.groups.clear()
            self.is_superuser = False
            self.is_active = False
            self.save()

    def disable_password(self):
        """
        Makes it impossible for the user to login by setting their
        password to a random string.
        """
        # password reset system needs a usable password
        unknown = type(self).objects.make_random_password(length=20)
        self.set_password(unknown)
        self.save()

    def password_reset(self):
        """
        Sends a password reset link through e-mail to this user.
        """
        form = PasswordResetForm({"email": self.email})
        form.is_valid()
        form.save()

revisions.register(User, exclude=["last_login", "password_change_date"])


class UserPrefs(models.Model):
    """
    Simple profile which frontend can store settings in.
    """
    user = models.OneToOneField(User, related_name="prefs")
    prefs = JSONField(default={})

    class Meta:
        verbose_name_plural = "user prefs"
