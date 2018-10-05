import io
import csv

from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from reversion import revisions

from ..users.models import User


@revisions.register
class FileAttachment(models.Model):
    """
    A general-purpose uploaded file which can be attached to any model
    object.
    """
    content_type = models.ForeignKey(ContentType)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    file = models.FileField()
    name = models.CharField(max_length=255)
    desc = models.TextField(max_length=1000, blank=True)
    mime_type = models.CharField(max_length=255,
                                 help_text="Content-type header provided by user's browser")

    creator = models.ForeignKey(User)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @models.permalink
    def get_absolute_url(self):
        return ("file-download", (), {
            "id": str(self.id),
            "content_type": str(self.content_type),
            "object_id": str(self.object_id),
            "filename": self.name})


class CsvTemp(models.Model):
    """
    Temporary storage of CSV files before import. Data is stored in a
    text blob.

    The CSV text processing is not particularly memory efficient, but
    it shouldn't matter too much

    These objects can be cleaned up when the corresponding session
    expires.
    """
    session_key = models.CharField(max_length=40, db_index=True)
    filename = models.CharField(max_length=255)
    header = models.TextField(max_length=1000)
    data = models.TextField()

    size = models.PositiveIntegerField()
    num_rows = models.PositiveIntegerField(default=0)
    num_cols = models.PositiveIntegerField(default=0)

    creator = models.ForeignKey(User)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename

    def save(self, *args, **kwargs):
        if not self.num_cols:
            self.num_cols = len(self.get_headers())
        if not self.num_rows:
            self.num_rows = len(self.data.splitlines())
        return super().save(*args, **kwargs)

    def _reader(self, data):
        return csv.reader(io.StringIO(data))

    def get_headers(self):
        "Returns a list of headers from the first line of the CSV"
        if not hasattr(self, "_headers"):
            reader = self._reader(self.header)
            self._headers = next(reader)
        return self._headers

    def get_headers_index(self):
        "Returns a dict mapping header name to column index"
        if not hasattr(self, "_headers_index"):
            self._headers_index = {header: i for (i, header)
                                   in enumerate(self.get_headers())}
        return self._headers_index

    def get_csv_reader(self):
        return self._reader(self.data)

    def get_value(self, row, header):
        "Returns the cell value in this row for a column name"
        index = self.get_headers_index()
        return row[index[header]]
